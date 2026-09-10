## Why

The Document Parser MVP has no way to get a document into the system yet.
Before any extraction can happen, users need to upload a document from
their local machine and have the system accept, validate, and durably
store it. This is Zoho Sprints story **1.1 Local Upload & Format Support
(PDF/DOCX/PPTX/TXT)** (item `57591000000023013`) under epic **Document
Ingestion & Duplicate Detection** (`57591000000023001`) in the Document
Parser (MVP) project, and is the first story in that epic — it unblocks
text extraction (1.2) and duplicate detection (1.3), which both depend on
a document existing in storage first.

BRD source: no standalone `docs/BRD.md` exists in this repo yet; the
business requirement referenced is the MVP product description captured
in `openspec/config.yaml`'s `context` block (local upload only, free-form
LLM extraction, field-level storage model).

## What Changes

- Add a document upload capability: users submit a file from their local
  machine (PDF, DOCX, PPTX, or TXT) through the API.
- Validate the uploaded file's format against the supported list before
  accepting it; reject unsupported formats and empty files with a clear
  error.
- Persist the source file to S3-compatible object storage.
- Create a document metadata record (filename, format, size, storage
  location, upload timestamp, status) in PostgreSQL — one row per
  uploaded document, independent of document type.
- Add a minimal upload UI (React/MUI) that lets a user pick a local file
  and see the upload result (accepted, or rejected with a reason).
- Out of scope for this story (covered by later stories in the same
  epic): text extraction from the uploaded file (1.2) and duplicate
  detection by content (1.3). This story only gets the file in and
  recorded — it does not read or interpret its contents.

## Capabilities

### New Capabilities
- `document-ingestion`: accepting a local file upload, validating its
  format, storing the source file, and recording document metadata.

### Modified Capabilities
- None. This is the first capability in the repository; no existing
  specs exist to modify.

## Impact

- **Backend**: new FastAPI upload endpoint, Pydantic request/response
  models, SQLAlchemy `Document` model + Alembic migration, S3-compatible
  storage client wrapper.
- **Frontend**: new upload page/component (React + TypeScript + MUI)
  calling the upload endpoint.
- **Data**: introduces the first PostgreSQL table for document metadata.
  Shape must stay generic (no document-type-specific columns), per the
  hard constraint that the storage model must support future
  template-driven extraction.
- **Storage**: first wiring of the S3-compatible object storage
  dependency (bucket/credentials configuration, upload path).
- **Dependencies**: none on other in-flight changes — this is the
  foundation the rest of the ingestion epic (1.2, 1.3) builds on.

**Schema classification note**: this story introduces the first document
data model and the first S3-compatible storage integration, both listed
in `config.yaml` as parser-sensitive triggers. After discussion, this was
judged foundational MVP plumbing rather than a risk-bearing change (no
credentials/auth handling, no sensitive data beyond the document content
itself, storage shape intentionally kept generic) and kept on
parser-standard. Flagging here so a reviewer can override that judgment.

## Rollback

Revert the migration that adds the document metadata table, remove the
upload endpoint and frontend upload page, and stop writing to the
S3-compatible bucket. No other capability depends on this one yet, so
rollback does not cascade.
