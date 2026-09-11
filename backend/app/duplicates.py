"""Duplicate detection by content. A document's extracted text is hashed
and compared, after a successful extraction, against previously extracted
documents -- exact match only, no fuzzy similarity. A document whose own
extraction failed has no hash and never participates, on either side of
the comparison."""

import hashlib
import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentExtraction


def compute_content_hash(text: str) -> str:
    """Collapse whitespace runs so incidental formatting differences don't
    produce a false negative, then hash the normalized text."""
    normalized = re.sub(r"\s+", " ", text).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def find_original_document(
    content_hash: str, exclude_document_id: uuid.UUID, db: Session
) -> Document | None:
    """Return the earliest other document with a matching content hash
    whose own status is not `duplicate`, or None if there isn't one. A
    document whose extraction failed has a null content_hash and can never
    match here."""
    stmt = (
        select(Document)
        .join(DocumentExtraction, DocumentExtraction.document_id == Document.id)
        .where(
            DocumentExtraction.content_hash == content_hash,
            Document.id != exclude_document_id,
            Document.status != "duplicate",
        )
        .order_by(Document.created_at.asc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def run_duplicate_detection(document: Document, extraction: DocumentExtraction, db: Session) -> None:
    """Hash and persist `extraction`'s text, then, if it matches an
    earlier, non-duplicate document, record `document` as a duplicate of
    it. Only called when `extraction.status == "succeeded"` -- a failed
    extraction has no text to hash and is never compared."""
    extraction.content_hash = compute_content_hash(extraction.extracted_text)
    db.commit()
    db.refresh(extraction)

    original = find_original_document(extraction.content_hash, document.id, db)
    if original is not None:
        document.status = "duplicate"
        document.duplicate_of_id = original.id
        db.commit()
        db.refresh(document)
