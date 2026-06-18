import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = "development"
    JWT_SECRET: str = "super-secret-jwt-key-for-development-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/codeexamhub"
    MONGODB_URI: str = "mongodb://localhost:27017/codeexamhub"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    FRONTEND_URL: str = "http://localhost:3000"

    # Use env file if it exists in parent directory or current directory
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env") if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")) else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
