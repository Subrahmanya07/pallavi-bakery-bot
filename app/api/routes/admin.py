import secrets as _secrets
from datetime import date as DateType
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.database.repositories.menu_repo import MenuRepository
from app.database.repositories.order_repo import OrderRepository
from app.models.menu import MenuItemCreate, MenuItemUpdate
from app.models.order import OrderStatus
from app.tools.admin_tools import notify_order_status_change

router = APIRouter(prefix="/admin")
_menu_repo = MenuRepository()
_order_repo = OrderRepository()


def require_admin_key(x_admin_key: Annotated[str | None, Header()] = None) -> None:
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=503, detail="Admin API key not configured")
    if not x_admin_key or not _secrets.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


_admin_dep = [Depends(require_admin_key)]


@router.get("/orders", dependencies=_admin_dep)
async def list_orders(status: OrderStatus | None = None, date: DateType | None = None):
    orders = await _order_repo.list_orders(status=status.value if status else None, order_date=date)
    return {"orders": orders}


@router.get("/orders/{order_id}", dependencies=_admin_dep)
async def get_order(order_id: str):
    order = await _order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/status", dependencies=_admin_dep)
async def update_order_status(order_id: str, body: OrderStatusUpdate):
    order = await _order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    updated = await _order_repo.update_status(order["order_number"], body.status, changed_by="admin:rest_api")
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update order status")

    notified = await notify_order_status_change(order, body.status)
    return {"ok": True, "order_number": order["order_number"], "status": body.status, "customer_notified": notified}


@router.get("/menu", dependencies=_admin_dep)
async def list_menu_items():
    items = await _menu_repo.get_all_items()
    return {"items": items}


@router.post("/menu", status_code=201, dependencies=_admin_dep)
async def create_menu_item(body: MenuItemCreate):
    if await _menu_repo.get_item_by_slug(body.slug):
        raise HTTPException(status_code=409, detail=f"Item with slug '{body.slug}' already exists")
    item_id = await _menu_repo.create_item(body)
    return {"ok": True, "id": item_id}


@router.patch("/menu/{item_id}", dependencies=_admin_dep)
async def update_menu_item(item_id: str, body: MenuItemUpdate):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if not await _menu_repo.update_item(item_id, updates):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@router.delete("/menu/{item_id}", dependencies=_admin_dep)
async def delete_menu_item(item_id: str):
    if not await _menu_repo.soft_delete_item(item_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}
