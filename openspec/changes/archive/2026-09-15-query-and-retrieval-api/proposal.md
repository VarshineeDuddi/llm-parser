## Why

Story 3.1 made the field-level data model durable and queryable in
principle (indexed for exactly these access patterns), but nothing yet
lets a caller actually read it back. Per the BRD (FR6, the query portion
of FR8, and the Data Requirement that "querying every value of field X
across every document, or every field for one document, must be a
straightforward relational query"), this story adds the read surface
over what 3.1 built. This is Zoho Sprints story **3.2 Query & Retrieval
API (by document, by field, by type)** (item `57591000000023023`) under
epic **Field-Level Extraction Storage & Query** (`57591000000025001`) in
the Document Parser (MVP) project — confirmed to exist in Sprints, not
invented. It depends on Story 3.1 (`field-level-storage`, archived — the
data model and indexes this story queries).

BRD source: no standalone `docs/BRD.md` exists in this repo; the
business requirement referenced is `openspec/config.yaml`'s `context`
block and the field-level storage model 3.1 formalized.

**Sequencing note (checked before drafting, not assumed):** the Sprints
story also says this "should follow Story 4.1 (access scoping) so
queries are scoped correctly from the start." Story 4.1 hasn't been
proposed or built yet. I checked the actual codebase before proceeding:
no authentication or access-control mechanism exists anywhere in this
API today — `GET /documents/{id}` and `GET /documents/{id}/extraction`
already expose document metadata and raw extracted text with no scoping
at all. This story's new endpoints inherit that same unauthenticated
posture; they are not introducing a new gap relative to what already
ships. Flagged explicitly here (see Impact) rather than silently
building as if 4.1 already existed, or blocking on a story that isn't
scheduled.

## What Changes

- Add a read endpoint returning all field-level records for one
  document ("by document").
- Add a read endpoint returning all field-level records with a given
  field name across documents ("by field").
- Add a read endpoint returning documents matching a given classified
  document type ("by type") — built on the same field-level records
  (document type is stored as a reserved-name field per 2.1), without
  exposing that internal convention in the API's contract.
- Every returned field-level record includes its confidence and
  `needs_review` flag (2.2), so a caller can tell an unconfirmed value
  from a confirmed one — the query surface is what makes that flag
  actually actionable for the first time.
- Support an optional `needs_review`-only filter on the by-document and
  by-field endpoints, so "show me what needs review" is a straightforward
  query, not a client-side filter over everything.
- Paginate the by-field and by-type endpoints (unbounded result sets as
  data grows); by-document is naturally bounded to one document's
  fields.
- Out of scope for this story: access scoping/authentication (4.1, not
  yet built — see Sequencing note); any UI (3.3); filtering out
  duplicate documents' own field-level records from query results (no
  such filtering exists today and the BRD doesn't ask for it here); any
  change to what gets extracted, how grounding/confidence work, or the
  storage schema itself (3.1's concern, unchanged).

## Capabilities

### New Capabilities
- `field-level-query`: read/query endpoints over the field-level
  storage model — retrieval by document, by field name, and by
  classified document type, each field-level record including its
  confidence and review-flag.

### Modified Capabilities
- None. `field-level-storage`'s persistence contract (3.1) is unchanged
  — this story only reads from it. `llm-extraction`'s behavior is
  unchanged — this story doesn't affect what gets written.

## Impact

- **Backend**: new read-only endpoints (likely under the existing
  `/documents` router plus new routes for cross-document field/type
  queries) querying `ExtractionResult` via the indexes 3.1 added; new
  Pydantic response models including `confidence`/`needs_review` per
  record.
- **Data**: none — no schema change, this story only reads existing
  tables.
- **Frontend**: none in this story (3.3 covers UI).
- **Dependencies**: depends on 3.1 (archived — the data model and
  indexes). Does not depend on 4.1 (access scoping) to function, though
  per the Sequencing note above, 4.1 will need to retrofit scoping onto
  these endpoints (and the existing unauthenticated ones) when it
  lands, the same way 3.1 itself retrofitted the storage model onto
  code that shipped ahead of it.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change (3.1 already added the needed indexes), no new
external integration, no new credential. This is a read surface over an
already-approved model, consistent with the Sprints story's own
suggested `parser-standard` classification. The one dimension worth
naming explicitly: this is the first API surface exposing field-level
extraction results (as opposed to raw document text, already exposed
today) — judged not to cross into "changes to sensitive-data handling"
because it exposes the same underlying documents' data through the same
kind of unauthenticated read path that already exists for document
metadata and extracted text, not a new category or a new exposure
posture.

## Rollback

Remove the new query endpoints and their response models. No data or
schema impact — this story only adds read paths over data 3.1 already
persists; nothing about extraction, storage, or existing endpoints
changes.
