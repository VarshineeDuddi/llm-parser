import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict


class UserRegisterIn(BaseModel):
    name: str


class UserRegisterOut(BaseModel):
    """The raw API key is included here only -- this is the one and only
    response that ever returns it (spec: Raw key is never retrievable
    again)."""

    id: uuid.UUID
    name: str
    api_key: str


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


class FieldResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_name: str
    field_value: str
    confidence: float
    needs_review: bool
    created_at: datetime


class FieldResultWithDocumentOut(FieldResultOut):
    """Same shape as `FieldResultOut`, plus which document the record
    belongs to -- used by cross-document (by-field) responses. Not used
    by-document, where the document is already implied by the request
    path and repeating it on every record would be redundant."""

    document_id: uuid.UUID


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    limit: int
    offset: int
    total: int
