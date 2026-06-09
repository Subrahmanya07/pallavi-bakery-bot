from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Telegram
    telegram_token: str
    admin_ids: str = ""          # comma-separated IDs e.g. "123456,789012"
    webhook_url: str = ""
    webhook_secret: str = ""

    # Google AI
    gemini_api_key: str

    # MongoDB
    mongodb_uri: str
    mongodb_db_name: str = "bakery_bot"

    # App
    admin_api_key: str
    env: str = "development"
    dashboard_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    frontend_url: str = "http://localhost:3000"

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    def get_admin_ids(self) -> list[int]:
        """Return parsed list of admin Telegram IDs."""
        return [int(x.strip()) for x in self.admin_ids.split(",") if x.strip()]

    def get_dashboard_origins(self) -> list[str]:
        """Return parsed list of allowed CORS origins for the admin dashboard."""
        return [x.strip() for x in self.dashboard_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
