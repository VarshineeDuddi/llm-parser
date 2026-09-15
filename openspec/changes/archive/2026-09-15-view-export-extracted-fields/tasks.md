## 1. API Client

- [x] 1.1 Add a `getDocumentFields(documentId)` function to `frontend/src/api/documents.ts` calling `GET /documents/{document_id}/fields`, mirroring `uploadDocument`'s existing error-handling pattern, and verify a unit test confirms it parses a successful response into typed field records

## 2. Fields Display

- [x] 2.1 Extend `UploadPage.tsx`'s post-upload flow to fetch fields via `getDocumentFields` after a successful upload and render them in a table/list showing field name, value, and review status, and verify a component test confirms fields render after a mocked successful upload+fetch (spec: Extracted Fields Are Displayed For A Processed Document)
- [x] 2.2 Add a visual distinction (chip/color) for rows where `needs_review` is true, and verify a component test confirms a flagged row is visually distinguishable from an unflagged one in the rendered output (spec: Fields Requiring Review Are Visually Distinguished)
- [x] 2.3 Add an explicit "no fields available" message shown when the fields fetch succeeds but returns an empty list, using the existing `extraction_status`/`extraction_failure_reason` context per design.md Decision 4, and verify a component test confirms the message (not an empty table) renders for each relevant `extraction_status` case (spec: No-Fields State Is Explicit, Not Empty Or Broken)

## 3. CSV Export

- [x] 3.1 Implement a client-side CSV-generation function taking the fetched field records and producing a CSV string (field name, value, confidence, needs-review) and verify a unit test confirms correct CSV output including a value containing a comma or quote (proper escaping)
- [x] 3.2 Wire an "Export" button to trigger a browser download of the generated CSV via a Blob/object URL, shown only when at least one field is displayed, and verify a component test confirms the button is present when fields exist and absent when the no-fields state is shown (spec: Displayed Fields Can Be Exported As A File)

## 4. Test Coverage & Verification

- [x] 4.1 Add frontend tests covering every scenario in specs/field-level-view/spec.md and verify the full suite passes
- [ ] 4.2 Manually verify in a real browser (per design.md's Risks note on sandboxed test environments): upload a document, confirm fields display with at least one flagged field visually distinguished, and confirm the Export button downloads a CSV file with the expected columns and values
- [x] 4.3 Manually verify the no-fields state end-to-end: upload a document whose extraction fails (or a document type with no groundable content) and confirm the explicit message appears instead of an empty table
