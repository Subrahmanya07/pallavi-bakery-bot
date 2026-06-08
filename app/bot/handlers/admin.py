from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.errors import ServerError
from google.genai.types import Content, Part
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from app.agents.admin_agent import admin_agent
from app.config import get_settings
from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.models.order import OrderStatus
from app.tools.admin_tools import notify_order_status_change

APP_NAME = "bakery_bot_admin"

_session_service = InMemorySessionService()
_runner = Runner(agent=admin_agent, app_name=APP_NAME, session_service=_session_service)
_menu_repo = MenuRepository()
_order_repo = OrderRepository()

ADMIN_HELP = (
    "🛠 <b>Admin Commands</b>\n\n"
    "/orders — active pending/confirmed orders\n"
    "/order &lt;number&gt; — full order detail\n"
    "/confirm &lt;number&gt; — mark CONFIRMED\n"
    "/ready &lt;number&gt; — mark READY\n"
    "/cancel &lt;number&gt; — cancel order\n"
    "/items — list menu items + availability\n"
    "/toggle &lt;slug&gt; — toggle item availability\n\n"
    "Or just ask me naturally — \"what orders are pending?\", \"mark ORD-... as ready\", "
    "\"add a new item called Almond Tart, pastries, ₹150\"."
)


def _is_admin(telegram_id: int) -> bool:
    return telegram_id in get_settings().get_admin_ids()


async def _ensure_admin_session(telegram_id: int) -> None:
    tid_str = str(telegram_id)
    session = await _session_service.get_session(app_name=APP_NAME, user_id=tid_str, session_id=tid_str)
    if session is None:
        await _session_service.create_session(
            app_name=APP_NAME,
            user_id=tid_str,
            session_id=tid_str,
            state={"admin_telegram_id": telegram_id},
        )


# ── Command handlers ───────────────────────────────────────────────────────────

async def handle_admin_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update.effective_user.id):
        return
    await update.message.reply_text(ADMIN_HELP, parse_mode=ParseMode.HTML)


async def handle_admin_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update.effective_user.id):
        return

    orders = await _order_repo.get_pending_orders()
    if not orders:
        await update.message.reply_text("No pending or confirmed orders right now. 🎉")
        return

    lines = ["📋 <b>ACTIVE ORDERS</b>\n"]
    for o in orders:
        summary = ", ".join(f"{i['name']} ×{i['quantity']}" for i in o["items"])
        lines.append(
            f"• <b>{o['order_number']}</b>  ·  {o['customer_name']}  ·  <b>{o['status']}</b>\n"
            f"  {summary}  ·  ₹{o['total_amount']:.0f}"
        )
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)


async def handle_admin_order_detail(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update.effective_user.id):
        return
    if not context.args:
        await update.message.reply_text("Usage: /order &lt;order_number&gt;", parse_mode=ParseMode.HTML)
        return

    order_number = context.args[0].strip().upper()
    order = await _order_repo.get_by_number(order_number)
    if not order:
        await update.message.reply_text(f"Order {order_number} not found.")
        return

    lines = [
        f"<b>Order {order['order_number']}</b>",
        f"Customer: {order['customer_name']}  (id {order['telegram_user_id']})",
        f"Status: <b>{order['status']}</b>",
        f"Placed: {order['created_at']:%Y-%m-%d %H:%M}",
        "",
        "Items:",
    ]
    for item in order["items"]:
        custom = f" ({item['customization']})" if item.get("customization") else ""
        lines.append(f"• {item['name']}{custom} × {item['quantity']} — ₹{item['quantity'] * item['unit_price']:.0f}")
    lines.append("")
    lines.append(f"Total: ₹{order['total_amount']:.0f}")
    if order.get("pickup_time"):
        lines.append(f"Pickup time: {order['pickup_time']}")
    if order.get("notes"):
        lines.append(f"Notes: {order['notes']}")

    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)


async def _change_order_status(
    update: Update, context: ContextTypes.DEFAULT_TYPE, new_status: OrderStatus, command: str
) -> None:
    if not _is_admin(update.effective_user.id):
        return
    if not context.args:
        await update.message.reply_text(f"Usage: /{command} &lt;order_number&gt;", parse_mode=ParseMode.HTML)
        return

    order_number = context.args[0].strip().upper()
    order = await _order_repo.get_by_number(order_number)
    if not order:
        await update.message.reply_text(f"Order {order_number} not found.")
        return

    admin_id = update.effective_user.id
    updated = await _order_repo.update_status(order_number, new_status, changed_by=f"admin:{admin_id}")
    if not updated:
        await update.message.reply_text(f"Could not update order {order_number}.")
        return

    notified = await notify_order_status_change(order, new_status)
    note = "and the customer has been notified" if notified else "but I couldn't notify the customer"
    await update.message.reply_text(f"✅ Order {order_number} marked as {new_status} {note}.")


async def handle_admin_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _change_order_status(update, context, OrderStatus.CONFIRMED, "confirm")


async def handle_admin_ready(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _change_order_status(update, context, OrderStatus.READY, "ready")


async def handle_admin_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _change_order_status(update, context, OrderStatus.CANCELLED, "cancel")


async def handle_admin_items(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update.effective_user.id):
        return

    items = await _menu_repo.get_all_items()
    if not items:
        await update.message.reply_text("No menu items found.")
        return

    lines = ["📋 <b>MENU ITEMS</b>\n"]
    for item in items:
        flag = "✅" if item["is_available"] else "🚫"
        lines.append(
            f"{flag} <b>{item['name']}</b>  ·  {item['category']}  ·  ₹{item['price']:.0f}  ·  "
            f"<code>{item['slug']}</code>"
        )
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)


async def handle_admin_toggle(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_admin(update.effective_user.id):
        return
    if not context.args:
        await update.message.reply_text("Usage: /toggle &lt;item_slug&gt;", parse_mode=ParseMode.HTML)
        return

    slug = context.args[0].strip().lower()
    new_state = await _menu_repo.toggle_availability(slug)
    if new_state is None:
        await update.message.reply_text(f"No menu item with slug '{slug}'.")
        return

    await update.message.reply_text(f"'{slug}' is now {'available ✅' if new_state else 'unavailable 🚫'}.")


# ── Free-text admin chat (ADK) ─────────────────────────────────────────────────

async def handle_admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    telegram_id = update.effective_user.id
    if not _is_admin(telegram_id):
        return

    telegram_id_str = str(telegram_id)
    await _ensure_admin_session(telegram_id)

    message = Content(role="user", parts=[Part(text=update.message.text.strip())])

    try:
        response_text = ""
        async for event in _runner.run_async(
            user_id=telegram_id_str,
            session_id=telegram_id_str,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text

        await update.message.reply_text(response_text or "Hmm, no response. Please try again!")

    except ServerError as e:
        msg = (
            "The AI is temporarily busy. Try again in a few seconds!"
            if e.code == 503
            else "Something went wrong. Please try again."
        )
        await update.message.reply_text(msg)
    except Exception:
        await update.message.reply_text("Something went wrong. Please try again.")
