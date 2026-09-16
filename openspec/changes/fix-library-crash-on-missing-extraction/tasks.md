## 1. Fix

- [ ] 1.1 Change `_document_out()` to use `.scalar_one_or_none()` and, when `None`, build a `DocumentOut` with `extraction_status = "unknown"` and a fixed explanatory `extraction_failure_reason` instead of raising, and verify a unit test confirms it returns a valid `DocumentOut` (not an exception) for a document with no matching `DocumentExtraction` row (spec: Reading a document whose extraction outcome is unavailable)

## 2. Regression Coverage Per Endpoint

- [ ] 2.1 Add an integration test seeding a document with no `DocumentExtraction` row and confirming `GET /documents/{id}` returns 200 with the unknown state, not a 500
- [ ] 2.2 Add an integration test seeding two documents (one normal, one with no extraction row) and confirming `GET /documents` returns both — the normal one unaffected, the broken one showing the unknown state — not a 500 for the whole page (spec: One document's unavailable extraction outcome does not affect others in a list)
- [ ] 2.3 Confirm via a test that `POST /documents/upload`'s own response path is unaffected by this change for the normal (extraction row present) case — a regression check, not new behavior

## 3. Test Coverage & Verification

- [ ] 3.1 Add backend tests covering every scenario in the modified specs/document-ingestion/spec.md delta and verify the full suite passes
- [ ] 3.2 Manually verify: seed a document with no `DocumentExtraction` row directly in the database alongside normal documents, load the Document Library page, and confirm it renders all documents (including the broken one showing an unknown/unavailable extraction state) instead of a blank error page
