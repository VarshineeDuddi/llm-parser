import json
import logging
import uuid

import pytest
from pydantic import ValidationError

from app import llm_client, llm_extraction
from app.config import Settings
from app.llm_extraction import (
    DOCUMENT_TYPE_FIELD_NAME,
    InvalidLLMResponseError,
    is_grounded,
    parse_response,
    run_llm_extraction,
)
from app.llm_client import AnthropicClient
from app.models import Document, DocumentExtraction, ExtractionResult, LlmExtraction


def _make_document(db_session) -> Document:
    document_id = uuid.uuid4()
    document = Document(
        id=document_id,
        original_filename="sample.txt",
        format="txt",
        size_bytes=10,
        storage_key=f"documents/{document_id}",
        status="received",
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


def _make_extraction(db_session, document: Document, extracted_text: str) -> DocumentExtraction:
    extraction = DocumentExtraction(
        document_id=document.id,
        extracted_text=extracted_text,
        status="succeeded",
    )
    db_session.add(extraction)
    db_session.commit()
    db_session.refresh(extraction)
    return extraction


class _FakeResponseContent:
    def __init__(self, text: str) -> None:
        self.text = text


class _FakeMessages:
    def __init__(self, response_text: str) -> None:
        self._response_text = response_text
        self.calls: list[dict] = []
        self.raise_error: Exception | None = None

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.raise_error is not None:
            raise self.raise_error
        return type("FakeResponse", (), {"content": [_FakeResponseContent(self._response_text)]})()


class _FakeAnthropic:
    def __init__(self, response_text: str = '{"fields": []}') -> None:
        self.messages = _FakeMessages(response_text)

    def __call__(self, **kwargs):
        return self


# --- Credential handling (task 1.2) ---


def test_settings_requires_anthropic_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


# --- Anthropic client wrapper (task 1.3, 3.1) ---


def test_client_sends_exactly_the_document_text(monkeypatch):
    fake = _FakeAnthropic('{"fields": []}')
    monkeypatch.setattr(llm_client.anthropic, "Anthropic", lambda **kwargs: fake)

    client = AnthropicClient()
    result = client.extract("this is the document's own text, nothing else")

    assert len(fake.messages.calls) == 1
    call = fake.messages.calls[0]
    assert call["messages"] == [
        {"role": "user", "content": "this is the document's own text, nothing else"}
    ]
    assert result == '{"fields": []}'


def test_client_never_logs_key_text_or_response(monkeypatch, caplog):
    fake = _FakeAnthropic('{"fields": [{"field_name": "x", "value": "y", "source_quote": "z"}]}')
    monkeypatch.setattr(llm_client.anthropic, "Anthropic", lambda **kwargs: fake)

    client = AnthropicClient()
    with caplog.at_level(logging.DEBUG):
        result = client.extract("secret document content that must never be logged")

    log_text = caplog.text
    assert "secret document content that must never be logged" not in log_text
    assert result not in log_text


# --- Data model shape (task 2.1, 2.2) ---


def test_extraction_result_has_no_document_type_specific_columns():
    columns = {c.name for c in ExtractionResult.__table__.columns}
    assert columns == {
        "id",
        "document_id",
        "field_name",
        "field_value",
        "source_quote",
        "created_at",
    }


def test_llm_extraction_outcome_independent_of_text_extraction_status(db_session):
    document = _make_document(db_session)
    text_extraction = _make_extraction(db_session, document, "some text")

    llm_outcome = LlmExtraction(document_id=document.id, status="failed", failure_reason="boom")
    db_session.add(llm_outcome)
    db_session.commit()
    db_session.refresh(text_extraction)

    assert text_extraction.status == "succeeded"
    assert llm_outcome.status == "failed"


# --- Response parsing (task 3.2) ---


def test_parse_response_valid():
    raw = json.dumps(
        {
            "fields": [
                {"field_name": "_document_type", "value": "invoice", "source_quote": "INVOICE"},
                {"field_name": "total", "value": "$42", "source_quote": "Total: $42"},
            ]
        }
    )
    entries = parse_response(raw)
    assert len(entries) == 2
    assert entries[0]["field_name"] == "_document_type"


def test_parse_response_non_json_raises():
    with pytest.raises(InvalidLLMResponseError):
        parse_response("not json at all")


def test_parse_response_missing_required_keys_raises():
    raw = json.dumps({"fields": [{"field_name": "total", "value": "$42"}]})
    with pytest.raises(InvalidLLMResponseError):
        parse_response(raw)


def test_parse_response_missing_fields_key_raises():
    with pytest.raises(InvalidLLMResponseError):
        parse_response(json.dumps({"other": []}))


def test_parse_response_unwraps_markdown_code_fence():
    payload = {"fields": [{"field_name": "_document_type", "value": "memo", "source_quote": "x"}]}
    fenced = f"```json\n{json.dumps(payload)}\n```"
    entries = parse_response(fenced)
    assert entries[0]["field_name"] == "_document_type"


def test_parse_response_still_rejects_genuinely_non_json_inside_fence():
    with pytest.raises(InvalidLLMResponseError):
        parse_response("```\nthis is not json\n```")


# --- Grounding enforcement (task 4.1) ---


def test_is_grounded_exact_match():
    assert is_grounded("Total: $42", "Invoice\nTotal: $42\nThank you") is True


def test_is_grounded_whitespace_normalized_match():
    assert is_grounded("Total:   $42", "Invoice\nTotal: $42\nThank you") is True


def test_is_grounded_paraphrase_does_not_match():
    assert is_grounded("the total amount due is forty two dollars", "Total: $42") is False


# --- Grounding wired into persistence (task 4.2, 4.3) ---


def test_run_llm_extraction_persists_only_grounded_entries(db_session, monkeypatch):
    document = _make_document(db_session)
    extraction = _make_extraction(db_session, document, "INVOICE\nTotal: $42\nThank you")

    raw_response = json.dumps(
        {
            "fields": [
                {"field_name": "_document_type", "value": "invoice", "source_quote": "INVOICE"},
                {"field_name": "total", "value": "$42", "source_quote": "Total: $42"},
                {
                    "field_name": "fabricated",
                    "value": "made up",
                    "source_quote": "this text does not appear anywhere",
                },
            ]
        }
    )
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)

    run_llm_extraction(document, extraction, db_session)

    results = db_session.query(ExtractionResult).filter_by(document_id=document.id).all()
    field_names = {r.field_name for r in results}
    assert field_names == {"_document_type", "total"}
    assert "fabricated" not in field_names

    document_type_row = next(r for r in results if r.field_name == DOCUMENT_TYPE_FIELD_NAME)
    assert document_type_row.field_value == "invoice"

    outcome = db_session.query(LlmExtraction).filter_by(document_id=document.id).one()
    assert outcome.status == "succeeded"


