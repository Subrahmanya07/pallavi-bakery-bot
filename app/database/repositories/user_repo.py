from datetime import datetime, timezone

from pymongo import ReturnDocument

from app.database.connection import get_database


class UserRepository:
    @property
    def collection(self):
        return get_database()["users"]

    async def upsert_user(self, telegram_user) -> dict:
        now = datetime.now(timezone.utc)
        updates = {
            "first_name": telegram_user.first_name,
            "last_seen": now,
        }
        if telegram_user.last_name:
            updates["last_name"] = telegram_user.last_name
        if telegram_user.username:
            updates["username"] = telegram_user.username

        return await self.collection.find_one_and_update(
            {"telegram_id": telegram_user.id},
            {
                "$set": updates,
                "$setOnInsert": {
                    "telegram_id": telegram_user.id,
                    "is_admin": False,
                    "total_orders": 0,
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    async def get_by_telegram_id(self, telegram_id: int) -> dict | None:
        return await self.collection.find_one({"telegram_id": telegram_id})

    async def increment_order_count(self, telegram_id: int) -> None:
        await self.collection.update_one(
            {"telegram_id": telegram_id},
            {"$inc": {"total_orders": 1}},
        )

    async def setup_indexes(self) -> None:
        await self.collection.create_index("telegram_id", unique=True)
