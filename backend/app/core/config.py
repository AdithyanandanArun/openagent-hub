from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/openagent"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    PUBLIC_APP_URL: str = "http://localhost:3000"
    ENABLE_OPENAI_COMPAT_API: bool = True
    ENABLE_CUSTOM_MCP_SERVERS: bool = True
    # Remote Streamable HTTP MCP connectors are safe to expose in the hosted
    # beta. This intentionally does not enable stdio/local command execution.
    ENABLE_REMOTE_MCP_CONNECTORS: bool = False
    ENABLE_WORKSPACE_OPEN: bool = True
    STORAGE_BACKEND: str = "local"  # local | gcs
    GCS_BUCKET: Optional[str] = None
    GOOGLE_CLOUD_PROJECT: Optional[str] = None
    REDIS_URL: Optional[str] = None
    AUTH_REQUESTS_PER_HOUR: int = 20
    CHAT_REQUESTS_PER_MINUTE: int = 20
    CHAT_REQUESTS_PER_DAY: int = 500
    MAX_CONCURRENT_CHAT_REQUESTS: int = 2
    ENABLE_HEALTH_PROBES: bool = True

    # Public registrations require a verification email. Development can use the
    # console delivery mode so contributors do not need a third-party account.
    EMAIL_VERIFICATION_REQUIRED: bool = True
    EMAIL_DELIVERY_MODE: str = "console"  # console | resend
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    INVITE_ONLY: bool = False
    # Comma-separated normalized email addresses. Store this in a secret
    # manager in public beta deployments so the invited-user list is private.
    INVITED_EMAILS: str = ""
    # AES-256-GCM key for encrypting provider API keys at rest. 32 bytes,
    # base64-encoded. If unset, derived deterministically from SECRET_KEY via
    # HKDF so existing single-secret deploys keep working.
    ENCRYPTION_KEY: Optional[str] = None
    PREVIOUS_ENCRYPTION_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def invited_emails(self) -> set[str]:
        return {email.strip().lower() for email in self.INVITED_EMAILS.split(",") if email.strip()}

    def validate_runtime(self) -> None:
        """Fail closed when a public deployment is missing required controls."""
        if not self.is_production:
            return

        errors: list[str] = []
        if self.SECRET_KEY == "change-me-in-production-use-a-long-random-string" or len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY must be a unique value of at least 32 characters")
        if not self.ENCRYPTION_KEY:
            errors.append("ENCRYPTION_KEY is required in production")
        if not self.DATABASE_URL.startswith("postgresql") or "postgres:postgres@" in self.DATABASE_URL:
            errors.append("DATABASE_URL must use production PostgreSQL credentials")
        if not self.allowed_origins or "*" in self.allowed_origins:
            errors.append("ALLOWED_ORIGINS must contain explicit HTTPS origins")
        if not self.PUBLIC_APP_URL.startswith("https://"):
            errors.append("PUBLIC_APP_URL must be an HTTPS URL")
        if self.EMAIL_VERIFICATION_REQUIRED and (
            self.EMAIL_DELIVERY_MODE != "resend" or not self.RESEND_API_KEY or not self.EMAIL_FROM
        ):
            errors.append("Resend email delivery (RESEND_API_KEY and EMAIL_FROM) is required")
        if self.INVITE_ONLY and not self.invited_emails:
            errors.append("INVITED_EMAILS is required when INVITE_ONLY=true")
        if self.ENABLE_OPENAI_COMPAT_API:
            errors.append("ENABLE_OPENAI_COMPAT_API must be false for the browser-only public beta")
        if self.ENABLE_CUSTOM_MCP_SERVERS:
            errors.append("ENABLE_CUSTOM_MCP_SERVERS must be false until MCP sandboxing is implemented")
        if self.ENABLE_WORKSPACE_OPEN:
            errors.append("ENABLE_WORKSPACE_OPEN must be false in production")
        if self.STORAGE_BACKEND != "gcs" or not self.GCS_BUCKET:
            errors.append("STORAGE_BACKEND=gcs and GCS_BUCKET are required in production")
        if not self.REDIS_URL:
            errors.append("REDIS_URL is required in production")
        if self.ENABLE_HEALTH_PROBES:
            errors.append("ENABLE_HEALTH_PROBES must be false in API replicas; use the health-probe job")
        if errors:
            raise RuntimeError("Invalid production configuration: " + "; ".join(errors))


settings = Settings()
