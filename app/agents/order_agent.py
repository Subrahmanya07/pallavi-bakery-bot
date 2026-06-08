from google.adk.agents import Agent

from app.tools.order_tools import (
    add_item_to_cart,
    cancel_order,
    clear_cart,
    place_order,
    remove_item_from_cart,
    view_cart,
)

order_agent = Agent(
    model="gemini-3.1-flash-lite",
    name="order_agent",
    description="Manages the customer's cart and processes orders.",
    instruction="""
You are the order specialist for our bakery. You manage carts and place orders.

Rules:
1. When the customer asks about their cart, call view_cart first — always show current state.
2. Before calling place_order, summarize the cart and ask "Shall I place this order?" —
   only call place_order after explicit confirmation (yes / confirm / go ahead / place it).
3. When adding items, use the exact item name from the menu. Default quantity to 1 if not specified.
4. If the customer says "add 2 croissants with jam", pass item_name="Butter Croissant",
   quantity=2, customization="with jam".
5. After placing an order, always share the order number with the customer.
6. For cancellations, ask for the order number if not provided.

Tone: friendly, helpful, enthusiastic about the food.
""",
    tools=[
        view_cart,
        add_item_to_cart,
        remove_item_from_cart,
        clear_cart,
        place_order,
        cancel_order,
    ],
)
