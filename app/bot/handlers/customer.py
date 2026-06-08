from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.errors import ServerError
from google.genai.types import Content, Part
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from app.agents.orchestrator import orchestrator
from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.database.repositories.session_repo import SessionRepository
from app.database.repositories.user_repo import UserRepository

_session_service = InMemorySessionService()
_runner = Runner(agent=orchestrator, app_name="bakery_bot", session_service=_session_service)
_menu_repo = MenuRepository()
_order_repo = OrderRepository()
_session_repo = SessionRepository()
_user_repo = UserRepository()

APP_NAME = "bakery_bot"

CATEGORY_EMOJIS = {
    "breads": "🍞", "cakes": "🎂", "pastries": "🥐",
    "cookies": "🍪", "drinks": "☕",
}
CATEGORY_BULLETS = {
    "breads": "🥖", "cakes": "🎂", "pastries": "🥐",
    "cookies": "🍪", "drinks": "☕",
}


# ── Keyboards ─────────────────────────────────────────────────────────────────

def _category_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🍞 Breads",   callback_data="menu:breads"),
            InlineKeyboardButton("🎂 Cakes",    callback_data="menu:cakes"),
        ],
        [
            InlineKeyboardButton("🥐 Pastries", callback_data="menu:pastries"),
            InlineKeyboardButton("🍪 Cookies",  callback_data="menu:cookies"),
        ],
        [InlineKeyboardButton("☕ Drinks",      callback_data="menu:drinks")],
        [InlineKeyboardButton("🛒 View Cart",   callback_data="cart:view")],
    ])


def _items_keyboard(items: list[dict], category: str) -> InlineKeyboardMarkup:
    rows = []
    pairs = [items[i:i + 2] for i in range(0, len(items), 2)]
    for pair in pairs:
        rows.append([
            InlineKeyboardButton(item["name"], callback_data=f"item:{category}:{item['slug']}")
            for item in pair
        ])
    rows.append([
        InlineKeyboardButton("← Categories", callback_data="menu:categories"),
        InlineKeyboardButton("🛒 Cart",       callback_data="cart:view"),
    ])
    return InlineKeyboardMarkup(rows)


def _item_detail_keyboard(category: str, item: dict) -> InlineKeyboardMarkup:
    rows = []
    customizations = item.get("customizations") or []
    if customizations:
        for i, custom in enumerate(customizations):
            rows.append([
                InlineKeyboardButton(f"➕ Add — {custom.title()}", callback_data=f"add:{category}:{item['slug']}:{i}")
            ])
    else:
        rows.append([
            InlineKeyboardButton(f"➕ Add to Cart — ₹{item['price']:.0f}", callback_data=f"add:{category}:{item['slug']}:_")
        ])
    rows.append([
        InlineKeyboardButton(f"← Back to {category.title()}", callback_data=f"menu:{category}"),
        InlineKeyboardButton("🛒 Cart", callback_data="cart:view"),
    ])
    return InlineKeyboardMarkup(rows)


def _cart_keyboard(has_items: bool) -> InlineKeyboardMarkup:
    if not has_items:
        return InlineKeyboardMarkup([
            [InlineKeyboardButton("🍽️ Browse Menu", callback_data="menu:categories")],
        ])
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Place Order",    callback_data="cart:place")],
        [
            InlineKeyboardButton("🗑️ Clear Cart",  callback_data="cart:clear"),
            InlineKeyboardButton("🍽️ Add More",    callback_data="menu:categories"),
        ],
    ])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _format_cart(cart: list[dict]) -> tuple[str, float]:
    total = sum(i["quantity"] * i["unit_price"] for i in cart)
    lines = ["🛒 <b>YOUR CART</b>\n"]
    for item in cart:
        subtotal = item["quantity"] * item["unit_price"]
        custom = f" <i>({item['customization']})</i>" if item.get("customization") else ""
        lines.append(f"• <b>{item['name']}</b>{custom} × {item['quantity']}  —  ₹{subtotal:.0f}")
    lines += ["", "━━━━━━━━━━━━━━━━━━━━", f"💰 <b>Total: ₹{total:.0f}</b>"]
    return "\n".join(lines), total


async def _ensure_adk_session(telegram_id: int) -> None:
    tid_str = str(telegram_id)
    session = await _session_service.get_session(
        app_name=APP_NAME, user_id=tid_str, session_id=tid_str
    )
    if session is None:
        # telegram_id stored in state as int — tools read from ToolContext.state,
        # never from LLM-supplied parameters, preventing IDOR attacks.
        await _session_service.create_session(
            app_name=APP_NAME,
            user_id=tid_str,
            session_id=tid_str,
            state={"telegram_id": telegram_id},
        )


