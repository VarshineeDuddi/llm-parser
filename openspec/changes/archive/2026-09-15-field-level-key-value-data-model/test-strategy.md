## Approach

Follows the existing `backend/tests/` pytest pattern
(`conftest.py` fixtures, one test module per capability — likely
extending `test_llm_extraction.py` for the dedup/persistence behavior,
plus a migration-level test).

- **Unit tests**: the dedup-by-field-name grouping logic (a response
  with two same-named entries of differing confidence; a response with
  no collisions, unaffected) in isolation from the DB.
- **Integration tests**: a real (test) database exercising the actual
  UNIQUE constraint — attempting to insert two `ExtractionResult` rows
  for the same `(document_id, field_name)` directly (bypassing the
  application-level dedup) to confirm the database itself rejects it,
  not just the application code; the full `run_llm_extraction` path with
  a mocked Anthropic response containing a same-field-name collision,
  confirming only the higher-confidence row persists and the extraction
  outcome is still recorded as succeeded (not failed).
- **Migration tests**: the Alembic migration applies and rolls back
  cleanly against a fixture database seeded with (a) no duplicates and
  (b) a deliberately duplicate `(document_id, field_name)` pair, to
  verify the pre-migration cleanup step behaves as designed rather than
  only being tested against the happy path.
- **Manual verification**: none required beyond the automated coverage
  above — this story has no external API or UI surface to exercise
  end-to-end.

## Coverage for flagged concerns

Each Concern captured in review.md's evidence summary gets an explicit
planned test, not just an implementation task:

- **Existing rows might already violate the new uniqueness constraint**
  → Migration test seeds a duplicate pair and asserts the migration's
  pre-check deduplicates (keeping the higher-confidence row) before the
  constraint is applied, rather than the migration failing outright.
- **Same-extraction collisions must be deduplicated, not rejected** →
  Unit test on the grouping logic directly, plus an integration test
  through the full `run_llm_extraction` path (spec: Same-Extraction
  Duplicate Fields Are Deduplicated, Not Rejected).
- **Nullability tightening could fail if an existing row has a null
  value** → Migration test seeds a row with `confidence=None` (simulating
  a hypothetical pre-2.2 row) and confirms the migration's backfill step
  handles it rather than the NOT NULL constraint failing to apply.
- **DB-level enforcement, not just application-level checking** →
  Integration test attempts a direct duplicate insert that bypasses the
  application's dedup logic entirely, confirming the database constraint
  itself is what prevents it (spec: One Record Per Document/Field Pair —
  "enforced by the storage layer itself, not only by caller discipline").
- **Retrieval-by-document and by-field-name must actually use the new
  indexes, not just be logically correct** → Not a behavioral test (no
  query API exists yet to test against, per this story's boundary); a
  lightweight test instead confirms the indexes exist in the schema
  after migration (index-presence check), so a future 3.2 test can build
  on that foundation without re-verifying it.

## Inheritance

Not applicable — see discuss.md and security-privacy.md's Inheritance
sections: this story is the foundational layer 2.1/2.2 already depend
on, not a later cycle of either, so there is no earlier
`test-strategy.md` to inherit an overall approach from. This test
strategy is independently derived for this storage-layer story.
