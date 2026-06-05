from datetime import datetime

from pydantic import BaseModel, Field


class Customer(BaseModel):
    id: str = Field(alias="_id")
    telegram_id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    is_admin: bool = False
    total_orders: int = 0
    created_at: datetime
    last_seen: datetime

    model_config = {"populate_by_name": True}
