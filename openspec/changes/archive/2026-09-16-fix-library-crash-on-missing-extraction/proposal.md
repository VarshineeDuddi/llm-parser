## Why

The Document Library page returns a 500 and shows no documents at all
when even one document owned by the caller has no matching
`DocumentExtraction` row — a single bad row takes down the entire list,
not just that one document. This is a defect reported directly by the
user, not a Zoho Sprints story; no corresponding Sprints item exists,
and none is invented here.

Root cause, confirmed by reading the code (not assumed): the shared
`_document_out()` helper in `backend/app/routers/documents.py` calls
`.scalar_one()` when looking up a document's extraction row. That raises
an unhandled `NoResultFound` if the row doesn't exist, which FastAPI
surfaces as an unhandled 500. `list_documents()` builds its whole page
through a list comprehension over this helper
(`[_document_out(document, db) for document in documents]`), so one
document missing its extraction row fails the entire request — not an
isolated failure for that document.

How a document ends up without an extraction row: `run_extraction()`
(1.2) is designed to always create one, including on failure, but the
`Document` commit and the `DocumentExtraction` commit
(`backend/app/extraction.py`) are two separate transactions, not one. A
crash, restart, or connection drop between them — or any pre-existing
orphaned row — leaves exactly this gap. This proposal does not attempt
to close that write-path race (see Impact); it makes the read path
correct regardless of why the row is missing.

## What Changes

- Fix `_document_out()` to look up a document's extraction row without
  raising when it's absent, and represent that case as an explicit,
  observable state (an `"unknown"` extraction status with an explanatory
  reason) rather than crashing.
- This helper is shared by four endpoints — `GET /documents` (list),
  `GET /documents/{id}`, and the response `POST /documents/upload`
  returns — so the fix applies uniformly; the bug report specifically
  named the list endpoint because that's where the blast radius is
  worst (one bad row hides every document on the page, not just itself).
- A document in this state continues to appear normally everywhere else
  (document detail, field queries are unaffected — they don't go through
  `_document_out` or don't depend on the extraction row existing).
- Out of scope for this change: closing the write-path race that can
  produce an orphaned document in the first place (see Impact) — that's
  a separate reliability question, not required to fix the reported
  symptom, which is about the read path crashing rather than degrading
  gracefully.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `document-ingestion`: the "Document Metadata Record" requirement is
  extended to define what a document's metadata record shows when its
  extraction outcome is unavailable, rather than leaving that case
  undefined (which is exactly what let the bug happen unnoticed).

## Impact

- **Backend**: `_document_out()` in `backend/app/routers/documents.py`
  changed to use `.scalar_one_or_none()` and handle the `None` case;
  affects all four call sites (list, get-by-id, upload response) that
  currently crash on this input, none of which have any other change.
- **Data**: none — no schema change. This is a defensive read-path fix,
  not a write-path or migration change.
- **Frontend**: none required by this fix — `DocumentOut.extraction_status`
  is already a plain string field (5.7's status-chip formatting maps
  known values; an unrecognized value falls through to displaying the
  raw string, which remains truthful, if unstyled, for this rare case).
- **Not fixed here, flagged for a separate decision**: the write-path
  race that can produce a document with no extraction row at all (see
  Why). A more complete fix would wrap the `Document` and
  `DocumentExtraction` writes in one transaction, or reconcile orphaned
  rows on a schedule/on read. Neither is done here — this change's scope
  is making the read path never crash on data that already exists in
  this shape, for whatever reason.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential. This
is a bug fix to existing, already-approved behavior with a genuine
externally-observable contract change (the API stops 500ing on this
input and returns a defined state instead), which is why it gets a spec
delta rather than being treated as purely internal. Kept on
`parser-standard`.

## Rollback

Revert `_document_out()` to its prior form. No data or schema impact —
the fix only changes how an already-possible database state is
interpreted when read, not what gets written.