# --- Orchestration & upload integration (task 5.1-5.4) ---


def test_run_llm_extraction_succeeded_outcome_for_valid_response(db_session, monkeypatch):
    document = _make_document(db_session)
    extraction = _make_extraction(db_session, document, "Some document text")
    raw_response = json.dumps(
        {"fields": [{"field_name": "_document_type", "value": "memo", "source_quote": "Some"}]}
    )
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)

    run_llm_extraction(document, extraction, db_session)

    outcome = db_session.query(LlmExtraction).filter_by(document_id=document.id).one()
    assert outcome.status == "succeeded"
    assert outcome.failure_reason is None


def test_run_llm_extraction_captures_client_exception_as_failed(db_session, monkeypatch):
    document = _make_document(db_session)
    extraction = _make_extraction(db_session, document, "Some document text")

    def _boom(text: str) -> str:
        raise RuntimeError("network timeout")

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _boom)

    run_llm_extraction(document, extraction, db_session)

    outcome = db_session.query(LlmExtraction).filter_by(document_id=document.id).one()
    assert outcome.status == "failed"
    assert "network timeout" in outcome.failure_reason
    results = db_session.query(ExtractionResult).filter_by(document_id=document.id).all()
    assert results == []


def test_run_llm_extraction_captures_malformed_response_as_failed(db_session, monkeypatch):
    document = _make_document(db_session)
    extraction = _make_extraction(db_session, document, "Some document text")
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: "not json")

    run_llm_extraction(document, extraction, db_session)

    outcome = db_session.query(LlmExtraction).filter_by(document_id=document.id).one()
    assert outcome.status == "failed"


