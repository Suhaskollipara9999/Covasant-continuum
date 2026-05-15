"""
Covasant Continuum — Application Configuration
Pydantic Settings for type-safe environment configuration.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Covasant Continuum"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-to-a-secure-random-string"
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = ""

    # JWT
    JWT_SECRET_KEY: str = "change-this-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Storage
    STORAGE_BACKEND: str = "sharepoint"
    MAX_UPLOAD_SIZE_MB: int = 100

    # SharePoint / Azure AD
    SHAREPOINT_HOSTNAME: str = ""
    SHAREPOINT_SITE_PATH: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    SHAREPOINT_ROOT_FOLDER: str = "Continuum"

    # AI Providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    DEFAULT_AI_PROVIDER: str = "anthropic"
    DEFAULT_AI_MODEL: str = "claude-sonnet-4-20250514"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # Super Admin Bootstrap
    SUPER_ADMIN_EMAIL: str = "admin@covasant.com"
    SUPER_ADMIN_PASSWORD: str = "change-this-password"



    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    model_config = {
        "env_file": (".env", "../.env"),
        "case_sensitive": True,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
