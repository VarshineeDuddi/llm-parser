import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    original_filename: str
    format: str
    size_bytes: int
    created_at: datetime
    extraction_status: str
    extraction_failure_reason: str | None = None
    duplicate_of_id: uuid.UUID | None = None


class ExtractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: uuid.UUID
    status: str
    extracted_text: str | None
    failure_reason: str | None
    extracted_at: datetime
