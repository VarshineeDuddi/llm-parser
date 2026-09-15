"""Read-only cross-document query endpoints over the field-level storage
model (3.1): retrieval by field name across documents, and retrieval of
documents by classified type. (Retrieval by document lives on the
`documents` router, since it's naturally scoped under `/documents/{id}`.)

Access-scoping change: both endpoints now require authentication and are
scoped to only the authenticated caller's own documents."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.llm_extraction import DOCUMENT_TYPE_FIELD_NAME
from app.models import Document, ExtractionResult, User
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[FieldResultWithDocumentOut]:
    base_stmt = (
        select(ExtractionResult)
        .join(Document, Document.id == ExtractionResult.document_id)
        .where(
            ExtractionResult.field_name == field_name,
            Document.owner_id == current_user.id,
        )
    )
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[DocumentOut]:
    base_stmt = (
        select(Document)
        .join(ExtractionResult, ExtractionResult.document_id == Document.id)
        .where(
            ExtractionResult.field_name == DOCUMENT_TYPE_FIELD_NAME,
            ExtractionResult.field_value == type,
            Document.owner_id == current_user.id,
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


@router.get("/needs-review", response_model=PaginatedResponse[FieldResultWithDocumentOut])
def get_needs_review_queue(
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[FieldResultWithDocumentOut]:
    base_stmt = (
        select(ExtractionResult)
        .join(Document, Document.id == ExtractionResult.document_id)
        .where(
            ExtractionResult.needs_review.is_(True),
            Document.owner_id == current_user.id,
        )
    )

    total = db.execute(select(func.count()).select_from(base_stmt.subquery())).scalar_one()
    results = (
        db.execute(base_stmt.order_by(ExtractionResult.created_at.asc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )

    return PaginatedResponse(items=list(results), limit=limit, offset=offset, total=total)
