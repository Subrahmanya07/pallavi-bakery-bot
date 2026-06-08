import re

from google.adk.tools import ToolContext

from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.models.menu import MenuItemCreate
from app.models.order import OrderStatus

_menu_repo = MenuRepository()
_order_repo = OrderRepository()

VALID_STATUSES = {s.value for s in OrderStatus}

NOTIFICATION_TEMPLATES = {
    OrderStatus.CONFIRMED: "Great news! Your order {order_number} has been confirmed. We'll start preparing it shortly! 👨‍🍳",
    OrderStatus.PREPARING: "Your order {order_number} is now being freshly prepared! 🍞",
    OrderStatus.READY: "Your order {order_number} is ready for pickup! 🎉",
    OrderStatus.PICKED_UP: "Thanks for picking up order {order_number} — enjoy! 😊",
    OrderStatus.CANCELLED: "Your order {order_number} has been cancelled.",
}


def _get_admin_id(tool_context: ToolContext) -> int | None:
    """Read the server-set admin telegram_id from session state — never from LLM parameters."""
    aid = tool_context.state.get("admin_telegram_id")
    return int(aid) if aid else None


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


async def notify_order_status_change(order: dict, new_status: str) -> bool:
    """Send a Telegram notification to the customer about an order status change."""
    template = NOTIFICATION_TEMPLATES.get(new_status)
    if not template:
        return True
    from app.bot.setup import get_application

    try:
        await get_application().bot.send_message(
            chat_id=order["telegram_user_id"],
            text=template.format(order_number=order["order_number"]),
        )
        return True
    except Exception:
        return False


async def get_all_pending_orders(tool_context: ToolContext = None) -> str:
    orders = await _order_repo.get_pending_orders()
    if not orders:
        return "No pending or confirmed orders right now. 🎉"

    lines = ["📋 PENDING / CONFIRMED ORDERS\n"]
    for o in orders:
        summary = ", ".join(f"{i['name']} ×{i['quantity']}" for i in o["items"])
        lines.append(
            f"• {o['order_number']}  ·  {o['customer_name']}  ·  {o['status']}\n"
            f"  {summary}  ·  ₹{o['total_amount']:.0f}"
        )
    return "\n".join(lines)


async def update_order_status(
    order_number: str,
    new_status: str,
    tool_context: ToolContext = None,
) -> str:
    admin_id = _get_admin_id(tool_context)
    if not admin_id:
        return "ERROR: Not authorized."

    status = new_status.strip().upper()
    if status not in VALID_STATUSES:
        return f"ERROR: '{new_status}' is not a valid status. Use one of: {', '.join(sorted(VALID_STATUSES))}."

    order_number = order_number.strip().upper()
    order = await _order_repo.get_by_number(order_number)
    if not order:
        return f"ERROR: Order {order_number} not found."

    updated = await _order_repo.update_status(order_number, status, changed_by=f"admin:{admin_id}")
    if not updated:
        return f"ERROR: Could not update order {order_number}."

    notified = await notify_order_status_change(order, status)
    note = "and the customer has been notified" if notified else "but I couldn't notify the customer"
    return f"✅ Order {order_number} marked as {status} {note}."


async def add_menu_item(
    name: str,
    category: str,
    price: float,
    description: str,
    customizations: str = "",
    tool_context: ToolContext = None,
) -> str:
    admin_id = _get_admin_id(tool_context)
    if not admin_id:
        return "ERROR: Not authorized."

    slug = _slugify(name)
    if await _menu_repo.get_item_by_slug(slug):
        return f"ERROR: A menu item with slug '{slug}' already exists."

    try:
        item = MenuItemCreate(
            name=name.strip(),
            slug=slug,
            category=category.strip().lower(),
            description=description.strip(),
            price=float(price),
            customizations=[c.strip() for c in customizations.split(",") if c.strip()],
        )
    except ValueError as e:
        return f"ERROR: {e}"

    await _menu_repo.create_item(item)
    return f"✅ Added '{item.name}' to {item.category} at ₹{item.price:.0f} (slug: {item.slug})."


async def update_menu_item(
    item_slug: str,
    name: str = "",
    price: float = 0.0,
    description: str = "",
    customizations: str = "",
    tool_context: ToolContext = None,
) -> str:
    admin_id = _get_admin_id(tool_context)
    if not admin_id:
        return "ERROR: Not authorized."

    slug = item_slug.strip().lower()
    item = await _menu_repo.get_item_by_slug(slug)
    if not item:
        return f"ERROR: No menu item with slug '{slug}'."

    updates = {}
    if name.strip():
        updates["name"] = name.strip()
    if price:
        updates["price"] = float(price)
    if description.strip():
        updates["description"] = description.strip()
    if customizations.strip():
        updates["customizations"] = [c.strip() for c in customizations.split(",") if c.strip()]

    if not updates:
        return "Nothing to update — tell me which field to change."

    await _menu_repo.update_item(item["_id"], updates)
    return f"✅ Updated {item['name']} — changed: {', '.join(updates)}."


async def toggle_item_availability(
    item_slug: str,
    tool_context: ToolContext = None,
) -> str:
    admin_id = _get_admin_id(tool_context)
    if not admin_id:
        return "ERROR: Not authorized."

    slug = item_slug.strip().lower()
    new_state = await _menu_repo.toggle_availability(slug)
    if new_state is None:
        return f"ERROR: No menu item with slug '{slug}'."

    return f"✅ '{slug}' is now {'available ✅' if new_state else 'unavailable 🚫'}."


async def send_customer_notification(
    telegram_id: int,
    message: str,
    tool_context: ToolContext = None,
) -> str:
    admin_id = _get_admin_id(tool_context)
    if not admin_id:
        return "ERROR: Not authorized."

    from app.bot.setup import get_application

    try:
        await get_application().bot.send_message(chat_id=int(telegram_id), text=message.strip())
    except Exception:
        return f"ERROR: Could not send a message to {telegram_id}."

    return f"✅ Message sent to customer {telegram_id}."
