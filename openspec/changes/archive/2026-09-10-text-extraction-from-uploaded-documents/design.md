## Context

See proposal.md - Why. The relevant current state: `document-ingestion`
(1.1) already validates format, stores the source file in S3-compatible
object storage, and creates a `Document` metadata record (filename,
format, size, storage location, upload timestamp, "received" status) in
PostgreSQL. That record structure is format-agnostic and this change must
not vary it by document type. Parsing is synchronous for the MVP per
`config.yaml`; background processing is deferred until volume/latency
demonstrate the need.

## Goals / Non-Goals

**Goals:**
- Extract text-layer content from an accepted document's stored file for
  PDF, DOCX, PPTX, and TXT, immediately after upload.
- Persist extracted text per document, retrievable by document ID.
- Track extraction outcome (succeeded/failed + reason) per document,
  independent of the document's "received" status.

**Non-Goals:**
- OCR or any handling of scanned/image-only documents.
- Any LLM-based field/value extraction from the text (later story).
- Asynchronous/background extraction (revisit only if synchronous
  extraction becomes a measured latency problem).
- Re-extraction/retry workflows beyond a single attempt at upload time.

## Decisions

**1. Extraction runs inline in the upload request, not a separate
endpoint or job.**
After the upload handler creates the `Document` record, it calls the
extraction service synchronously, before returning the response. The
upload response is extended to include extraction outcome, so the
frontend shows both in one round trip.
- Alternative considered: a separate "trigger extraction" endpoint called
  by the frontend after upload. Rejected for the MVP — it adds a second
  round trip and a client-side orchestration step for no benefit while
  extraction is fast, local, synchronous parsing (no network calls).
- Alternative considered: background job/queue. Rejected per
  `config.yaml`'s deployment guidance — introduce background processing
  only when volume or latency demonstrates the need; there's no such
  evidence yet.

**2. Extraction outcome and text are stored in a new table, not on the
existing `Document` table.**
A new `document_extractions` table (one row per document, unique FK to
`document.id`) holds `extracted_text`, `status`
(`succeeded`/`failed`), `failure_reason`, and `extracted_at`.
- Alternative considered: add `extracted_text`/`extraction_status`
  columns directly to `Document`. Rejected — it couples an unrelated
  capability's data directly into the upload capability's table,
  contradicts "preserve existing architecture unless a change is
  justified" (1.1's table doesn't need to change to support this), and
  is harder to extend later (e.g. tracking multiple extraction attempts)
  without further widening the `Document` table.
- This keeps `document-ingestion`'s table shape untouched, matching the
  proposal's determination that no existing requirement changes.

**3. Format-specific extraction libraries: `pypdf` (PDF), `python-docx`
(DOCX), `python-pptx` (PPTX), direct read with UTF-8 (fallback
latin-1) decoding (TXT).**
- PDF: `pypdf` over `pdfplumber` — sufficient for text-layer extraction
  (no layout/table fidelity needed for raw text), pure-Python, smaller
  dependency footprint. Revisit if a later story needs layout-aware
  extraction.
- DOCX/PPTX: `python-docx`/`python-pptx` are the standard libraries for
  these formats and read text from paragraphs/runs (DOCX) and slide
  shapes (PPTX).
- "No text layer" is detected when extraction yields no non-whitespace
  text — that document is marked failed per the spec's "Document has no
  extractable text layer" scenario, not silently recorded as empty
  success.

## Hard constraints confirmation

- **Grounded in source document**: extracted text is verbatim content
  read from the document's own text layer — no inference or LLM
  involvement at this stage, so there is nothing ungrounded to guard
  against here. The constraint becomes relevant to the future field-
  extraction story that consumes this text.
- **Field-level key/value storage model**: does not apply to this
  change — there are no fields/values yet, only raw document text. The
  new `document_extractions` table stores one row of full text per
  document and does not introduce or foreclose the field-level table the
  future extraction story will need; that story will read from this
  table's `extracted_text` rather than from any per-field structure.

## Risks / Trade-offs

- [Large documents slow the synchronous upload response] → Acceptable
  for MVP scope (text-layer parsing is fast relative to network/storage
  I/O already in the request); move extraction off the request path only
  if measured latency requires it, per deployment guidance.
- [PDF text-layer detection heuristic (no non-whitespace text) could
  misclassify an unusual PDF] → Failure is explicit and recorded with a
  reason rather than silently producing empty/wrong text; a human can
  inspect and a later story can improve detection without changing the
  spec's observable contract.
- [`pypdf` extraction quality varies by PDF producer] → Acceptable for
  MVP; the spec only requires extracting text that is present in the
  text layer, not perfect fidelity.

## Migration Plan

- Add an Alembic migration creating `document_extractions` (FK to
  `document.id`, unique constraint on `document_id`).
- No changes to the existing `document` table or its migration history.
- Rollback: drop the `document_extractions` table via a down-migration;
  remove the extraction call from the upload handler. No impact on
  already-stored documents or the upload capability, per proposal.md -
  Rollback.
