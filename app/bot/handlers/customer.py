from telegram import Update
from telegram.ext import ContextTypes


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Bakery bot is alive! Full ordering system coming soon."
    )
