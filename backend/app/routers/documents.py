import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.formats import detect_format
from app.models import Document
from app.schemas import DocumentOut
from app.storage import storage_client

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile | None = None,
    db: Session = Depends(get_db),
) -> Document:
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
    return document
