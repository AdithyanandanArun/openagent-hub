from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://chatuser:chatpassword@postgres:5432/chatdb"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080
    FRONTEND_URL: str = "http://localhost:3000"
    APP_NAME: str = "AI Chat API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return list(
            {
                self.FRONTEND_URL,
                "http://localhost:3000",
                "http://localhost:5173",
            }
        )


settings = Settings()
