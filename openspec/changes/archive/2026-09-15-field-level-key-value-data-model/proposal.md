## Why

`extraction_results` (introduced by Story 2.1, extended by 2.2) was
always an explicitly minimal placeholder — 2.1's design.md said so
directly, deferring "whether it will later be replaced wholesale...or
3.1 builds on top of it" to this story. Nothing today mechanically
enforces the hard constraint that results are "one per document/field
pair" — it's convention, not a guarantee — and no index exists to
support the query access patterns Story 3.2 will need. This is Zoho
Sprints story **3.1 Field-Level Key/Value Data Model** (item
`57591000000025008`) under epic **Field-Level Extraction Storage &
Query** (`57591000000025001`) in the Document Parser (MVP) project —
confirmed to exist in Sprints, not invented (see discuss.md). Per the
epic split entry itself, this story should have been settled before
1.3, 2.1, 2.2, 3.2, and 3.3 — it wasn't, so this proposal retrofits the
foundational model those already-shipped stories are running against,
rather than designing it greenfield.

BRD source: no standalone `docs/BRD.md` exists in this repo; the
business requirement referenced is `openspec/config.yaml`'s `context`
block — specifically the hard constraint that results are stored as
field-level key/value records, one per document/field pair, and that the
storage model must remain compatible with the planned future
template-driven extraction capability.

**Approach note (resolved with the user before drafting):** this story
extends `extraction_results` in place — no new table, no data migration
of existing rows into a different shape. This was a genuine, material
choice (the alternative — a new table with a data migration — was
explicitly considered and rejected by the user) rather than an
assumption; see design.md Decisions.

## What Changes

- Add a database-level uniqueness constraint on
  `(document_id, field_name)` so "one record per document/field pair" is
  mechanically guaranteed, not merely a convention the extraction code
  happens to follow today.
- Define the persistence-layer policy for what happens if an LLM
  response ever contains two grounded entries with the same
  `field_name` for one document (a case the uniqueness constraint would
  otherwise reject as an error): keep the higher-confidence entry,
  discard the other — deduplication, not a crash.
- Add indexes supporting the access patterns Story 3.2 (Query &
  Retrieval API) will need: by document, and by field name.
- Tighten `confidence` and `needs_review` to NOT NULL, matching the
  invariant the extraction code (2.1/2.2) already upholds in practice —
  after verifying no existing row actually violates it.
- Out of scope for this story: any query/retrieval API (3.2); any UI
  surfacing (3.3); changing what fields get extracted, how grounding
  works, or how confidence is computed (2.1/2.2's logic, unchanged); a
  new table or data migration (explicitly rejected approach, see above).

## Capabilities

### New Capabilities
- `field-level-storage`: the persistence contract for field-level
  extraction results — one record per document/field pair (mechanically
  enforced), indexed for retrieval by document and by field, and
  structurally compatible with the future template-driven extraction
  capability.

### Modified Capabilities
- None. `llm-extraction`'s own requirements (what gets extracted, how
  grounding and confidence work) are unchanged — this story only adds a
  storage-layer guarantee underneath what it already writes. The
  dedup-on-collision behavior is a property of the storage contract
  (`field-level-storage`), not a change to how `llm-extraction` decides
  what to extract.

## Impact

- **Backend**: a migration adding the uniqueness constraint and two
  indexes to `extraction_results`, and tightening `confidence`/
  `needs_review` to NOT NULL; a small persistence-layer change in
  `llm_extraction.py`'s insert loop to deduplicate same-field entries
  before insert (keep-highest-confidence) rather than let a constraint
  violation propagate.
- **Data**: no new table. `extraction_results`' existing columns
  (`field_name`, `field_value`, `source_quote`, `created_at`) are
  unchanged; only constraints/indexes on existing columns are added.
- **Frontend**: none.
- **Dependencies**: 2.1 and 2.2 (both archived) already write to
  `extraction_results` — this story's migration must not break their
  already-persisted data or already-running write path. 3.2 and 3.3
  depend on this story completing first, per the epic split entry.

## Risk Classification (Stage 0b)

| Dimension | Applies? | Detail |
|---|---|---|
| Data model change | **Yes** | This story's entire purpose — formalizing constraints/indexes on an existing table. This is the story config.yaml's "data-model changes" trigger anticipates. |
| New external integration | No | No external service involved. |
| Security/credential handling | No | No credential introduced or touched. |
| Multi-module / architecture | Yes | Touches the existing extraction write path (`llm_extraction.py`) as well as the schema itself, and is the foundation two already-shipped stories (2.1, 2.2) and two upcoming ones (3.2, 3.3) all depend on. |

Given the data-model change directly implements a hard constraint's
mechanical enforcement, and per `config.yaml`'s explicit rule not to
downgrade for process convenience, this is classified
**parser-sensitive** — matching the Sprints story's own suggested
classification.

## Rollback

Drop the uniqueness constraint and the two new indexes, revert
`confidence`/`needs_review` to nullable, and revert the dedup-on-collision
logic in `llm_extraction.py`'s insert loop. No data loss: rollback
removes constraints/indexes only, and does not touch any existing
`field_name`/`field_value`/`source_quote`/`confidence`/`needs_review`
values already persisted by 2.1/2.2.
