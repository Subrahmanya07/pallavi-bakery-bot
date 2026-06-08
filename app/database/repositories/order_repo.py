from datetime import datetime, timezone

from app.database.connection import get_database
from app.models.order import OrderCreate, OrderStatus


class OrderRepository:
    @property
    def collection(self):
        return get_database()["orders"]

    async def _next_order_number(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        prefix = f"ORD-{today}-"
        last = await self.collection.find_one(
            {"order_number": {"$regex": f"^{prefix}"}},
            sort=[("order_number", -1)],
        )
        seq = (int(last["order_number"].split("-")[-1]) + 1) if last else 1
        return f"{prefix}{seq:04d}"

    async def create_order(self, order: OrderCreate) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "order_number": await self._next_order_number(),
            "telegram_user_id": order.telegram_user_id,
            "customer_name": order.customer_name,
            "items": [i.model_dump() for i in order.items],
            "total_amount": order.total_amount,
            "status": OrderStatus.PENDING,
            "pickup_time": order.pickup_time,
            "notes": order.notes,
            "created_at": now,
            "updated_at": now,
            "status_history": [
                {"status": OrderStatus.PENDING, "changed_at": now, "changed_by": "system"}
            ],
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def get_by_number(self, order_number: str) -> dict | None:
        order = await self.collection.find_one({"order_number": order_number.upper()})
        if order:
            order["_id"] = str(order["_id"])
        return order

    async def get_by_user(self, telegram_id: int, limit: int = 5) -> list[dict]:
        cursor = self.collection.find(
            {"telegram_user_id": telegram_id},
            sort=[("created_at", -1)],
        ).limit(limit)
        orders = await cursor.to_list(limit)
        for o in orders:
            o["_id"] = str(o["_id"])
        return orders

    async def update_status(self, order_number: str, new_status: str, changed_by: str) -> bool:
        now = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"order_number": order_number},
            {
                "$set": {"status": new_status, "updated_at": now},
                "$push": {
                    "status_history": {
                        "status": new_status,
                        "changed_at": now,
                        "changed_by": changed_by,
                    }
                },
            },
        )
        return result.modified_count > 0

    async def update_order_details(
        self,
        order_number: str,
        telegram_id: int,
        pickup_time: str | None = None,
        notes: str | None = None,
    ) -> tuple[bool, str]:
        order = await self.get_by_number(order_number)
        if not order:
            return False, "Order not found."
        if order["telegram_user_id"] != telegram_id:
            return False, "Order not found."
        if order["status"] != OrderStatus.PENDING:
            return False, f"Can't modify — order is already {order['status'].lower()}."

        updates = {}
        if pickup_time is not None:
            updates["pickup_time"] = pickup_time
        if notes is not None:
            updates["notes"] = notes
        if not updates:
            return False, "Nothing to update — tell me what you'd like to change."

        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one({"order_number": order_number}, {"$set": updates})
        return True, "Order updated successfully."

    async def cancel_order(self, order_number: str, telegram_id: int) -> tuple[bool, str]:
        order = await self.get_by_number(order_number)
        if not order:
            return False, "Order not found."
        if order["telegram_user_id"] != telegram_id:
            return False, "Order not found."
        locked = {OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP}
        if order["status"] in locked:
            return False, f"Cannot cancel — order is already {order['status'].lower()}."
        if order["status"] == OrderStatus.CANCELLED:
            return False, "Order is already cancelled."
        await self.update_status(order_number, OrderStatus.CANCELLED, f"customer:{telegram_id}")
        return True, "Order cancelled successfully."

    async def setup_indexes(self) -> None:
        await self.collection.create_index("order_number", unique=True)
        await self.collection.create_index("telegram_user_id")
        await self.collection.create_index("status")
        await self.collection.create_index([("created_at", -1)])