# ── Command handlers ───────────────────────────────────────────────────────────

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _user_repo.upsert_user(update.effective_user)
    name = update.effective_user.first_name
    text = (
        f"Welcome to <b>Bella's Bakery</b>! 🥐\n\n"
        f"Hi <b>{name}</b>! I'm Bella, your bakery assistant.\n\n"
        f"  🍽️  Browse our fresh menu\n"
        f"  🛒  Place an order\n"
        f"  📦  Track your order status\n\n"
        f"What would you like to do today?"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍽️ Browse Menu", callback_data="menu:categories")],
        [InlineKeyboardButton("🛒 View Cart",   callback_data="cart:view")],
        [InlineKeyboardButton("💬 Chat with Bella", callback_data="chat:open")],
    ])
    await update.message.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=keyboard)


async def handle_menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "<b>Our Menu</b> 🛍️\n\nSelect a category to see today's freshly baked items:",
        parse_mode=ParseMode.HTML,
        reply_markup=_category_keyboard(),
    )


async def handle_cart_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    telegram_id = update.effective_user.id
    cart = await _session_repo.get_cart(telegram_id)
    if not cart:
        text = "🛒 <b>Your cart is empty.</b>\n\nBrowse our menu to add items!"
    else:
        text, _ = _format_cart(cart)
    await update.message.reply_text(
        text, parse_mode=ParseMode.HTML, reply_markup=_cart_keyboard(bool(cart))
    )


async def handle_track_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    telegram_id = update.effective_user.id
    orders = await _order_repo.get_by_user(telegram_id, limit=5)
    if not orders:
        text = (
            "📦 <b>No orders yet.</b>\n\n"
            "Browse our menu and place your first order!"
        )
    else:
        lines = ["📦 <b>YOUR RECENT ORDERS</b>\n"]
        for o in orders:
            summary = ", ".join(f"{i['name']} ×{i['quantity']}" for i in o["items"])
            lines.append(
                f"• <b>{o['order_number']}</b>  ·  {o['created_at']:%Y-%m-%d}\n"
                f"  {summary}\n"
                f"  ₹{o['total_amount']:.0f}  ·  <b>{o['status']}</b>"
            )
        lines.append("\n<i>Ask me \"what's the status of ORD-...\" for full details.</i>")
        text = "\n".join(lines)
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


# ── Callback query handler ─────────────────────────────────────────────────────

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    telegram_id = update.effective_user.id
    data = query.data

    # ── Menu navigation ──
    if data == "menu:categories":
        await query.edit_message_text(
            "<b>Our Menu</b> 🛍️\n\nSelect a category:",
            parse_mode=ParseMode.HTML,
            reply_markup=_category_keyboard(),
        )
        return

    if data.startswith("menu:"):
        await _show_category(query, data.split(":")[1])
        return

    # ── Item detail ──
    if data.startswith("item:"):
        _, category, slug = data.split(":", 2)
        await _show_item_detail(query, category, slug)
        return

    # ── Add a specific variant to cart ──
    if data.startswith("add:"):
        _, category, slug, idx = data.split(":", 3)
        item = await _menu_repo.get_item_by_slug(slug)
        if not item or not item.get("is_available", True):
            await query.answer("Sorry, that item is no longer available!", show_alert=True)
            return

        customizations = item.get("customizations") or []
        customization = customizations[int(idx)] if idx.isdigit() and int(idx) < len(customizations) else None

        cart_item = {
            "menu_item_id": item["_id"],
            "name": item["name"],
            "quantity": 1,
            "unit_price": item["price"],
            "customization": customization,
        }
        cart = await _session_repo.add_to_cart(telegram_id, cart_item)
        total = sum(i["quantity"] * i["unit_price"] for i in cart)
        count = sum(i["quantity"] for i in cart)
        label = f"{item['name']} ({customization})" if customization else item["name"]
        await query.answer(f"✅ Added {label}! Cart: {count} item(s) · ₹{total:.0f}", show_alert=False)
        return

    # ── Cart actions ──
    if data == "cart:view":
        cart = await _session_repo.get_cart(telegram_id)
        if not cart:
            text = "🛒 <b>Your cart is empty.</b>\n\nBrowse our menu to add items!"
        else:
            text, _ = _format_cart(cart)
        await query.edit_message_text(
            text, parse_mode=ParseMode.HTML, reply_markup=_cart_keyboard(bool(cart))
        )
        return

    if data == "cart:clear":
        await _session_repo.clear_cart(telegram_id)
        await query.edit_message_text(
            "🗑️ Cart cleared!\n\nBrowse our menu to start fresh.",
            parse_mode=ParseMode.HTML,
            reply_markup=_cart_keyboard(False),
        )
        return

    if data == "cart:place":
        cart = await _session_repo.get_cart(telegram_id)
        if not cart:
            await query.edit_message_text("Your cart is empty!", reply_markup=_cart_keyboard(False))
            return
        text, total = _format_cart(cart)
        text += "\n\n📝 <i>Reply with your pickup time and any notes.\nE.g. \"3pm\" or \"3:30pm, no nuts please\"</i>"
        await query.edit_message_text(text, parse_mode=ParseMode.HTML)
        return

    if data == "chat:open":
        await query.edit_message_text(
            "Sure! Ask me anything — menu, ordering, or order status. 😊"
        )


