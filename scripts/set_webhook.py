"""Run once after each production deploy to point Telegram at the new URL.

Usage:
    uv run python scripts/set_webhook.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Bot

from app.config import get_settings


async def main() -> None:
    settings = get_settings()
    if not settings.webhook_url:
        raise SystemExit("WEBHOOK_URL is not set — point it at your deployed backend URL first.")

    bot = Bot(token=settings.telegram_token)
    await bot.set_webhook(
        url=f"{settings.webhook_url}/webhook",
        secret_token=settings.webhook_secret,
    )
    info = await bot.get_webhook_info()
    print(f"Webhook registered: {info.url}")


if __name__ == "__main__":
    asyncio.run(main())
