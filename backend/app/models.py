import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    """Metadata for one uploaded source file. Shape must not vary by document
    format/type — no per-format columns here, ever."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    original_filename: Mapped[str] = mapped_column(String(512))
    format: Mapped[str] = mapped_column(String(16))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    storage_key: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="received")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id"), default=None
    )


class DocumentExtraction(Base):
    """A document's extracted text-layer content and extraction outcome.
    Stores the document's full plain text as a single row — not the
    field-level key/value records the future LLM field-extraction
    capability will use."""

    __tablename__ = "document_extractions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), unique=True
    )
    extracted_text: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(String(32))
    failure_reason: Mapped[str | None] = mapped_column(String(1024), default=None)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True, default=None)
