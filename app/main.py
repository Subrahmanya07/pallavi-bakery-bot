from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.webhook import router as webhook_router
from app.bot.setup import setup_bot, shutdown_bot
from app.database.connection import close_db, connect_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup_bot()
    yield
    await shutdown_bot()
    await close_db()


app = FastAPI(title="Bakery Bot API", lifespan=lifespan)
app.include_router(health_router)
app.include_router(webhook_router)
