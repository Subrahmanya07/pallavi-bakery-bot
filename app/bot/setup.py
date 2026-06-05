from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters

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

    from app.bot.handlers.customer import (
        handle_callback,
        handle_cart_command,
        handle_menu_command,
        handle_message,
        handle_start,
    )

    application.add_handler(CommandHandler("start", handle_start))
    application.add_handler(CommandHandler("menu", handle_menu_command))
    application.add_handler(CommandHandler("cart", handle_cart_command))
    application.add_handler(CallbackQueryHandler(handle_callback))
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

    mode = "webhook" if settings.env == "production" else "polling"
    print(f"Bot started in {mode} mode.")


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
