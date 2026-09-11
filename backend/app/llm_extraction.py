"""LLM-based document classification and free-form field extraction.
Sends a document's already-extracted text to the Anthropic LLM, verifies
every candidate field is grounded in that text before persisting it, and
tracks the LLM extraction outcome independently of text-extraction's own
outcome. Never invoked for a document whose text extraction failed."""

import json
import re

from sqlalchemy.orm import Session

from app.llm_client import anthropic_client
from app.models import Document, DocumentExtraction, ExtractionResult, LlmExtraction

DOCUMENT_TYPE_FIELD_NAME = "_document_type"

_REQUIRED_ENTRY_KEYS = {"field_name", "value", "source_quote"}


class InvalidLLMResponseError(Exception):
    """Raised when the LLM's response is not valid JSON, or is missing the
    required shape."""


_FENCED_JSON = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


def _strip_code_fence(text: str) -> str:
    """Models often wrap requested JSON in a markdown code fence despite
    being told not to. Unwrap that -- but only that -- before parsing;
    anything else non-JSON still fails validation below."""
    match = _FENCED_JSON.match(text.strip())
    return match.group(1) if match else text


def parse_response(raw_response: str) -> list[dict[str, str]]:
    """Validate and extract the list of {field_name, value, source_quote}
    entries from the LLM's raw text response. Raises InvalidLLMResponseError
    on non-JSON input or a response missing the required keys."""
    try:
        parsed = json.loads(_strip_code_fence(raw_response))
    except json.JSONDecodeError as exc:
        raise InvalidLLMResponseError(f"Response was not valid JSON: {exc}") from exc

    if not isinstance(parsed, dict) or "fields" not in parsed:
        raise InvalidLLMResponseError("Response is missing the required 'fields' key.")

    fields = parsed["fields"]
    if not isinstance(fields, list):
        raise InvalidLLMResponseError("'fields' must be a list.")

    entries = []
    for entry in fields:
        if not isinstance(entry, dict) or not _REQUIRED_ENTRY_KEYS.issubset(entry):
            raise InvalidLLMResponseError(
                "Each field entry must have field_name, value, and source_quote."
            )
        entries.append({key: str(entry[key]) for key in _REQUIRED_ENTRY_KEYS})
    return entries


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def is_grounded(source_quote: str, extracted_text: str) -> bool:
    """Whitespace-normalized substring check: `source_quote` must appear
    verbatim (aside from whitespace differences) in `extracted_text`."""
    if not source_quote:
        return False
    return _normalize(source_quote) in _normalize(extracted_text)


def run_llm_extraction(document: Document, extraction: DocumentExtraction, db: Session) -> None:
    """Classify and extract fields for `document` via the LLM, persisting
    only grounded entries as ExtractionResult rows, plus the outcome. Any
    failure -- a client exception, or a response that fails to parse -- is
    captured as a failed outcome with a reason rather than propagated, so it
    cannot affect this document's existing records or any other document's
    LLM extraction. Only call this when `extraction.status == "succeeded"`."""
    try:
        raw_response = anthropic_client.extract(extraction.extracted_text)
        entries = parse_response(raw_response)
    except Exception as exc:  # noqa: BLE001 - any client/parse failure must be captured, not propagated
        outcome = LlmExtraction(
            document_id=document.id,
            status="failed",
            failure_reason=f"LLM extraction failed: {exc}",
        )
        db.add(outcome)
        db.commit()
        return

    for entry in entries:
        if is_grounded(entry["source_quote"], extraction.extracted_text):
            db.add(
                ExtractionResult(
                    document_id=document.id,
                    field_name=entry["field_name"],
                    field_value=entry["value"],
                    source_quote=entry["source_quote"],
                )
            )

    outcome = LlmExtraction(document_id=document.id, status="succeeded")
    db.add(outcome)
    db.commit()
