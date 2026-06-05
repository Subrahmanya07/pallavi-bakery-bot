from datetime import datetime, timezone

from app.database.connection import get_database


class SessionRepository:
    @property
    def collection(self):
        return get_database()["sessions"]

    async def get_cart(self, telegram_id: int) -> list[dict]:
        session = await self.collection.find_one({"telegram_id": telegram_id})
        return session.get("cart", []) if session else []

    async def add_to_cart(self, telegram_id: int, item: dict) -> list[dict]:
        now = datetime.now(timezone.utc)
        session = await self.collection.find_one({"telegram_id": telegram_id})
        cart = session.get("cart", []) if session else []

        for existing in cart:
            same_item = existing["menu_item_id"] == item["menu_item_id"]
            same_custom = existing.get("customization") == item.get("customization")
            if same_item and same_custom:
                existing["quantity"] += item["quantity"]
                await self.collection.update_one(
                    {"telegram_id": telegram_id},
                    {"$set": {"cart": cart, "last_activity": now}},
                    upsert=True,
                )
                return cart

        cart.append(item)
        await self.collection.update_one(
            {"telegram_id": telegram_id},
            {"$set": {"cart": cart, "last_activity": now}},
            upsert=True,
        )
        return cart

    async def remove_from_cart(self, telegram_id: int, item_name: str) -> list[dict]:
        now = datetime.now(timezone.utc)
        session = await self.collection.find_one({"telegram_id": telegram_id})
        cart = session.get("cart", []) if session else []
        cart = [i for i in cart if i["name"].lower() != item_name.lower()]
        await self.collection.update_one(
            {"telegram_id": telegram_id},
            {"$set": {"cart": cart, "last_activity": now}},
            upsert=True,
        )
        return cart

    async def clear_cart(self, telegram_id: int) -> None:
        await self.collection.update_one(
            {"telegram_id": telegram_id},
            {"$set": {"cart": [], "last_activity": datetime.now(timezone.utc)}},
            upsert=True,
        )

    async def setup_indexes(self) -> None:
        await self.collection.create_index("telegram_id", unique=True)
        await self.collection.create_index(
            "last_activity", expireAfterSeconds=604800
        )
