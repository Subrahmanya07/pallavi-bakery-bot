"""Run once to seed the bakery menu into MongoDB.

Usage:
    uv run python scripts/seed_menu.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.connection import connect_db, close_db, get_database
from app.database.repositories.menu_repo import MenuRepository
from app.models.menu import MenuItemCreate

MENU_ITEMS = [
    # Breads
    MenuItemCreate(
        name="Sourdough Loaf",
        slug="sourdough-loaf",
        category="breads",
        description="Classic tangy sourdough with a crispy crust and chewy crumb. Baked fresh every morning.",
        price=180.0,
        customizations=["sliced", "unsliced"],
    ),
    MenuItemCreate(
        name="Multigrain Bread",
        slug="multigrain-bread",
        category="breads",
        description="Hearty loaf packed with sunflower seeds, oats, and whole grains.",
        price=160.0,
        customizations=["sliced", "unsliced"],
    ),
    MenuItemCreate(
        name="Garlic Focaccia",
        slug="garlic-focaccia",
        category="breads",
        description="Fluffy Italian flatbread loaded with roasted garlic and rosemary.",
        price=120.0,
        customizations=["extra garlic", "with olives"],
    ),
    MenuItemCreate(
        name="Whole Wheat Loaf",
        slug="whole-wheat-loaf",
        category="breads",
        description="100% whole wheat, soft and nutritious. Great for everyday use.",
        price=140.0,
        customizations=["sliced", "unsliced"],
    ),
    # Cakes
    MenuItemCreate(
        name="Chocolate Truffle Cake",
        slug="chocolate-truffle-cake",
        category="cakes",
        description="Rich dark chocolate layers with silky ganache frosting. A chocoholic's dream.",
        price=550.0,
        customizations=["500g", "1kg", "custom message on cake"],
    ),
    MenuItemCreate(
        name="Vanilla Butter Cake",
        slug="vanilla-butter-cake",
        category="cakes",
        description="Classic buttery vanilla sponge with fresh cream and seasonal fruit.",
        price=450.0,
        customizations=["500g", "1kg", "custom message on cake", "eggless"],
    ),
    MenuItemCreate(
        name="Red Velvet Cake",
        slug="red-velvet-cake",
        category="cakes",
        description="Vibrant red layers with smooth cream cheese frosting.",
        price=500.0,
        customizations=["500g", "1kg", "custom message on cake"],
    ),
    MenuItemCreate(
        name="Mango Mousse Cake",
        slug="mango-mousse-cake",
        category="cakes",
        description="Light and airy mango mousse layered with a soft sponge base. Seasonal favourite.",
        price=520.0,
        customizations=["500g", "1kg"],
    ),
    # Pastries
    MenuItemCreate(
        name="Butter Croissant",
        slug="butter-croissant",
        category="pastries",
        description="Flaky, golden, buttery croissant baked fresh every morning.",
        price=60.0,
        customizations=["plain", "with jam", "with cream cheese"],
    ),
    MenuItemCreate(
        name="Almond Croissant",
        slug="almond-croissant",
        category="pastries",
        description="Twice-baked croissant filled with almond frangipane and topped with flaked almonds.",
        price=80.0,
        customizations=["plain"],
    ),
    MenuItemCreate(
        name="Pain au Chocolat",
        slug="pain-au-chocolat",
        category="pastries",
        description="Buttery pastry wrapped around two dark chocolate batons. A Parisian classic.",
        price=70.0,
        customizations=["plain"],
    ),
    MenuItemCreate(
        name="Cinnamon Danish",
        slug="cinnamon-danish",
        category="pastries",
        description="Swirled Danish pastry with cinnamon sugar filling and vanilla glaze.",
        price=65.0,
        customizations=["with icing", "without icing"],
    ),
    # Cookies
    MenuItemCreate(
        name="Chocolate Chip Cookies",
        slug="chocolate-chip-cookies",
        category="cookies",
        description="Thick, chewy cookies loaded with dark chocolate chips. Sold by the dozen.",
        price=200.0,
        customizations=["half dozen", "dozen", "dark chocolate", "milk chocolate"],
    ),
    MenuItemCreate(
        name="Oatmeal Raisin Cookies",
        slug="oatmeal-raisin-cookies",
        category="cookies",
        description="Soft and hearty oatmeal cookies with plump raisins and a hint of cinnamon.",
        price=180.0,
        customizations=["half dozen", "dozen"],
    ),
    MenuItemCreate(
        name="Shortbread Fingers",
        slug="shortbread-fingers",
        category="cookies",
        description="Classic buttery Scottish shortbread. Melt-in-your-mouth texture.",
        price=150.0,
        customizations=["plain", "with chocolate drizzle"],
    ),
    # Drinks
    MenuItemCreate(
        name="Filter Coffee",
        slug="filter-coffee",
        category="drinks",
        description="Strong South Indian filter coffee with fresh-ground beans.",
        price=40.0,
        customizations=["small", "large", "with extra sugar", "less sugar", "no sugar"],
    ),
    MenuItemCreate(
        name="Masala Chai",
        slug="masala-chai",
        category="drinks",
        description="Spiced Indian tea brewed with ginger, cardamom, and fresh milk.",
        price=35.0,
        customizations=["small", "large", "less sugar", "no sugar"],
    ),
    MenuItemCreate(
        name="Cold Coffee",
        slug="cold-coffee",
        category="drinks",
        description="Chilled whipped coffee blended with milk and ice cream.",
        price=80.0,
        customizations=["with ice cream", "without ice cream"],
    ),
]


async def seed():
    await connect_db()
    repo = MenuRepository()
    await repo.setup_indexes()

    db = get_database()
    collection = db["menu_items"]
    count = await collection.count_documents({})

    if count > 0:
        print(f"Menu already has {count} items. Skipping seed.")
        print("To re-seed, drop the menu_items collection first.")
        await close_db()
        return

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    docs = []
    for item in MENU_ITEMS:
        doc = item.model_dump()
        doc["created_at"] = now
        doc["updated_at"] = now
        docs.append(doc)

    result = await collection.insert_many(docs)
    print(f"Seeded {len(result.inserted_ids)} menu items successfully.")
    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
