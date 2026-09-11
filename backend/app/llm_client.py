"""Thin wrapper over the Anthropic SDK. Sends a document's extracted text
for classification/extraction and returns the model's raw text response --
no business logic here. Never logs the API key, the document text sent, or
the raw response, per the project's data policy."""

import anthropic

from app.config import settings

_MODEL = "claude-sonnet-4-5"

_SYSTEM_PROMPT = (
    "You classify a document's type and extract every fact present in its "
    "text as field/value pairs. Respond with ONLY a single JSON object of "
    "this exact shape, no other text:\n"
    '{"fields": [{"field_name": string, "value": string, "source_quote": string}]}\n'
    "Do not rely on any fixed or predefined set of fields -- extract "
    "whatever facts are actually present in the document's text, and only "
    "those. Include exactly one entry with field_name \"_document_type\" "
    "giving your classification of the document's type. Every "
    "source_quote must be an exact, verbatim substring copied from the "
    "provided document text -- never paraphrase or summarize it. If a "
    "candidate value or classification cannot be tied to a specific, "
    "quotable substring of the document, omit that entry entirely rather "
    "than guessing."
)


class AnthropicClient:
    def __init__(self) -> None:
        self._client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url or None,
        )

    def extract(self, document_text: str) -> str:
        """Send `document_text` to the LLM and return its raw text response."""
        response = self._client.messages.create(
            model=_MODEL,
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": document_text}],
        )
        return response.content[0].text


anthropic_client = AnthropicClient()
