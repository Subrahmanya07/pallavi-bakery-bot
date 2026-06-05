import secrets as _secrets

from fastapi import APIRouter, HTTPException, Request
from telegram import Update

from app.bot.setup import get_application
from app.config import get_settings

router = APIRouter()


@router.post("/webhook")
async def telegram_webhook(request: Request):
    settings = get_settings()
    if not settings.webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not _secrets.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(status_code=403, detail="Invalid secret token")

    body = await request.json()
    update = Update.de_json(body, get_application().bot)
    await get_application().process_update(update)
    return {"ok": True}
