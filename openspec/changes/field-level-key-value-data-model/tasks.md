## 1. Pre-Migration Verification

- [ ] 1.1 Write a query/script identifying any existing `(document_id, field_name)` duplicate pairs in `extraction_results` and verify it runs cleanly against the current database (expected result: none, but must actually check)
- [ ] 1.2 Write a query/script identifying any existing row with a null `confidence` or `needs_review` and verify it runs cleanly against the current database (expected result: none, but must actually check)

## 2. Migration

- [ ] 2.1 Implement the pre-migration cleanup step: for any duplicate `(document_id, field_name)` pair found (task 1.1), keep the highest-confidence row and remove the rest, logging what was removed, and verify a migration test seeded with a deliberate duplicate confirms the correct row survives
- [ ] 2.2 Add the Alembic migration: UNIQUE constraint on `(document_id, field_name)`, index on `field_name`, `confidence`/`needs_review` changed to NOT NULL, and verify it applies and rolls back cleanly against both an empty and a seeded-with-duplicates test database
- [ ] 2.3 Verify the migration does not alter `document`, `document_extractions`, or `llm_extractions`, via a test asserting those tables' columns and data are unaffected

## 3. Persistence-Layer Dedup

- [ ] 3.1 Implement grouping-by-`field_name` logic in `llm_extraction.py`'s insert loop that keeps only the highest-confidence entry per field name before calling `db.add()`, and verify a unit test confirms correct selection when duplicates are present and no change in behavior when they aren't (spec: Same-Extraction Duplicate Fields Are Deduplicated, Not Rejected)
- [ ] 3.2 Verify the extraction outcome (`LlmExtraction.status`) is still recorded as succeeded when a same-run collision was deduplicated — not failed — via an integration test with a mocked Anthropic response containing a collision

## 4. Constraint Enforcement Verification

- [ ] 4.1 Write an integration test that attempts a direct duplicate insert into `extraction_results` bypassing the application's dedup logic, and verify the database itself rejects it (spec: One Record Per Document/Field Pair)
- [ ] 4.2 Write a test confirming the new indexes exist on the table after migration (index-presence check, per test-strategy.md — no query API exists yet to test retrieval behavior against)

## 5. Test Coverage & Verification

- [ ] 5.1 Add backend tests covering every scenario in specs/field-level-storage/spec.md (duplicate rejection, same-run dedup keeping highest confidence, retrievability by document and by field via index presence, storage-shape compatibility confirmation) and verify the full suite passes
- [ ] 5.2 Re-run 2.1's and 2.2's existing test suites (`test_extraction.py`, `test_llm_extraction.py`) unmodified except for the migration being applied, and verify they still pass — confirming this story does not break already-shipped behavior
- [ ] 5.3 Verify both hard constraints hold per design.md's confirmation: attempt to violate "one per document/field pair" directly against the database and confirm it's rejected, and confirm `field_name`/`field_value` remain free-form with no document-type-specific column added
