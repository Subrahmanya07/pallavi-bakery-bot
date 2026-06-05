from datetime import datetime
from enum import StrEnum

from bson import ObjectId
from pydantic import BaseModel, Field


class Category(StrEnum):
    BREADS = "breads"
    CAKES = "cakes"
    PASTRIES = "pastries"
    COOKIES = "cookies"
    DRINKS = "drinks"


class MenuItem(BaseModel):
    id: str = Field(alias="_id")
    name: str
    slug: str
    category: Category
    description: str
    price: float
    is_available: bool = True
    image_url: str | None = None
    customizations: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class MenuItemCreate(BaseModel):
    name: str
    slug: str
    category: Category
    description: str
    price: float
    is_available: bool = True
    image_url: str | None = None
    customizations: list[str] = []
