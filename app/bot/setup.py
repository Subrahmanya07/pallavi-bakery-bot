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

    from app.bot.handlers.admin import (
        handle_admin_cancel,
        handle_admin_confirm,
        handle_admin_help,
        handle_admin_items,
        handle_admin_message,
        handle_admin_order_detail,
        handle_admin_orders,
        handle_admin_ready,
        handle_admin_toggle,
    )
    from app.bot.handlers.customer import (
        handle_callback,
        handle_cart_command,
        handle_menu_command,
        handle_message,
        handle_start,
        handle_track_command,
    )

    application.add_handler(CommandHandler("start", handle_start))
    application.add_handler(CommandHandler("menu", handle_menu_command))
    application.add_handler(CommandHandler("cart", handle_cart_command))
    application.add_handler(CommandHandler("track", handle_track_command))

    application.add_handler(CommandHandler("admin", handle_admin_help))
    application.add_handler(CommandHandler("orders", handle_admin_orders))
    application.add_handler(CommandHandler("order", handle_admin_order_detail))
    application.add_handler(CommandHandler("confirm", handle_admin_confirm))
    application.add_handler(CommandHandler("ready", handle_admin_ready))
    application.add_handler(CommandHandler("cancel", handle_admin_cancel))
    application.add_handler(CommandHandler("items", handle_admin_items))
    application.add_handler(CommandHandler("toggle", handle_admin_toggle))

    application.add_handler(CallbackQueryHandler(handle_callback))

    admin_ids = settings.get_admin_ids()
    if admin_ids:
        application.add_handler(
            MessageHandler(filters.User(user_id=admin_ids) & filters.TEXT & ~filters.COMMAND, handle_admin_message)
        )
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
