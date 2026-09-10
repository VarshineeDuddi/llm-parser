## Context

No application code exists yet (see [README.md](../../../README.md)) —
this design establishes the first backend/frontend slice: a FastAPI
service backed by PostgreSQL and S3-compatible storage, and a React
frontend. See proposal.md - Why for motivation and specs/document-ingestion/spec.md
for the behavior contract this design must satisfy.

## Goals / Non-Goals

**Goals:**
- Stand up the minimal FastAPI + SQLAlchemy + Alembic + S3-client
  backend structure this and future stories in the ingestion epic will
  build on.
- Accept an uploaded file, validate its format, store it, and record
  metadata, matching the spec's requirements exactly.
- Keep the document metadata table generic enough that later stories
  (text extraction, duplicate detection, field-level extraction storage)
  extend it without reshaping it per document type.

**Non-Goals:**
- Reading or interpreting file contents (text extraction is story 1.2).
- Detecting duplicate documents (story 1.3).
- Authentication/authorization on the upload endpoint — deferred until
  an access-control story exists (epic 4, "Access Scoping for Extraction
  Results" is a later, separate story).
- Background/async upload processing — parsing and upload handling stay
  synchronous per the deployment context, until volume/latency demands
  otherwise.

## Decisions

**Format validation by content-sniffing, not just file extension.**
Rely on a magic-byte/content-type check (e.g. via `python-magic` or
equivalent) in addition to the filename extension, so a mislabeled file
(e.g. a `.txt` extension on binary content) is still rejected. Extension
alone is trivially wrong; content-sniffing is cheap and matches the
spec's "detected format" language.

**Document metadata table is a single generic table.**
One `documents` table: `id`, `original_filename`, `format`, `size_bytes`,
`storage_key`, `status`, `created_at`. No per-format columns or subtype
tables. This directly satisfies the hard constraint that storage shape
must not vary by document type and must stay compatible with the future
template-driven extraction capability — a wide/EAV-style
`document_fields` table (field-level key/value records) is introduced in
a later story (epic 3, "Field-Level Extraction Storage & Query") and is
intentionally out of scope here; this table only tracks the source file
itself.

**Storage key derived from a generated document ID, not the original
filename.**
Alternative considered: store using the original filename. Rejected —
collisions across uploads and unsafe characters in user-supplied
filenames make this fragile. The generated primary key (or a UUID) is
used as the object key; the original filename is preserved only as
metadata for display purposes.

**Synchronous request/response for upload.**
The file is validated and written to storage within the request/response
cycle. Matches the deployment context ("parsing is synchronous
initially"); upload is small/fast enough that this holds even more
easily than parsing does. Revisit if file sizes or storage latency make
this a problem.

**Hard constraint confirmation:**
- *Grounding*: not applicable to this story — no extraction or LLM call
  happens here; nothing is asserted about document content yet.
- *Field-level storage model*: confirmed. This story does not create any
  field-value storage; it only adds the source-file metadata table
  described above, which is deliberately kept separate from and
  compatible with the field-level model planned for epic 3.

## Risks / Trade-offs

- **[Risk]** Large file uploads could block a request thread for a
  noticeable time under synchronous handling. → **Mitigation**: enforce
  a maximum upload size at the API layer; revisit synchronous handling
  if real usage shows this is a bottleneck.
- **[Risk]** Content-sniffing libraries can misidentify some valid files
  (e.g. an unusual PDF variant). → **Mitigation**: validate against both
  extension and sniffed content type; only reject when both disagree
  with all supported formats, and surface a clear rejection reason so a
  false rejection is easy to diagnose and report.
- **[Risk]** No auth on the upload endpoint for this MVP slice means
  anyone with network access to the API can upload. → **Mitigation**:
  explicitly deferred per Non-Goals to the access-scoping epic; flagged
  here so it isn't forgotten, not silently accepted as a permanent gap.

## Concerns

- The lack of authentication on this first endpoint is a real gap for
  anything beyond local MVP development. It's deferred deliberately
  (tracked under epic "Access Scoping for Extraction Results"), but
  should not be implicitly carried into a staging/production deployment
  without that story landing first.
