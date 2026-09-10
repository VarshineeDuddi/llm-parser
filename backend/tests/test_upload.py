import io
import zipfile

from app.storage import storage_client

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
TXT_BYTES = b"hello world, this is plain text"


def _zip_with_entry(entry_name: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr(entry_name, "<xml/>")
    return buffer.getvalue()


DOCX_BYTES = _zip_with_entry("word/document.xml")
PPTX_BYTES = _zip_with_entry("ppt/presentation.xml")


def test_upload_no_file_rejected(client):
    response = client.post("/documents/upload")
    assert response.status_code == 400
    assert response.json()["detail"] == "No file was provided."


def test_upload_empty_file_rejected(client):
    response = client.post(
        "/documents/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "The uploaded file is empty."


def test_upload_unsupported_extension_rejected(client):
    response = client.post(
        "/documents/upload",
        files={"file": ("sample.xyz", b"whatever", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_extension_content_mismatch_rejected(client):
    response = client.post(
        "/documents/upload",
        files={"file": ("fake.pdf", TXT_BYTES, "application/pdf")},
    )
    assert response.status_code == 400
    assert "does not match its '.pdf' extension" in response.json()["detail"]


def test_upload_oversize_file_rejected(client, monkeypatch):
    monkeypatch.setattr("app.routers.documents.settings.max_upload_size_bytes", 10)
    response = client.post(
        "/documents/upload",
        files={"file": ("sample.txt", TXT_BYTES, "text/plain")},
    )
    assert response.status_code == 400
    assert "exceeds the maximum allowed size" in response.json()["detail"]


def test_upload_txt_success(client):
    response = client.post(
        "/documents/upload",
        files={"file": ("sample.txt", TXT_BYTES, "text/plain")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "received"
    assert body["original_filename"] == "sample.txt"
    assert body["format"] == "txt"
    assert body["size_bytes"] == len(TXT_BYTES)
    assert "id" in body


def test_upload_pdf_success_and_retrievable(client):
    response = client.post(
        "/documents/upload",
        files={"file": ("sample.pdf", PDF_BYTES, "application/pdf")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["format"] == "pdf"
    stored_key = f"documents/{body['id']}"
    assert storage_client.get(stored_key) == PDF_BYTES


def test_upload_docx_success(client):
    response = client.post(
        "/documents/upload",
        files={
            "file": (
                "sample.docx",
                DOCX_BYTES,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 201
    assert response.json()["format"] == "docx"


def test_upload_pptx_success(client):
    response = client.post(
        "/documents/upload",
        files={
            "file": (
                "sample.pptx",
                PPTX_BYTES,
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
    )
    assert response.status_code == 201
    assert response.json()["format"] == "pptx"
