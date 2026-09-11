import io
import uuid
from datetime import datetime, timedelta, timezone

from pypdf import PdfWriter

from app.duplicates import compute_content_hash, find_original_document, run_duplicate_detection
from app.extraction import run_extraction
from app.models import Document, DocumentExtraction
from app.storage import storage_client


def _build_blank_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


BLANK_PDF = _build_blank_pdf()


def _make_document(db_session, *, status: str = "received", created_at: datetime | None = None) -> Document:
    document_id = uuid.uuid4()
    document = Document(
        id=document_id,
        original_filename="sample.txt",
        format="txt",
        size_bytes=10,
        storage_key=f"documents/{document_id}",
        status=status,
    )
    if created_at is not None:
        document.created_at = created_at
    db_session.add(document)
    db_session.flush()
    return document


def _make_extraction(
    db_session,
    document: Document,
    *,
    status: str = "succeeded",
    extracted_text: str | None = None,
    content_hash: str | None = None,
) -> DocumentExtraction:
    extraction = DocumentExtraction(
        document_id=document.id,
        extracted_text=extracted_text,
        status=status,
        content_hash=content_hash,
    )
    db_session.add(extraction)
    db_session.commit()
    db_session.refresh(extraction)
    return extraction


def _make_stored_document(format: str, content: bytes) -> Document:
    document_id = uuid.uuid4()
    storage_key = f"documents/{document_id}"
    storage_client.put(storage_key, content)
    return Document(
        id=document_id,
        original_filename=f"sample.{format}",
        format=format,
        size_bytes=len(content),
        storage_key=storage_key,
        status="received",
    )


def _upload(client, filename: str, content: bytes, content_type: str = "text/plain"):
    return client.post(
        "/documents/upload",
        files={"file": (filename, content, content_type)},
    )


# --- Content hashing (spec: Duplicate Detection by Content) ---


def test_compute_content_hash_ignores_whitespace_differences():
    assert compute_content_hash("hello   world") == compute_content_hash("hello\nworld")


def test_compute_content_hash_differs_for_different_content():
    assert compute_content_hash("hello world") != compute_content_hash("hello there")


# --- Duplicate lookup query (spec: Duplicate Detection by Content, Requires Successful Extraction) ---


def test_find_original_document_returns_earliest_match(db_session):
    now = datetime.now(timezone.utc)
    original = _make_document(db_session, created_at=now - timedelta(minutes=5))
    _make_extraction(db_session, original, content_hash="abc123")
    newer = _make_document(db_session, created_at=now)
    _make_extraction(db_session, newer, content_hash="abc123")

    found = find_original_document("abc123", newer.id, db_session)

    assert found is not None
    assert found.id == original.id


def test_find_original_document_returns_none_when_hash_unique(db_session):
    document = _make_document(db_session)
    _make_extraction(db_session, document, content_hash="some-hash")

    found = find_original_document("a-different-hash", uuid.uuid4(), db_session)

    assert found is None


def test_find_original_document_ignores_failed_extraction_document(db_session):
    failed = _make_document(db_session)
    _make_extraction(db_session, failed, status="failed", content_hash=None)

    found = find_original_document(compute_content_hash(""), uuid.uuid4(), db_session)

    assert found is None


def test_find_original_document_skips_documents_already_marked_duplicate(db_session):
    now = datetime.now(timezone.utc)
    original = _make_document(db_session, created_at=now - timedelta(minutes=10))
    _make_extraction(db_session, original, content_hash="xyz789")
    already_duplicate = _make_document(
        db_session, status="duplicate", created_at=now - timedelta(minutes=5)
    )
    _make_extraction(db_session, already_duplicate, content_hash="xyz789")
    newest = _make_document(db_session, created_at=now)
    _make_extraction(db_session, newest, content_hash="xyz789")

    found = find_original_document("xyz789", newest.id, db_session)

    assert found is not None
    assert found.id == original.id


# --- Content hash persistence tied to extraction outcome (spec: Duplicate Detection Requires Successful Extraction) ---


