## Context

See proposal.md - Why. Relevant current state (from the actual code,
`backend/app/models.py` and `llm_extraction.py`): `ExtractionResult`
(`extraction_results` table) has `id`, `document_id` (FK, no explicit
index), `field_name`, `field_value`, `source_quote`, `created_at`,
`confidence` (nullable float), `needs_review` (nullable bool, default
False) — no uniqueness constraint on `(document_id, field_name)`.
`run_llm_extraction` loops over parsed, grounded entries and calls
`db.add()` per entry, with a single `db.commit()` at the end; nothing in
that loop currently checks for or handles a same-`field_name` collision
within one extraction run. `confidence`/`needs_review` are, in practice,
always set by that same loop — nullability in the schema is looser than
the actual invariant.

## Goals / Non-Goals

**Goals:**
- Make "one record per document/field pair" a DB-enforced guarantee.
- Define and implement what happens when one extraction run would
  otherwise violate that guarantee (same field name, multiple grounded
  candidates).
- Add indexes supporting retrieval by document and by field name, ahead
  of 3.2 needing them.
- Tighten `confidence`/`needs_review` to NOT NULL, matching actual usage.

**Non-Goals:**
- Any query/retrieval API (3.2) — indexes are added now so 3.2 doesn't
  have to touch the schema, but no endpoint or service method is added
  here.
- Any UI (3.3).
- Changing grounding, confidence computation, or the LLM prompt/response
  handling (2.1/2.2's logic) — only how results already computed get
  persisted.
- A new table or migrating existing rows into a different shape —
  explicitly rejected by the user in favor of extending
  `extraction_results` in place.
- Cross-document deduplication (Story 1.3's concern, unrelated to this
  table) or any retry/re-extraction model (no such story exists yet;
  1.2/2.1 already note extraction is single-attempt today).

## Decisions

**1. Extend `extraction_results` in place; no new table, no data
migration.**
Confirmed with the user before drafting (see proposal.md's Approach
note). The rejected alternative (new table + migrate rows) was
considered and explicitly declined — extending in place keeps 2.1/2.2's
already-shipped code and data untouched in shape, at the cost of
inheriting whatever schema decisions were made when the table was
explicitly a placeholder. That trade-off was made consciously, not
assumed.

**2. Uniqueness enforced via a DB-level UNIQUE constraint on
`(document_id, field_name)`, not application-level checking alone.**
Consistent with 2.1's own precedent (grounding enforced mechanically,
not just by prompt instruction) and 2.2's (confidence adjusted
mechanically, not trusted from the model alone): a hard constraint this
central gets a mechanism that can't be bypassed by a future caller
forgetting to check first.
- Alternative considered: enforce uniqueness only in application code
  (check-then-insert). Rejected — race-prone (two concurrent writes for
  the same document could both pass the check before either commits) and
  easier to accidentally bypass from a future code path than a
  constraint the database itself refuses to violate.

**3. Same-extraction collisions are deduplicated (keep highest
confidence), not treated as a hard failure.**
`run_llm_extraction`'s insert loop groups parsed, grounded entries by
`field_name` before insert; for any `field_name` with more than one
entry, only the highest-confidence one is added.
- Alternative considered: let a duplicate-key insert fail and propagate
  as a failed `LlmExtraction` outcome for the whole document. Rejected —
  discarding an entire document's extraction because the model
  duplicated one field name is a disproportionate failure mode; keeping
  the better-grounded/higher-confidence entry for that field and
  persisting everything else normally serves the hard constraint (one
  record per pair) without unnecessary data loss.
- This dedup logic lives in the persistence step within
  `llm_extraction.py`, not in `is_grounded`/`compute_confidence`
  themselves — it's a property of how results get written, not of how
  an individual entry is evaluated. Framed as part of this story's
  storage-layer scope, not a change to 2.1/2.2's extraction logic.

**4. Two indexes added: the UNIQUE constraint's own composite index
(covers document-scoped lookups via its `document_id` prefix), plus a
standalone index on `field_name` (for cross-document, by-field lookups
3.2 will need).**
- Alternative considered: a single composite index only. Rejected — a
  composite `(document_id, field_name)` index does not efficiently serve
  a "all records with this field_name across documents" query pattern
  (`field_name` isn't the leading column), which 3.2's "by field" access
  pattern explicitly needs per the epic split entry.

**5. `confidence` and `needs_review` tightened to NOT NULL, with a
migration that first verifies no existing row has either as NULL.**
If verification finds any (there shouldn't be any, per current code
always setting both), the migration backfills before adding the
constraint rather than silently failing.
- Alternative considered: leave both nullable indefinitely. Rejected —
  nullable columns that are, in practice, never actually null invite a
  future caller to write defensive-but-wrong code around a possibility
  that shouldn't exist; tightening the schema to match reality is
  low-risk here since the invariant already holds.

## Hard constraints confirmation

- **Field-level key/value storage model, one per document/field pair**:
  this story is the direct mechanical enforcement of that clause — a DB
  constraint, not convention. Previously nothing prevented a duplicate;
  after this change, nothing can create one.
- **Storage model must remain compatible with the planned future
  template-driven extraction capability**: unchanged and reaffirmed —
  `field_name`/`field_value` remain free-form strings with no
  document-type-specific column or table; a future template only
  constrains which `field_name` values are expected upstream, not this
  table's shape (see specs/field-level-storage/spec.md's compatibility
  requirement).

## Risks / Trade-offs

- [Existing rows might already violate the new uniqueness constraint]
  → Mitigated by a pre-migration verification step (query for duplicate
  `(document_id, field_name)` pairs before adding the constraint); if
  found, the migration keeps the highest-confidence row per pair and
  removes the rest, logged for visibility, rather than failing silently
  or blocking indefinitely.
- [Inheriting `extraction_results`' placeholder-era column choices
  (e.g., `field_value`/`source_quote` as unconstrained `Text`) rather
  than redesigning them] → Accepted trade-off of the "extend in place"
  decision; nothing about this story's scope requires changing those
  columns, and doing so would reopen the new-table-and-migration
  approach the user explicitly declined.
- [Dedup-on-collision (keep-highest-confidence) is a new, first-time
  policy decision with no precedent in 2.1/2.2] → Accepted; the
  alternative (reject/fail) was judged worse (Decision 3), and this
  policy is narrowly scoped to the one-in-a-response collision case, not
  a general conflict-resolution system.

## Migration Plan

- Pre-migration check: query `extraction_results` for any
  `(document_id, field_name)` pairs with more than one row; if found,
  keep the highest-confidence row per pair and remove the rest (logged).
- Add the Alembic migration: UNIQUE constraint on
  `(document_id, field_name)`; index on `field_name`; `confidence` and
  `needs_review` changed to NOT NULL (`needs_review` keeps its existing
  default of `false`).
- Update `llm_extraction.py`'s persistence loop to group-and-dedup by
  `field_name` before insert, per Decision 3.
- No changes to `document`, `document_extractions`, or `llm_extractions`.
- Rollback: drop the unique constraint and the new index, revert
  `confidence`/`needs_review` to nullable, revert the dedup logic in the
  insert loop. No data is deleted by rollback; only constraints and
  indexes are removed.
