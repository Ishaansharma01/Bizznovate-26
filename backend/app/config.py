"""Application configuration settings for Shailja Yoga."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Shailja Yoga Hours Verification & Certification Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Authoritative Timezone (Default for program operations)
    PROGRAM_TIMEZONE: str = "Asia/Kolkata"

    # Database
    # Standard SQLite fallback for effortless local laptop development; PostgreSQL in staging/prod
    DATABASE_URL: str = "sqlite:///./shailja_yoga.db"

    # Authentication & Security
    JWT_SECRET_KEY: str = "dev-secret-key-shailja-yoga-do-not-use-in-production-must-be-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Program Defaults (Non-negotiable requirements)
    DEFAULT_REQUIRED_HOURS: float = 200.0
    DEFAULT_DAILY_MAX_HOURS: float = 8.0
    DEFAULT_BACKDATING_WINDOW_HOURS: int = 48
    BACKDATING_BOUNDARY_POLICY: str = "elapsed_hours"  # "elapsed_hours" or "calendar_days"
    DEFAULT_PACE_WARNING_SHORTFALL_HOURS: float = 10.0

    # Certificate & Storage Configuration
    CERTIFICATE_STORAGE_DIR: str = "storage/certificates"
    CERTIFICATE_SIGNING_KEY: str = "dev-secret-certificate-signing-hmac-key-2026"
    CERTIFICATE_SIGNING_KEY_PATH: str = "keys/certificate_signing_private.pem"
    CERTIFICATE_SIGNING_PASSPHRASE: str = "dev-passphrase"
    PUBLIC_VERIFIER_URL: str = "http://localhost:5173/verify"

    # External Service Providers (Defaults to safe local mocks)
    NLP_SERVICE_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    NOTIFICATION_PROVIDER: str = "mock"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure local certificate storage path exists
cert_dir = Path(settings.CERTIFICATE_STORAGE_DIR)
cert_dir.mkdir(parents=True, exist_ok=True)