def test_run_duplicate_detection_populates_content_hash_on_success(db_session, s3):
    document = _make_stored_document("txt", b"unique content for hashing")
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)

    extraction = run_extraction(document, db_session)
    assert extraction.content_hash is None

    run_duplicate_detection(document, extraction, db_session)

    assert extraction.content_hash == compute_content_hash("unique content for hashing")


def test_content_hash_left_null_after_failed_extraction(db_session, s3):
    document = _make_stored_document("pdf", BLANK_PDF)
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)

    extraction = run_extraction(document, db_session)

    assert extraction.status == "failed"
    assert extraction.content_hash is None


# --- Upload integration: duplicate matching end-to-end (spec: Duplicate Detection by Content) ---


def test_second_upload_of_matching_content_is_recorded_as_duplicate(client, db_session):
    first = _upload(client, "sample.txt", b"identical content here")
    second = _upload(client, "sample-again.txt", b"identical content here")

    assert first.status_code == 201
    assert second.status_code == 201

    first_body = first.json()
    second_body = second.json()

    assert first_body["status"] == "received"
    assert first_body["duplicate_of_id"] is None
    assert second_body["status"] == "duplicate"
    assert second_body["duplicate_of_id"] == first_body["id"]


def test_upload_with_unique_content_is_unaffected(client):
    response = _upload(client, "sample.txt", b"nothing else matches this content")

    body = response.json()
    assert body["status"] == "received"
    assert body["duplicate_of_id"] is None


def test_original_document_unaffected_when_duplicate_uploaded(client, db_session):
    first = _upload(client, "sample.txt", b"content to be duplicated")
    _upload(client, "sample-copy.txt", b"content to be duplicated")

    first_id = first.json()["id"]
    original = db_session.get(Document, uuid.UUID(first_id))

    assert original.status == "received"
    assert original.duplicate_of_id is None


def test_multiple_duplicates_of_same_original_do_not_affect_it(client, db_session):
    original_response = _upload(client, "sample.txt", b"shared content across many uploads")
    dup_one = _upload(client, "sample-copy1.txt", b"shared content across many uploads")
    dup_two = _upload(client, "sample-copy2.txt", b"shared content across many uploads")

    original_id = original_response.json()["id"]

    assert dup_one.json()["status"] == "duplicate"
    assert dup_one.json()["duplicate_of_id"] == original_id
    assert dup_two.json()["status"] == "duplicate"
    assert dup_two.json()["duplicate_of_id"] == original_id

    original = db_session.get(Document, uuid.UUID(original_id))
    assert original.status == "received"
    assert original.duplicate_of_id is None


def test_failed_extraction_document_is_not_compared_and_not_matched(client, db_session):
    first = _upload(client, "scanned1.pdf", BLANK_PDF, "application/pdf")
    second = _upload(client, "scanned2.pdf", BLANK_PDF, "application/pdf")

    first_body = first.json()
    second_body = second.json()

    assert first_body["extraction_status"] == "failed"
    assert first_body["status"] == "received"
    assert first_body["duplicate_of_id"] is None

    assert second_body["extraction_status"] == "failed"
    assert second_body["status"] == "received"
    assert second_body["duplicate_of_id"] is None


# --- Response contract & document retrieval (spec: Duplicate Status Visibility) ---


def test_get_document_shows_duplicate_status_and_original_reference(client):
    first = _upload(client, "sample.txt", b"content for retrieval test")
    second = _upload(client, "sample-copy.txt", b"content for retrieval test")
    second_id = second.json()["id"]

    response = client.get(f"/documents/{second_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "duplicate"
    assert body["duplicate_of_id"] == first.json()["id"]


def test_get_document_shows_no_duplicate_reference_for_unique_content(client):
    response = _upload(client, "sample.txt", b"one-of-a-kind content")
    document_id = response.json()["id"]

    get_response = client.get(f"/documents/{document_id}")

    assert get_response.status_code == 200
    body = get_response.json()
    assert body["status"] == "received"
    assert body["duplicate_of_id"] is None


def test_get_document_404_for_unknown_id(client):
    response = client.get(f"/documents/{uuid.uuid4()}")
    assert response.status_code == 404
