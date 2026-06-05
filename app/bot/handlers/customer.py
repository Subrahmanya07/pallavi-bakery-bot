from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.errors import ServerError
from google.genai.types import Content, Part
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from app.agents.orchestrator import orchestrator
from app.database.repositories.menu_repo import MenuRepository

_session_service = InMemorySessionService()
_runner = Runner(
    agent=orchestrator,
    app_name="bakery_bot",
    session_service=_session_service,
)
_menu_repo = MenuRepository()

APP_NAME = "bakery_bot"

CATEGORY_EMOJIS = {
    "breads": "🍞",
    "cakes": "🎂",
    "pastries": "🥐",
    "cookies": "🍪",
    "drinks": "☕",
}


# ── Keyboards ──────────────────────────────────────────────────────────────────

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
        [
            InlineKeyboardButton("☕ Drinks",   callback_data="menu:drinks"),
        ],
    ])


def _back_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("← Back to Categories", callback_data="menu:categories")],
    ])


# ── Command handlers ───────────────────────────────────────────────────────────

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    name = update.effective_user.first_name
    text = (
        f"Welcome to <b>Bella's Bakery</b>! 🥐\n\n"
        f"Hi <b>{name}</b>! I'm Bella, your bakery assistant.\n\n"
        f"Here's what I can help with:\n"
        f"  🍽️  Browse our fresh menu\n"
        f"  🛒  Place an order\n"
        f"  📦  Track your order status\n\n"
        f"What would you like to do today?"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍽️ Browse Menu", callback_data="menu:categories")],
        [InlineKeyboardButton("💬 Chat with Bella", callback_data="chat:open")],
    ])
    await update.message.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=keyboard)


async def handle_menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "<b>Our Menu</b> 🛍️\n\nSelect a category to see today's freshly baked items:",
        parse_mode=ParseMode.HTML,
        reply_markup=_category_keyboard(),
    )


# ── Callback query handler ─────────────────────────────────────────────────────

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "menu:categories":
        await query.edit_message_text(
            "<b>Our Menu</b> 🛍️\n\nSelect a category to see today's freshly baked items:",
            parse_mode=ParseMode.HTML,
            reply_markup=_category_keyboard(),
        )
        return

    if data.startswith("menu:"):
        category = data.split(":")[1]
        await _show_category(query, category)
        return

    if data == "chat:open":
        await query.edit_message_text(
            "Sure! Ask me anything — about our menu, placing an order, or tracking your order. 😊"
        )


async def _show_category(query, category: str) -> None:
    items = await _menu_repo.get_items_by_category(category)
    emoji = CATEGORY_EMOJIS.get(category, "🍽️")

    if not items:
        text = f"{emoji} No <b>{category.title()}</b> available today. Check back soon!"
        await query.edit_message_text(text, parse_mode=ParseMode.HTML, reply_markup=_back_keyboard())
        return

    lines = [f"{emoji} <b>Our {category.title()}</b>\n"]
    for item in items:
        lines.append(f"<b>{item['name']}</b>  ·  ₹{item['price']:.0f}")
        lines.append(f"<i>{item['description']}</i>")
        if item.get("customizations"):
            opts = " · ".join(item["customizations"])
            lines.append(f"<code>Options: {opts}</code>")
        lines.append("")

    lines.append("💬 Ask me about any item or say <b>add [item] to cart</b> to order!")
    await query.edit_message_text(
        "\n".join(lines).strip(),
        parse_mode=ParseMode.HTML,
        reply_markup=_back_keyboard(),
    )


# ── Free-text message handler (ADK agent) ─────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    telegram_id = str(update.effective_user.id)
    user_text = update.message.text.strip()

    session = await _session_service.get_session(
        app_name=APP_NAME, user_id=telegram_id, session_id=telegram_id
    )
    if session is None:
        await _session_service.create_session(
            app_name=APP_NAME, user_id=telegram_id, session_id=telegram_id
        )

    message = Content(role="user", parts=[Part(text=user_text)])

    try:
        response_text = ""
        async for event in _runner.run_async(
            user_id=telegram_id,
            session_id=telegram_id,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text

        if not response_text:
            await update.message.reply_text("Hmm, I didn't get a response. Please try again!")
            return

        # Attach the category keyboard when the agent lists menu categories
        mentions_categories = any(
            cat in response_text.lower()
            for cat in CATEGORY_EMOJIS
        )
        keyboard = _category_keyboard() if mentions_categories else None
        await update.message.reply_text(
            response_text,
            reply_markup=keyboard,
        )

    except ServerError as e:
        msg = (
            "The AI service is temporarily busy. Please try again in a few seconds!"
            if e.code == 503
            else "Sorry, something went wrong. Please try again in a moment."
        )
        await update.message.reply_text(msg)
    except Exception:
        await update.message.reply_text(
            "Sorry, something went wrong. Please try again in a moment."
        )
