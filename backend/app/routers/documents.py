import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.duplicates import run_duplicate_detection
from app.extraction import run_extraction
from app.formats import detect_format
from app.llm_extraction import run_llm_extraction
from app.models import Document, DocumentExtraction, ExtractionResult, User
from app.schemas import DocumentOut, ExtractionOut, FieldResultOut, PaginatedResponse
from app.storage import storage_client

router = APIRouter(prefix="/documents", tags=["documents"])

# Duplicated from query.py's identical constants rather than imported, to
# avoid a circular import (query.py already imports `_document_out` from
# this module).
DEFAULT_PAGE_LIMIT = 50
MAX_PAGE_LIMIT = 200


def _document_out(document: Document, db: Session) -> DocumentOut:
    extraction = db.execute(
        select(DocumentExtraction).where(DocumentExtraction.document_id == document.id)
    ).scalar_one()
    return DocumentOut(
        id=document.id,
        status=document.status,
        original_filename=document.original_filename,
        format=document.format,
        size_bytes=document.size_bytes,
        created_at=document.created_at,
        extraction_status=extraction.status,
        extraction_failure_reason=extraction.failure_reason,
        duplicate_of_id=document.duplicate_of_id,
    )


@router.get("", response_model=PaginatedResponse[DocumentOut])
def list_documents(
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[DocumentOut]:
    base_stmt = select(Document).where(Document.owner_id == current_user.id)

    total = db.execute(select(func.count()).select_from(base_stmt.subquery())).scalar_one()
    documents = (
        db.execute(base_stmt.order_by(Document.created_at.desc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )

    return PaginatedResponse(
        items=[_document_out(document, db) for document in documents],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentOut:
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="No file was provided.")

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > settings.max_upload_size_bytes:
        max_mb = settings.max_upload_size_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"The uploaded file exceeds the maximum allowed size of {max_mb:.0f} MB.",
        )

    detected_format, rejection_reason = detect_format(file.filename, content)
    if detected_format is None:
        raise HTTPException(status_code=400, detail=rejection_reason)

    document_id = uuid.uuid4()
    storage_key = f"documents/{document_id}"
    storage_client.put(storage_key, content)

    document = Document(
        id=document_id,
        original_filename=file.filename,
        format=detected_format,
        size_bytes=len(content),
        storage_key=storage_key,
        status="received",
        owner_id=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    extraction = run_extraction(document, db)
    if extraction.status == "succeeded":
        run_duplicate_detection(document, extraction, db)
        run_llm_extraction(document, extraction, db)

    return _document_out(document, db)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentOut:
    document = db.get(Document, document_id)
    if document is None or document.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _document_out(document, db)


@router.get("/{document_id}/fields", response_model=list[FieldResultOut])
def get_document_fields(
    document_id: uuid.UUID,
    needs_review: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ExtractionResult]:
    document = db.get(Document, document_id)
    if document is None or document.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")

    stmt = select(ExtractionResult).where(ExtractionResult.document_id == document_id)
    if needs_review is not None:
        stmt = stmt.where(ExtractionResult.needs_review == needs_review)
    return list(db.execute(stmt).scalars().all())


@router.get("/{document_id}/extraction", response_model=ExtractionOut)
def get_extraction(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentExtraction:
    document = db.get(Document, document_id)
    if document is None or document.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="No extraction found for this document.",
        )

    extraction = db.execute(
        select(DocumentExtraction).where(DocumentExtraction.document_id == document_id)
    ).scalar_one_or_none()
    if extraction is None:
        raise HTTPException(
            status_code=404,
            detail="No extraction found for this document.",
        )
    return extraction
