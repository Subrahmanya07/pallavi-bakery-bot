from fastapi import APIRouter

from app.database.connection import get_database

router = APIRouter()


@router.get("/health")
async def health_check():
    try:
        await get_database().command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "db": db_status}
