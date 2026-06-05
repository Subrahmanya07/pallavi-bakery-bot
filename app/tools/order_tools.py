from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.database.repositories.session_repo import SessionRepository
from app.database.repositories.user_repo import UserRepository
from app.models.order import CartItem, OrderCreate

_menu_repo = MenuRepository()
_order_repo = OrderRepository()
_session_repo = SessionRepository()
_user_repo = UserRepository()


async def view_cart(telegram_id: int) -> str:
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
    telegram_id: int,
    item_name: str,
    quantity: int = 1,
    customization: str = "",
) -> str:
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


async def remove_item_from_cart(telegram_id: int, item_name: str) -> str:
    cart = await _session_repo.remove_from_cart(telegram_id, item_name)
    if not cart:
        return "Your cart is now empty."
    total = sum(i["quantity"] * i["unit_price"] for i in cart)
    return f"Removed {item_name} from your cart.\n💰 New total: ₹{total:.0f}"


async def clear_cart(telegram_id: int) -> str:
    await _session_repo.clear_cart(telegram_id)
    return "Your cart has been cleared."


async def place_order(telegram_id: int, pickup_time: str = "", notes: str = "") -> str:
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

    summary = ", ".join(f"{i['name']} ×{i['quantity']}" for i in cart)
    pickup_line = f"\nPickup time: {pickup_time}" if pickup_time else ""

    return (
        f"✅ Order placed successfully!\n\n"
        f"Order #: {order['order_number']}\n"
        f"Items: {summary}\n"
        f"Total: ₹{total:.0f}"
        f"{pickup_line}\n\n"
        f"We'll confirm your order shortly. "
        f"Use your order number to track status anytime!"
    )


async def cancel_order(telegram_id: int, order_number: str) -> str:
    success, message = await _order_repo.cancel_order(order_number.strip().upper(), telegram_id)
    return message
