import io
import json
import uuid
from datetime import datetime, timezone

from pypdf import PdfWriter

from app import llm_extraction
from app.models import ExtractionResult
from app.schemas import FieldResultOut, PaginatedResponse


def _upload(client, auth_headers, monkeypatch, filename: str, content: bytes, raw_response: str) -> dict:
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)
    response = client.post(
        "/documents/upload",
        files={"file": (filename, content, "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def _type_quote(document_type: str) -> str:
    """A source_quote for the `_document_type` entry that's guaranteed to
    appear verbatim in `_body`'s output -- grounding needs an exact
    (whitespace-normalized) substring match, not just the bare type value."""
    return f"DOCTYPE:{document_type}"


def _body(document_type: str, rest: str) -> bytes:
    """Document text that literally contains `_type_quote(document_type)`,
    plus whatever other content a test wants to extract fields from."""
    return f"{_type_quote(document_type)}\n{rest}".encode()


def _fields_response(document_type: str, extra_fields: list[dict]) -> str:
    fields = [
        {
            "field_name": "_document_type",
            "value": document_type,
            "source_quote": _type_quote(document_type),
            "confidence": 0.9,
        },
        *extra_fields,
    ]
    return json.dumps({"fields": fields})


def _build_blank_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


BLANK_PDF = _build_blank_pdf()


# --- Response models (task 1.1, 1.2) ---


def test_field_result_out_serializes_extraction_result():
    result = ExtractionResult(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        field_name="total",
        field_value="$42",
        source_quote="Total: $42",
        confidence=0.9,
        needs_review=False,
        created_at=datetime.now(timezone.utc),
    )
    out = FieldResultOut.model_validate(result)
    assert out.field_name == "total"
    assert out.field_value == "$42"
    assert out.confidence == 0.9
    assert out.needs_review is False


def test_paginated_response_empty_page():
    page = PaginatedResponse[int](items=[], limit=10, offset=0, total=0)
    assert page.items == []
    assert page.total == 0


def test_paginated_response_partial_last_page():
    page = PaginatedResponse[int](items=[1, 2], limit=10, offset=10, total=12)
    assert len(page.items) == 2
    assert page.total == 12
    assert page.offset + len(page.items) == page.total


# --- Retrieve by document (task 2.1-2.4) ---


def test_get_document_fields_returns_all_records(client, auth_headers, monkeypatch):
    doc = _upload(
        client,
        auth_headers,
        monkeypatch,
        "invoice.txt",
        _body("invoice", "Total: $42"),
        _fields_response(
            "invoice",
            [{"field_name": "total", "value": "$42", "source_quote": "Total: $42", "confidence": 0.9}],
        ),
    )

    response = client.get(f"/documents/{doc['id']}/fields", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    field_names = {item["field_name"] for item in body}
    assert field_names == {"_document_type", "total"}
    assert "document_id" not in body[0]


def test_get_document_fields_empty_when_no_records(client, auth_headers, monkeypatch):
    called = {"count": 0}

    def _extract(text: str) -> str:
        called["count"] += 1
        return json.dumps({"fields": []})

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _extract)

    response = client.post(
        "/documents/upload",
        files={"file": ("scanned.pdf", BLANK_PDF, "application/pdf")},
        headers=auth_headers,
    )
    assert response.status_code == 201
    document_id = response.json()["id"]
    assert called["count"] == 0  # text extraction failed, LLM never invoked

    fields_response = client.get(f"/documents/{document_id}/fields", headers=auth_headers)
    assert fields_response.status_code == 200
    assert fields_response.json() == []


def test_get_document_fields_404_for_unknown_document(client, auth_headers):
    response = client.get(f"/documents/{uuid.uuid4()}/fields", headers=auth_headers)
    assert response.status_code == 404


def test_get_document_fields_needs_review_filter(client, auth_headers, monkeypatch):
    doc = _upload(
        client,
        auth_headers,
        monkeypatch,
        "note.txt",
        _body("note", "High: yes. Low: unsure."),
        _fields_response(
            "note",
            [
                {"field_name": "high", "value": "yes", "source_quote": "High: yes.", "confidence": 0.9},
                {"field_name": "low", "value": "unsure", "source_quote": "Low: unsure.", "confidence": 0.2},
            ],
        ),
    )

    all_fields = client.get(f"/documents/{doc['id']}/fields", headers=auth_headers).json()
    assert {f["field_name"] for f in all_fields} == {"_document_type", "high", "low"}

    flagged_only = client.get(
        f"/documents/{doc['id']}/fields", params={"needs_review": True}, headers=auth_headers
    ).json()
    assert {f["field_name"] for f in flagged_only} == {"low"}

    not_flagged = client.get(
        f"/documents/{doc['id']}/fields", params={"needs_review": False}, headers=auth_headers
    ).json()
    assert {f["field_name"] for f in not_flagged} == {"_document_type", "high"}


# --- Retrieve by field name (task 3.1-3.4) ---


def test_get_field_occurrences_across_documents(client, auth_headers, monkeypatch):
    field_name = f"invoice_total_{uuid.uuid4().hex[:8]}"
    doc_a = _upload(
        client,
        auth_headers,
        monkeypatch,
        "a.txt",
        _body("invoice", "Invoice A: $10"),
        _fields_response(
            "invoice",
            [{"field_name": field_name, "value": "$10", "source_quote": "Invoice A: $10", "confidence": 0.9}],
        ),
    )
    doc_b = _upload(
        client,
        auth_headers,
        monkeypatch,
        "b.txt",
        _body("invoice", "Invoice B: $20"),
        _fields_response(
            "invoice",
            [{"field_name": field_name, "value": "$20", "source_quote": "Invoice B: $20", "confidence": 0.9}],
        ),
    )

    response = client.get(f"/fields/{field_name}", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    document_ids = {item["document_id"] for item in body["items"]}
    assert document_ids == {doc_a["id"], doc_b["id"]}
    assert body["total"] == 2


def test_get_field_occurrences_empty_for_unused_field_name(client, auth_headers):
    response = client.get(f"/fields/{uuid.uuid4().hex}", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_get_field_occurrences_needs_review_filter(client, auth_headers, monkeypatch):
    field_name = f"status_{uuid.uuid4().hex[:8]}"
    _upload(
        client,
        auth_headers,
        monkeypatch,
        "a.txt",
        _body("note", "Status: confirmed"),
        _fields_response(
            "note",
            [{"field_name": field_name, "value": "confirmed", "source_quote": "Status: confirmed", "confidence": 0.9}],
        ),
    )
    _upload(
        client,
        auth_headers,
        monkeypatch,
        "b.txt",
        _body("note", "Status: unclear"),
        _fields_response(
            "note",
            [{"field_name": field_name, "value": "unclear", "source_quote": "Status: unclear", "confidence": 0.2}],
        ),
    )

    all_occurrences = client.get(f"/fields/{field_name}", headers=auth_headers).json()
    assert all_occurrences["total"] == 2

    flagged_only = client.get(
        f"/fields/{field_name}", params={"needs_review": True}, headers=auth_headers
    ).json()
    assert flagged_only["total"] == 1
    assert flagged_only["items"][0]["field_value"] == "unclear"


def test_get_field_occurrences_paginated(client, auth_headers, monkeypatch):
    field_name = f"ref_{uuid.uuid4().hex[:8]}"
    for i in range(3):
        _upload(
            client,
            auth_headers,
            monkeypatch,
            f"doc{i}.txt",
            _body("note", f"Reference: R{i}"),
            _fields_response(
                "note",
                [
                    {
                        "field_name": field_name,
                        "value": f"R{i}",
                        "source_quote": f"Reference: R{i}",
                        "confidence": 0.9,
                    }
                ],
            ),
        )

    first_page = client.get(
        f"/fields/{field_name}", params={"limit": 2, "offset": 0}, headers=auth_headers
    ).json()
    assert len(first_page["items"]) == 2
    assert first_page["total"] == 3

    second_page = client.get(
        f"/fields/{field_name}", params={"limit": 2, "offset": 2}, headers=auth_headers
    ).json()
    assert len(second_page["items"]) == 1
    assert second_page["total"] == 3


# --- Retrieve by classified type (task 4.1-4.3) ---


def test_get_documents_by_type_returns_matching_documents(client, auth_headers, monkeypatch):
    doc_type = f"memo_{uuid.uuid4().hex[:8]}"
    doc = _upload(
        client, auth_headers, monkeypatch, "a.txt", _body(doc_type, "A memo"), _fields_response(doc_type, [])
    )

    response = client.get(f"/document-types/{doc_type}/documents", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    document_ids = {item["id"] for item in body["items"]}
    assert document_ids == {doc["id"]}
    assert body["total"] == 1


def test_get_documents_by_type_empty_for_unused_type(client, auth_headers):
    response = client.get(f"/document-types/{uuid.uuid4().hex}/documents", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_get_documents_by_type_paginated(client, auth_headers, monkeypatch):
    doc_type = f"report_{uuid.uuid4().hex[:8]}"
    for i in range(3):
        _upload(
            client,
            auth_headers,
            monkeypatch,
            f"doc{i}.txt",
            _body(doc_type, f"Report {i}"),
            _fields_response(doc_type, []),
        )

    first_page = client.get(
        f"/document-types/{doc_type}/documents", params={"limit": 2, "offset": 0}, headers=auth_headers
    ).json()
    assert len(first_page["items"]) == 2
    assert first_page["total"] == 3

    second_page = client.get(
        f"/document-types/{doc_type}/documents", params={"limit": 2, "offset": 2}, headers=auth_headers
    ).json()
    assert len(second_page["items"]) == 1
    assert second_page["total"] == 3
