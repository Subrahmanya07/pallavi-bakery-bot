from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import get_settings
from app.database.repositories.order_repo import OrderRepository
from app.services.payment_service import (
    verify_payment_signature,
    verify_webhook_signature,
)

router = APIRouter(prefix="/payment")
_order_repo = OrderRepository()


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.get("/order/{order_id}")
async def get_payment_order(order_id: str):
    """Return order summary + razorpay_order_id for the checkout page."""
    order = await _order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "PAID":
        raise HTTPException(status_code=409, detail="Order already paid")
    return {
        "order_id": order_id,
        "order_number": order["order_number"],
        "customer_name": order["customer_name"],
        "items": order["items"],
        "total_amount": order["total_amount"],
        "razorpay_order_id": order.get("razorpay_order_id"),
        "razorpay_key_id": get_settings().razorpay_key_id,
        "payment_status": order.get("payment_status", "PENDING"),
    }


@router.post("/verify")
async def verify_payment(body: VerifyPaymentRequest):
    """Client calls this after Razorpay checkout success to confirm payment server-side."""
    if not verify_payment_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    ok = await _order_repo.mark_payment_paid(body.razorpay_order_id, body.razorpay_payment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Server-to-server webhook from Razorpay (backup payment confirmation)."""
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = await request.json()
    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    rzp_order_id = entity.get("order_id")
    rzp_payment_id = entity.get("id")

    if event.get("event") == "payment.captured" and rzp_order_id:
        await _order_repo.mark_payment_paid(rzp_order_id, rzp_payment_id)
    elif event.get("event") == "payment.failed" and rzp_order_id:
        await _order_repo.mark_payment_failed(rzp_order_id)

    return {"ok": True}
