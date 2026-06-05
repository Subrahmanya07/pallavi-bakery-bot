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

    def get_admin_ids(self) -> list[int]:
        """Return parsed list of admin Telegram IDs."""
        return [int(x.strip()) for x in self.admin_ids.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
