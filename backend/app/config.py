from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/document_parser"

    s3_endpoint_url: str | None = None
    s3_bucket: str = "document-parser-documents"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "us-east-1"

    max_upload_size_bytes: int = 25 * 1024 * 1024


settings = Settings()
