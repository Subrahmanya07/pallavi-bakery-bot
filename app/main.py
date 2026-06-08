import os
import warnings
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin import router as admin_router
from app.api.routes.health import router as health_router
from app.api.routes.webhook import router as webhook_router
from app.bot.setup import setup_bot, shutdown_bot
from app.config import get_settings
from app.database.connection import close_db, connect_db


warnings.filterwarnings("ignore", category=UserWarning, module="google.adk")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ADK uses google-genai internally which reads GOOGLE_API_KEY from the environment
    os.environ.setdefault("GOOGLE_API_KEY", get_settings().gemini_api_key)
    await connect_db()
    await setup_bot()
    yield
    await shutdown_bot()
    await close_db()


app = FastAPI(title="Bakery Bot API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().get_dashboard_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(webhook_router)
app.include_router(admin_router)
