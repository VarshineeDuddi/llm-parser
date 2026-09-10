import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.extraction import run_extraction
from app.formats import detect_format
from app.models import Document, DocumentExtraction
from app.schemas import DocumentOut, ExtractionOut
from app.storage import storage_client

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile | None = None,
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
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    extraction = run_extraction(document, db)

    return DocumentOut(
        id=document.id,
        status=document.status,
        original_filename=document.original_filename,
        format=document.format,
        size_bytes=document.size_bytes,
        created_at=document.created_at,
        extraction_status=extraction.status,
        extraction_failure_reason=extraction.failure_reason,
    )


@router.get("/{document_id}/extraction", response_model=ExtractionOut)
def get_extraction(document_id: uuid.UUID, db: Session = Depends(get_db)) -> DocumentExtraction:
    extraction = db.execute(
        select(DocumentExtraction).where(DocumentExtraction.document_id == document_id)
    ).scalar_one_or_none()
    if extraction is None:
        raise HTTPException(
            status_code=404,
            detail="No extraction found for this document.",
        )
    return extraction
