"""Read-only cross-document query endpoints over the field-level storage
model (3.1): retrieval by field name across documents, and retrieval of
documents by classified type. (Retrieval by document lives on the
`documents` router, since it's naturally scoped under `/documents/{id}`.)

No access control on any of these endpoints today -- matching the
existing (unauthenticated) posture of every endpoint already shipped;
not a new gap this story introduces."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.llm_extraction import DOCUMENT_TYPE_FIELD_NAME
from app.models import Document, ExtractionResult
from app.routers.documents import _document_out
from app.schemas import DocumentOut, FieldResultWithDocumentOut, PaginatedResponse

router = APIRouter(tags=["query"])

DEFAULT_PAGE_LIMIT = 50
MAX_PAGE_LIMIT = 200


@router.get("/fields/{field_name}", response_model=PaginatedResponse[FieldResultWithDocumentOut])
def get_field_occurrences(
    field_name: str,
    needs_review: bool | None = None,
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> PaginatedResponse[FieldResultWithDocumentOut]:
    base_stmt = select(ExtractionResult).where(ExtractionResult.field_name == field_name)
    if needs_review is not None:
        base_stmt = base_stmt.where(ExtractionResult.needs_review == needs_review)

    total = db.execute(select(func.count()).select_from(base_stmt.subquery())).scalar_one()
    results = (
        db.execute(base_stmt.order_by(ExtractionResult.created_at.asc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )

    return PaginatedResponse(items=list(results), limit=limit, offset=offset, total=total)


@router.get("/document-types/{type}/documents", response_model=PaginatedResponse[DocumentOut])
def get_documents_by_type(
    type: str,
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> PaginatedResponse[DocumentOut]:
    base_stmt = (
        select(Document)
        .join(ExtractionResult, ExtractionResult.document_id == Document.id)
        .where(
            ExtractionResult.field_name == DOCUMENT_TYPE_FIELD_NAME,
            ExtractionResult.field_value == type,
        )
    )

    total = db.execute(select(func.count()).select_from(base_stmt.subquery())).scalar_one()
    documents = (
        db.execute(base_stmt.order_by(Document.created_at.asc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )

    return PaginatedResponse(
        items=[_document_out(document, db) for document in documents],
        limit=limit,
        offset=offset,
        total=total,
    )