async def _show_category(query, category: str) -> None:
    items = await _menu_repo.get_items_by_category(category)
    emoji = CATEGORY_EMOJIS.get(category, "🍽️")
    bullet = CATEGORY_BULLETS.get(category, "•")

    if not items:
        await query.edit_message_text(
            f"{emoji} No <b>{category.title()}</b> available today.",
            parse_mode=ParseMode.HTML,
            reply_markup=_cart_keyboard(False),
        )
        return

    lines = [f"{emoji} <b>── OUR {category.upper()} ──</b>", ""]
    for i, item in enumerate(items):
        lines.append(f"{bullet} <b>{item['name']}</b>")
        lines.append(f"┃  💰 <b>₹{item['price']:.0f}</b>")
        lines.append(f"┃  {item['description']}")
        if item.get("customizations"):
            opts = "  ·  ".join(c.title() for c in item["customizations"])
            lines.append(f"┃  🔧 <i>{opts}</i>")
        if i < len(items) - 1:
            lines.append("┃")
            lines.append("┠─────────────────────")
        lines.append("")

    lines.append("👇 <i>Tap an item below to see details and add it to your cart</i>")
    await query.edit_message_text(
        "\n".join(lines).strip(),
        parse_mode=ParseMode.HTML,
        reply_markup=_items_keyboard(items, category),
    )


async def _show_item_detail(query, category: str, slug: str) -> None:
    item = await _menu_repo.get_item_by_slug(slug)
    if not item or not item.get("is_available", True):
        await query.edit_message_text(
            "Sorry, that item is no longer available.",
            reply_markup=_cart_keyboard(False),
        )
        return

    bullet = CATEGORY_BULLETS.get(category, "•")
    lines = [
        f"{bullet} <b>{item['name']}</b>  —  <b>₹{item['price']:.0f}</b>",
        "",
        item["description"],
        "",
        "👇 <i>Pick an option to add it to your cart</i>"
        if item.get("customizations")
        else "👇 <i>Tap below to add it to your cart</i>",
    ]
    await query.edit_message_text(
        "\n".join(lines),
        parse_mode=ParseMode.HTML,
        reply_markup=_item_detail_keyboard(category, item),
    )


# ── Free-text message handler (ADK) ──────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    telegram_id = update.effective_user.id
    telegram_id_str = str(telegram_id)
    user_text = update.message.text.strip()

    await _user_repo.upsert_user(update.effective_user)
    await _ensure_adk_session(telegram_id)

    message = Content(role="user", parts=[Part(text=user_text)])

    try:
        response_text = ""
        async for event in _runner.run_async(
            user_id=telegram_id_str,
            session_id=telegram_id_str,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text

        if not response_text:
            await update.message.reply_text("Hmm, no response. Please try again!")
            return

        mentions_categories = any(cat in response_text.lower() for cat in CATEGORY_EMOJIS)
        keyboard = _category_keyboard() if mentions_categories else None
        await update.message.reply_text(response_text, reply_markup=keyboard)

    except ServerError as e:
        msg = (
            "The AI is temporarily busy. Try again in a few seconds!"
            if e.code == 503
            else "Something went wrong. Please try again."
        )
        await update.message.reply_text(msg)
    except Exception:
        await update.message.reply_text("Something went wrong. Please try again.")
