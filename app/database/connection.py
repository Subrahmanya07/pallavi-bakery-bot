from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    global _client
    if _client is not None:
        return
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    await _client.admin.command("ping")
    print("MongoDB connected.")
    await _setup_indexes()


async def _setup_indexes() -> None:
    from app.database.repositories.menu_repo import MenuRepository
    from app.database.repositories.order_repo import OrderRepository
    from app.database.repositories.session_repo import SessionRepository
    from app.database.repositories.user_repo import UserRepository

    await MenuRepository().setup_indexes()
    await OrderRepository().setup_indexes()
    await SessionRepository().setup_indexes()
    await UserRepository().setup_indexes()


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Database not connected — call connect_db() first.")
    return _client[get_settings().mongodb_db_name]