def test_llm_extraction_failure_for_one_document_does_not_affect_another(db_session, monkeypatch):
    failing_document = _make_document(db_session)
    failing_extraction = _make_extraction(db_session, failing_document, "Doc A text")
    ok_document = _make_document(db_session)
    ok_extraction = _make_extraction(db_session, ok_document, "Doc B text")

    def _extract(text: str) -> str:
        if text == "Doc A text":
            raise RuntimeError("boom")
        return json.dumps(
            {"fields": [{"field_name": "_document_type", "value": "memo", "source_quote": "Doc"}]}
        )

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _extract)

    run_llm_extraction(failing_document, failing_extraction, db_session)
    run_llm_extraction(ok_document, ok_extraction, db_session)

    failing_outcome = db_session.query(LlmExtraction).filter_by(document_id=failing_document.id).one()
    ok_outcome = db_session.query(LlmExtraction).filter_by(document_id=ok_document.id).one()

    assert failing_outcome.status == "failed"
    assert ok_outcome.status == "succeeded"
    assert failing_document.status == "received"
    assert failing_extraction.status == "succeeded"


def test_upload_triggers_llm_extraction_when_text_extraction_succeeds(client, db_session, monkeypatch):
    raw_response = json.dumps(
        {"fields": [{"field_name": "_document_type", "value": "note", "source_quote": "hello"}]}
    )
    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", lambda text: raw_response)

    response = client.post(
        "/documents/upload",
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 201
    document_id = uuid.UUID(response.json()["id"])

    outcome = db_session.query(LlmExtraction).filter_by(document_id=document_id).one_or_none()
    assert outcome is not None
    assert outcome.status == "succeeded"


def test_upload_does_not_trigger_llm_extraction_when_text_extraction_fails(client, db_session, monkeypatch):
    called = {"count": 0}

    def _extract(text: str) -> str:
        called["count"] += 1
        return json.dumps({"fields": []})

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _extract)

    import io

    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    blank_pdf = buffer.getvalue()

    response = client.post(
        "/documents/upload",
        files={"file": ("scanned.pdf", blank_pdf, "application/pdf")},
    )
    assert response.status_code == 201
    document_id = uuid.UUID(response.json()["id"])

    assert called["count"] == 0
    outcome = db_session.query(LlmExtraction).filter_by(document_id=document_id).one_or_none()
    assert outcome is None


# --- Free-form extraction, no predefined field list (spec: Free-Form Field Extraction) ---


def test_different_documents_produce_different_field_sets(db_session, monkeypatch):
    doc_a = _make_document(db_session)
    extraction_a = _make_extraction(db_session, doc_a, "Invoice total: $42")
    doc_b = _make_document(db_session)
    extraction_b = _make_extraction(db_session, doc_b, "Meeting notes: discussed budget")

    def _extract(text: str) -> str:
        if "Invoice" in text:
            return json.dumps(
                {
                    "fields": [
                        {"field_name": "_document_type", "value": "invoice", "source_quote": "Invoice"},
                        {"field_name": "total", "value": "$42", "source_quote": "total: $42"},
                    ]
                }
            )
        return json.dumps(
            {
                "fields": [
                    {"field_name": "_document_type", "value": "memo", "source_quote": "Meeting notes"},
                    {"field_name": "topic", "value": "budget", "source_quote": "discussed budget"},
                ]
            }
        )

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _extract)

    run_llm_extraction(doc_a, extraction_a, db_session)
    run_llm_extraction(doc_b, extraction_b, db_session)

    fields_a = {r.field_name for r in db_session.query(ExtractionResult).filter_by(document_id=doc_a.id)}
    fields_b = {r.field_name for r in db_session.query(ExtractionResult).filter_by(document_id=doc_b.id)}

    assert fields_a == {"_document_type", "total"}
    assert fields_b == {"_document_type", "topic"}


# --- Documenting test: no duplicate-skip yet (test-strategy.md; deferred until 1.3 merges) ---


def test_llm_extraction_runs_for_every_successful_text_extraction_no_duplicate_skip_yet(
    client, db_session, monkeypatch
):
    raw_response = json.dumps(
        {"fields": [{"field_name": "_document_type", "value": "note", "source_quote": "identical"}]}
    )
    calls = []

    def _extract(text: str) -> str:
        calls.append(text)
        return raw_response

    monkeypatch.setattr(llm_extraction.anthropic_client, "extract", _extract)

    first = client.post(
        "/documents/upload",
        files={"file": ("a.txt", b"identical content", "text/plain")},
    )
    second = client.post(
        "/documents/upload",
        files={"file": ("b.txt", b"identical content", "text/plain")},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    # No duplicate-skip exists yet (1.3 not merged): the LLM is called once
    # per document, even for identical content.
    assert len(calls) == 2

    for response in (first, second):
        document_id = uuid.UUID(response.json()["id"])
        outcome = db_session.query(LlmExtraction).filter_by(document_id=document_id).one()
        assert outcome.status == "succeeded"
