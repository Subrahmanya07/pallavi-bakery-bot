from datetime import datetime, timezone

from bson import ObjectId

from app.database.connection import get_database
from app.models.menu import MenuItemCreate


class MenuRepository:
    @property
    def collection(self):
        return get_database()["menu_items"]

    async def get_all_categories(self) -> list[str]:
        pipeline = [
            {"$match": {"is_available": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
        results = await self.collection.aggregate(pipeline).to_list(None)
        return [f"{r['_id']} ({r['count']} items)" for r in results]

    async def get_items_by_category(self, category: str) -> list[dict]:
        cursor = self.collection.find(
            {"category": category.lower(), "is_available": True},
            {"_id": 1, "name": 1, "price": 1, "description": 1, "customizations": 1},
        )
        items = await cursor.to_list(None)
        for item in items:
            item["_id"] = str(item["_id"])
        return items

    async def search_items(self, query: str) -> list[dict]:
        cursor = self.collection.find(
            {"$text": {"$search": query}, "is_available": True},
            {"_id": 1, "name": 1, "price": 1, "description": 1, "category": 1},
        )
        items = await cursor.to_list(20)
        for item in items:
            item["_id"] = str(item["_id"])
        return items

    async def get_item_by_slug(self, slug: str) -> dict | None:
        item = await self.collection.find_one({"slug": slug})
        if item:
            item["_id"] = str(item["_id"])
        return item

    async def get_item_by_id(self, item_id: str) -> dict | None:
        item = await self.collection.find_one({"_id": ObjectId(item_id)})
        if item:
            item["_id"] = str(item["_id"])
        return item

    async def get_item_by_name(self, name: str) -> dict | None:
        item = await self.collection.find_one(
            {"name": name, "is_available": True},
            collation={"locale": "en", "strength": 2},  # case-insensitive exact match
        )
        if item:
            item["_id"] = str(item["_id"])
        return item

    async def create_item(self, item: MenuItemCreate) -> str:
        now = datetime.now(timezone.utc)
        doc = item.model_dump()
        doc["created_at"] = now
        doc["updated_at"] = now
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def update_item(self, item_id: str, updates: dict) -> bool:
        updates["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"_id": ObjectId(item_id)}, {"$set": updates}
        )
        return result.modified_count > 0

    async def toggle_availability(self, slug: str) -> bool | None:
        item = await self.collection.find_one({"slug": slug})
        if not item:
            return None
        new_state = not item["is_available"]
        await self.collection.update_one(
            {"slug": slug},
            {"$set": {"is_available": new_state, "updated_at": datetime.now(timezone.utc)}},
        )
        return new_state

    async def setup_indexes(self) -> None:
        await self.collection.create_index("slug", unique=True)
        await self.collection.create_index("category")
        await self.collection.create_index("is_available")
        await self.collection.create_index(
            [("name", "text"), ("description", "text")]
        )
