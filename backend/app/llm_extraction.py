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

_REQUIRED_STRING_KEYS = {"field_name", "value", "source_quote"}

# A grounded match that only holds up after whitespace normalization (not an
# exact substring) is capped at this ceiling, regardless of what the model
# reported.
NORMALIZED_ONLY_MATCH_CAP = 0.6

# A grounded match whose source_quote appears at more than one distinct
# location in the document's text is capped at this ceiling.
AMBIGUOUS_LOCATION_CAP = 0.5

# A record's final confidence (after mechanical adjustment) below this value
# is flagged for human review.
CONFIDENCE_THRESHOLD = 0.7


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


def parse_response(raw_response: str) -> list[dict[str, str | float]]:
    """Validate and extract the list of {field_name, value, source_quote,
    confidence} entries from the LLM's raw text response. Raises
    InvalidLLMResponseError on non-JSON input, a response missing the
    required keys, or a missing/non-numeric confidence."""
    try:
        parsed = json.loads(_strip_code_fence(raw_response))
    except json.JSONDecodeError as exc:
        raise InvalidLLMResponseError(f"Response was not valid JSON: {exc}") from exc

    if not isinstance(parsed, dict) or "fields" not in parsed:
        raise InvalidLLMResponseError("Response is missing the required 'fields' key.")

    fields = parsed["fields"]
    if not isinstance(fields, list):
        raise InvalidLLMResponseError("'fields' must be a list.")

    entries: list[dict[str, str | float]] = []
    for entry in fields:
        if not isinstance(entry, dict) or not _REQUIRED_STRING_KEYS.issubset(entry):
            raise InvalidLLMResponseError(
                "Each field entry must have field_name, value, and source_quote."
            )
        confidence = entry.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
            raise InvalidLLMResponseError(
                "Each field entry must have a numeric confidence."
            )
        parsed_entry: dict[str, str | float] = {
            key: str(entry[key]) for key in _REQUIRED_STRING_KEYS
        }
        parsed_entry["confidence"] = float(confidence)
        entries.append(parsed_entry)
    return entries


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def is_grounded(source_quote: str, extracted_text: str) -> bool:
    """Whitespace-normalized substring check: `source_quote` must appear
    verbatim (aside from whitespace differences) in `extracted_text`."""
    if not source_quote:
        return False
    return _normalize(source_quote) in _normalize(extracted_text)


def _cap_for_normalized_only_match(
    source_quote: str, extracted_text: str, confidence: float
) -> float:
    """Cap `confidence` when `source_quote` matched `extracted_text` only
    after whitespace normalization, not as an exact substring. Assumes the
    entry has already passed `is_grounded`. Never raises confidence."""
    if source_quote in extracted_text:
        return confidence
    return min(confidence, NORMALIZED_ONLY_MATCH_CAP)


def _cap_for_ambiguous_location(
    source_quote: str, extracted_text: str, confidence: float
) -> float:
    """Cap `confidence` when `source_quote` corresponds to more than one
    distinct (whitespace-normalized) location in `extracted_text`. Never
    raises confidence."""
    normalized_quote = _normalize(source_quote)
    normalized_text = _normalize(extracted_text)
    if normalized_text.count(normalized_quote) > 1:
        return min(confidence, AMBIGUOUS_LOCATION_CAP)
    return confidence


def compute_confidence(source_quote: str, extracted_text: str, model_confidence: float) -> float:
    """Combine the model-reported confidence with the mechanical caps above
    into a single final confidence value. Only ever lowers the model's
    figure -- the lowest applicable cap wins."""
    confidence = model_confidence
    confidence = _cap_for_normalized_only_match(source_quote, extracted_text, confidence)
    confidence = _cap_for_ambiguous_location(source_quote, extracted_text, confidence)
    return confidence


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
        source_quote = entry["source_quote"]
        if is_grounded(source_quote, extraction.extracted_text):
            confidence = compute_confidence(
                source_quote, extraction.extracted_text, entry["confidence"]
            )
            db.add(
                ExtractionResult(
                    document_id=document.id,
                    field_name=entry["field_name"],
                    field_value=entry["value"],
                    source_quote=source_quote,
                    confidence=confidence,
                    needs_review=confidence < CONFIDENCE_THRESHOLD,
                )
            )

    outcome = LlmExtraction(document_id=document.id, status="succeeded")
    db.add(outcome)
    db.commit()
