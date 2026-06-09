from google.adk.tools import ToolContext

from app.config import get_settings
from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.database.repositories.session_repo import SessionRepository
from app.database.repositories.user_repo import UserRepository
from app.models.order import CartItem, OrderCreate
from app.services.payment_service import create_razorpay_order

_menu_repo = MenuRepository()
_order_repo = OrderRepository()
_session_repo = SessionRepository()
_user_repo = UserRepository()


def _get_telegram_id(tool_context: ToolContext) -> int | None:
    """Read the server-set telegram_id from session state — never from LLM parameters."""
    tid = tool_context.state.get("telegram_id")
    return int(tid) if tid else None


async def view_cart(tool_context: ToolContext) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    cart = await _session_repo.get_cart(telegram_id)
    if not cart:
        return "Your cart is empty. Browse the menu and add items!"

    lines = ["🛒 YOUR CART\n"]
    total = 0.0
    for item in cart:
        subtotal = item["quantity"] * item["unit_price"]
        total += subtotal
        custom = f" ({item['customization']})" if item.get("customization") else ""
        lines.append(f"• {item['name']}{custom} × {item['quantity']}  —  ₹{subtotal:.0f}")

    lines.append(f"\n💰 Total: ₹{total:.0f}")
    return "\n".join(lines)


async def add_item_to_cart(
    item_name: str,
    quantity: int = 1,
    customization: str = "",
    tool_context: ToolContext = None,
) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    item = await _menu_repo.get_item_by_name(item_name)
    if not item:
        return f"Sorry, I couldn't find '{item_name}' on our menu. Check the spelling or browse the menu first."
    if not item.get("is_available", True):
        return f"Sorry, {item['name']} is not available today."

    cart_item = {
        "menu_item_id": item["_id"],
        "name": item["name"],
        "quantity": max(1, int(quantity)),
        "unit_price": item["price"],
        "customization": customization.strip() or None,
    }
    cart = await _session_repo.add_to_cart(telegram_id, cart_item)

    total = sum(i["quantity"] * i["unit_price"] for i in cart)
    item_count = sum(i["quantity"] for i in cart)
    return (
        f"✅ Added {item['name']} × {quantity} to your cart!\n"
        f"Cart: {item_count} item(s)  ·  Total ₹{total:.0f}\n\n"
        f"Say 'show my cart' to review, or keep adding items!"
    )


async def remove_item_from_cart(
    item_name: str,
    tool_context: ToolContext = None,
) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    cart = await _session_repo.remove_from_cart(telegram_id, item_name)
    if not cart:
        return "Your cart is now empty."
    total = sum(i["quantity"] * i["unit_price"] for i in cart)
    return f"Removed {item_name} from your cart.\n💰 New total: ₹{total:.0f}"


async def clear_cart(tool_context: ToolContext) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    await _session_repo.clear_cart(telegram_id)
    return "Your cart has been cleared."


async def place_order_for_user(
    telegram_id: int,
    pickup_time: str = "",
    notes: str = "",
) -> str:
    """Core order placement logic — callable from both the ADK tool and button handlers."""
    cart = await _session_repo.get_cart(telegram_id)
    if not cart:
        return "Your cart is empty. Add items before placing an order."

    user = await _user_repo.get_by_telegram_id(telegram_id)
    customer_name = user["first_name"] if user else "Customer"

    cart_items = [CartItem(**i) for i in cart]
    total = sum(i.quantity * i.unit_price for i in cart_items)

    order = await _order_repo.create_order(
        OrderCreate(
            telegram_user_id=telegram_id,
            customer_name=customer_name,
            items=cart_items,
            total_amount=round(total, 2),
            pickup_time=pickup_time.strip() or None,
            notes=notes.strip() or None,
        )
    )

    await _session_repo.clear_cart(telegram_id)
    await _user_repo.increment_order_count(telegram_id)

    # Create Razorpay order and attach to DB order
    payment_url = ""
    try:
        rzp_order_id, payment_token = create_razorpay_order(total, order["order_number"])
        await _order_repo.set_razorpay_order(order["_id"], rzp_order_id, payment_token)
        frontend_url = get_settings().frontend_url.rstrip("/")
        payment_url = f"\n\n💳 <b>Complete your payment:</b>\n<a href=\"{frontend_url}/pay/{payment_token}\">Pay ₹{total:.0f} Now →</a>"
    except Exception:
        payment_url = ""  # Payment link failed — order still placed, pay at counter

    summary = ", ".join(f"{i['name']} ×{i['quantity']}" for i in cart)
    pickup_line = f"\nPickup time: {pickup_time}" if pickup_time else ""

    return (
        f"✅ Order placed!\n\n"
        f"Order #: <b>{order['order_number']}</b>\n"
        f"Items: {summary}\n"
        f"Total: ₹{total:.0f}"
        f"{pickup_line}"
        f"{payment_url}\n\n"
        f"Use your order number to track status anytime."
    )


async def place_order(
    pickup_time: str = "",
    notes: str = "",
    tool_context: ToolContext = None,
) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."
    return await place_order_for_user(telegram_id, pickup_time, notes)


async def cancel_order(
    order_number: str,
    tool_context: ToolContext = None,
) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    success, message = await _order_repo.cancel_order(
        order_number.strip().upper(), telegram_id
    )
    return message


async def reorder_last_order(tool_context: ToolContext = None) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    orders = await _order_repo.get_by_user(telegram_id, limit=1)
    if not orders:
        return "You haven't placed any orders yet — browse the menu to get started!"

    last = orders[0]
    added, unavailable = [], []
    for line in last["items"]:
        item = await _menu_repo.get_item_by_name(line["name"])
        if not item or not item.get("is_available", True):
            unavailable.append(line["name"])
            continue
        cart_item = {
            "menu_item_id": item["_id"],
            "name": item["name"],
            "quantity": line["quantity"],
            "unit_price": item["price"],
            "customization": line.get("customization"),
        }
        await _session_repo.add_to_cart(telegram_id, cart_item)
        added.append(item["name"])

    if not added:
        return "Sorry, none of the items from your last order are available right now."

    cart = await _session_repo.get_cart(telegram_id)
    total = sum(i["quantity"] * i["unit_price"] for i in cart)
    msg = (
        f"✅ Added {', '.join(added)} to your cart from order {last['order_number']}!\n"
        f"Cart total: ₹{total:.0f}."
    )
    if unavailable:
        msg += f"\n⚠️ Not available right now: {', '.join(unavailable)}"
    msg += "\n\nSay 'show my cart' to review or 'place order' to checkout."
    return msg


async def modify_order(
    order_number: str,
    pickup_time: str = "",
    notes: str = "",
    tool_context: ToolContext = None,
) -> str:
    telegram_id = _get_telegram_id(tool_context)
    if not telegram_id:
        return "Session error. Please send /start to restart."

    success, message = await _order_repo.update_order_details(
        order_number.strip().upper(),
        telegram_id,
        pickup_time=(pickup_time.strip() or None) if pickup_time else None,
        notes=(notes.strip() or None) if notes else None,
    )
    return message
