from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class OrderStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    PICKED_UP = "PICKED_UP"
    CANCELLED = "CANCELLED"


class CartItem(BaseModel):
    menu_item_id: str
    name: str
    quantity: int
    unit_price: float
    customization: str | None = None


class StatusEntry(BaseModel):
    status: str
    changed_at: datetime
    changed_by: str


class Order(BaseModel):
    id: str = Field(alias="_id")
    order_number: str
    telegram_user_id: int
    customer_name: str
    items: list[CartItem]
    total_amount: float
    status: OrderStatus
    pickup_time: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    status_history: list[StatusEntry] = []

    model_config = {"populate_by_name": True}


class OrderCreate(BaseModel):
    telegram_user_id: int
    customer_name: str
    items: list[CartItem]
    total_amount: float
    pickup_time: str | None = None
    notes: str | None = None
