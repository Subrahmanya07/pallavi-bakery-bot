from app.database.repositories.menu_repo import MenuRepository

_repo = MenuRepository()


async def get_menu_categories() -> str:
    categories = await _repo.get_all_categories()
    if not categories:
        return "No categories available right now."
    lines = ["Here are our menu categories:\n"] + [f"- {c}" for c in categories]
    return "\n".join(lines)


async def get_items_by_category(category: str) -> str:
    items = await _repo.get_items_by_category(category)
    if not items:
        return f"No items available in '{category}' right now."
    lines = [f"Our {category}:\n"]
    for item in items:
        customizations = ""
        if item.get("customizations"):
            customizations = f"  Options: {', '.join(item['customizations'])}"
        lines.append(f"• {item['name']} — ₹{item['price']:.0f}")
        lines.append(f"  {item['description']}")
        if customizations:
            lines.append(customizations)
        lines.append("")
    return "\n".join(lines).strip()


async def search_menu(query: str) -> str:
    items = await _repo.search_items(query)
    if not items:
        return f"No items found matching '{query}'. Try browsing by category instead."
    lines = [f"Search results for '{query}':\n"]
    for item in items:
        lines.append(f"• {item['name']} ({item['category']}) — ₹{item['price']:.0f}")
        lines.append(f"  {item['description']}")
        lines.append("")
    return "\n".join(lines).strip()


async def get_item_detail(item_name: str) -> str:
    item = await _repo.get_item_by_name(item_name)
    if not item:
        return f"Sorry, I couldn't find '{item_name}' on our menu. Try searching or browse by category."
    customizations = ""
    if item.get("customizations"):
        customizations = f"\nOptions: {', '.join(item['customizations'])}"
    availability = "Available" if item["is_available"] else "Not available today"
    return (
        f"{item['name']}\n"
        f"Category: {item['category'].title()}\n"
        f"Price: ₹{item['price']:.0f}\n"
        f"Status: {availability}\n\n"
        f"{item['description']}"
        f"{customizations}"
    )
