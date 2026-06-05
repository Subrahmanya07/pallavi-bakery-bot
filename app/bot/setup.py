from telegram.ext import Application, MessageHandler, filters

from app.config import get_settings

_application: Application | None = None


def get_application() -> Application:
    if _application is None:
        raise RuntimeError("Bot not initialized — call setup_bot() first.")
    return _application


async def setup_bot() -> None:
    global _application
    settings = get_settings()

    application = Application.builder().token(settings.telegram_token).build()

    from app.bot.handlers.customer import handle_message
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    await application.initialize()
    await application.start()

    if settings.env == "production" and settings.webhook_url:
        await application.bot.set_webhook(
            url=f"{settings.webhook_url}/webhook",
            secret_token=settings.webhook_secret,
        )
    else:
        await application.updater.start_polling()

    _application = application
    print(f"Bot started in {'webhook' if settings.env == 'production' else 'polling'} mode.")


async def shutdown_bot() -> None:
    global _application
    if _application is None:
        return
    settings = get_settings()
    if settings.env != "production":
        await _application.updater.stop()
    await _application.stop()
    await _application.shutdown()
    _application = None
