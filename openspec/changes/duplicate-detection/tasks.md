## 1. Data Model

- [ ] 1.1 Add a nullable, indexed `content_hash` column to the `DocumentExtraction` model per design.md and verify the model change does not alter `extracted_text`, `status`, or `failure_reason`
- [ ] 1.2 Add a nullable, self-referential `duplicate_of_id` column (FK to `document.id`) to the `Document` model and verify it does not alter any other existing column
- [ ] 1.3 Generate and apply the Alembic migration for both columns and verify it applies and rolls back cleanly without altering existing `document`/`document_extractions` rows

## 2. Content Hashing

- [ ] 2.1 Implement a content-hash utility that collapses whitespace runs in extracted text and computes a SHA-256 digest, and verify unit tests cover: two texts differing only in whitespace produce the same hash, and two texts with different content produce different hashes
- [ ] 2.2 Compute and persist the content hash on the `DocumentExtraction` row whenever extraction succeeds, and verify an integration test confirms `content_hash` is populated after a successful extraction and left null after a failed one (spec: Duplicate Detection Requires Successful Extraction)

## 3. Duplicate Matching & Status

- [ ] 3.1 Implement a duplicate-lookup query that finds the earliest other document with a matching `content_hash` whose own status is not `duplicate`, and verify a unit test confirms it returns the original when one exists and nothing when the hash is unique or belongs only to a document whose extraction failed
- [ ] 3.2 Wire the duplicate lookup to run synchronously immediately after a successful extraction, before the upload response is returned, and verify an integration test confirms a second upload of matching content is checked within the same request (spec: Duplicate Detection by Content)
- [ ] 3.3 On a match, set the new document's status to `duplicate` and its `duplicate_of_id` to the matched original, and verify a test confirms the original document's own status and `duplicate_of_id` remain unchanged (spec: Original Document Unaffected by Duplicates)
- [ ] 3.4 On no match, leave the document's status and `duplicate_of_id` unchanged from today's behavior, and verify a test confirms a unique upload is unaffected by this story's changes (spec: Upload with unique content)
- [ ] 3.5 Skip duplicate matching entirely for a document whose own extraction failed, and verify a test confirms no hash comparison is attempted and no `duplicate_of_id` is set for such a document (spec: Document with failed extraction is not compared)

## 4. API & Frontend Visibility

- [ ] 4.1 Extend the document status/response model to include duplicate status and the referenced original document's identifier when applicable, and verify a response-contract test covers both the duplicate and non-duplicate shapes (spec: Duplicate Status Visibility)
- [ ] 4.2 Update the existing upload result / document status display to show when a document is a duplicate and link to the original, and verify this manually by uploading the same file twice

## 5. Test Coverage & Verification

- [ ] 5.1 Add backend tests covering every scenario in specs/duplicate-detection/spec.md (duplicate match, unique content, duplicate status visibility, failed-extraction exclusion on both sides, original-document non-interference across multiple duplicates) and verify the full suite passes
- [ ] 5.2 Manually verify end-to-end: upload a file, then upload the same file again (or a re-saved copy with identical text) and confirm the second is recorded as a duplicate of the first, with the original left unaffected
- [ ] 5.3 Verify both hard constraints hold per design.md's confirmation: no fabricated relationships (match is exact hash equality, not inferred), and no field-level record is introduced or altered by this story
