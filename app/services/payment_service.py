import hashlib
import hmac

import razorpay

from app.config import get_settings


def _client() -> razorpay.Client:
    s = get_settings()
    return razorpay.Client(auth=(s.razorpay_key_id, s.razorpay_key_secret))


def create_razorpay_order(amount_rupees: float, receipt: str) -> str:
    """Create a Razorpay order and return the razorpay_order_id."""
    amount_paise = int(round(amount_rupees * 100))
    order = _client().order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1,
    })
    return order["id"]


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, signature: str) -> bool:
    """Verify the signature returned by Razorpay checkout on payment success."""
    try:
        _client().utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception:
        return False


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify server-to-server webhook signature from Razorpay."""
    secret = get_settings().razorpay_webhook_secret
    if not secret:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
