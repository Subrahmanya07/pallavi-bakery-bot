from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.errors import ServerError
from google.genai.types import Content, Part
from telegram import Update
from telegram.ext import ContextTypes

from app.agents.orchestrator import orchestrator
from app.config import get_settings

_session_service = InMemorySessionService()
_runner = Runner(
    agent=orchestrator,
    app_name="bakery_bot",
    session_service=_session_service,
)

APP_NAME = "bakery_bot"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    user = update.effective_user
    telegram_id = str(user.id)
    user_text = update.message.text.strip()

    session = await _session_service.get_session(
        app_name=APP_NAME, user_id=telegram_id, session_id=telegram_id
    )
    if session is None:
        session = await _session_service.create_session(
            app_name=APP_NAME, user_id=telegram_id, session_id=telegram_id
        )

    message = Content(role="user", parts=[Part(text=user_text)])

    try:
        response_text = ""
        async for event in _runner.run_async(
            user_id=telegram_id,
            session_id=telegram_id,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text
                break

        if response_text:
            await update.message.reply_text(response_text)
        else:
            await update.message.reply_text(
                "Hmm, I didn't get a response. Please try again!"
            )
    except ServerError as e:
        if e.code == 503:
            await update.message.reply_text(
                "The AI service is temporarily busy. Please try again in a few seconds!"
            )
        else:
            await update.message.reply_text(
                "Sorry, something went wrong. Please try again in a moment."
            )
    except Exception:
        await update.message.reply_text(
            "Sorry, something went wrong. Please try again in a moment."
        )
