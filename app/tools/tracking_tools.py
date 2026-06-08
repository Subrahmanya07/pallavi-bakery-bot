from google.adk.tools import ToolContext

from app.database.repositories.order_repo import OrderRepository

_order_repo = OrderRepository()

STATUS_BLURBS = {
    "PENDING": "We received your order and will confirm it soon.",
    "CONFIRMED": "Your order is confirmed! We'll start preparing it shortly.",
    "PREPARING": "Your order is being freshly prepared right now!",
    "READY": "Your order is ready for pickup!",
    "PICKED_UP": "Order complete. Enjoy!",
    "CANCELLED": "This order was cancelled.",
}


def _get_telegram_id(tool_context: ToolContext) -> int | None:
    """Read the server-set telegram_id from session state — never from LLM parameters."""
    tid = tool_context.state.get("telegram_id")
    return int(tid) if tid else None


def _format_items(items: list[dict]) -> str:
    return ", ".join(f"{i['name']} ×{i['quantity']}" for i in items)


async def get_order_status(order_number: str, tool_context: ToolContext = None) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    order = await _order_repo.get_by_number(order_number.strip().upper())
    if not order or order["telegram_user_id"] != telegram_id:
        return "I couldn't find that order. Please double-check the order number."

    status = order["status"]
    blurb = STATUS_BLURBS.get(status, "")
    return (
        f"Order {order['order_number']}\n"
        f"Status: {status} — {blurb}\n"
        f"Placed: {order['created_at']:%Y-%m-%d %H:%M}\n"
        f"Items: {_format_items(order['items'])}\n"
        f"Total: ₹{order['total_amount']:.0f}"
    )


async def get_order_history(tool_context: ToolContext = None) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    orders = await _order_repo.get_by_user(telegram_id, limit=5)
    if not orders:
        return "You haven't placed any orders yet. Browse the menu to get started!"

    lines = ["📦 YOUR RECENT ORDERS\n"]
    for o in orders:
        lines.append(
            f"• {o['order_number']}  ·  {o['created_at']:%Y-%m-%d}  ·  "
            f"{_format_items(o['items'])}  ·  ₹{o['total_amount']:.0f}  ·  {o['status']}"
        )
    return "\n".join(lines)


async def get_order_detail(order_number: str, tool_context: ToolContext = None) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    order = await _order_repo.get_by_number(order_number.strip().upper())
    if not order or order["telegram_user_id"] != telegram_id:
        return "I couldn't find that order. Please double-check the order number."

    lines = [
        f"Order {order['order_number']}",
        f"Status: {order['status']}",
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

    lines.append("")
    lines.append("Status history:")
    for entry in order["status_history"]:
        lines.append(f"  {entry['changed_at']:%Y-%m-%d %H:%M} — {entry['status']}")

    return "\n".join(lines)
