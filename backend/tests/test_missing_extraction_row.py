import uuid

from sqlalchemy import delete, select

from app.models import Document, DocumentExtraction
from app.routers.documents import _document_out

# --- Task 1.1: _document_out never raises when the extraction row is missing ---
# spec: Reading a document whose extraction outcome is unavailable


def test_document_out_returns_unknown_state_for_missing_extraction_row(db_session, s3):
    document = Document(
        id=uuid.uuid4(),
        original_filename="orphaned.txt",
        format="txt",
        size_bytes=5,
        storage_key="documents/orphaned",
        status="received",
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)

    result = _document_out(document, db_session)

    assert result.extraction_status == "unknown"
    assert result.extraction_failure_reason
    assert result.id == document.id


def _upload(client, headers, filename: str, content: bytes = b"hello world"):
    response = client.post(
        "/documents/upload",
        files={"file": (filename, content, "text/plain")},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _delete_extraction_row(db_session, document_id: str) -> None:
    db_session.execute(
        delete(DocumentExtraction).where(DocumentExtraction.document_id == uuid.UUID(document_id))
    )
    db_session.commit()


# --- Task 2.1: GET /documents/{id} returns 200 with the unknown state, not a 500 ---


def test_get_document_returns_unknown_state_for_missing_extraction_row(
    client, auth_headers, db_session
):
    document = _upload(client, auth_headers, "sample.txt")
    _delete_extraction_row(db_session, document["id"])

    response = client.get(f"/documents/{document['id']}", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["extraction_status"] == "unknown"
    assert body["extraction_failure_reason"]


# --- Task 2.2: one document's missing extraction row does not fail the whole list ---
# spec: One document's unavailable extraction outcome does not affect others in a list


def test_list_documents_isolates_missing_extraction_row(client, auth_headers, db_session):
    normal = _upload(client, auth_headers, "normal.txt")
    broken = _upload(client, auth_headers, "broken.txt")
    _delete_extraction_row(db_session, broken["id"])

    response = client.get("/documents", headers=auth_headers)

    assert response.status_code == 200
    items_by_id = {item["id"]: item for item in response.json()["items"]}
    assert items_by_id[normal["id"]]["extraction_status"] == "succeeded"
    assert items_by_id[broken["id"]]["extraction_status"] == "unknown"
    assert items_by_id[broken["id"]]["extraction_failure_reason"]


# --- Task 2.3: POST /documents/upload's own response path is unaffected for the
# normal (extraction row present) case - a regression check, not new behavior ---


def test_upload_response_unaffected_when_extraction_row_present(client, auth_headers):
    body = _upload(client, auth_headers, "regression.txt")

    assert body["extraction_status"] == "succeeded"
    assert body["extraction_failure_reason"] is None
