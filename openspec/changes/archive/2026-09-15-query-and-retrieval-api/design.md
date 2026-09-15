## Context

See proposal.md - Why. Relevant current state (from the actual code):
`ExtractionResult` (`extraction_results`) now has a UNIQUE constraint on
`(document_id, field_name)` and an index on `field_name` (3.1), plus
`confidence`/`needs_review` (2.2, now NOT NULL). The document's
classified type is stored as a row with `field_name = "_document_type"`
(2.1's `DOCUMENT_TYPE_FIELD_NAME` constant). The existing
`backend/app/routers/documents.py` already has unauthenticated
`GET /documents/{document_id}` and `GET /documents/{document_id}/extraction`
following a simple FastAPI + SQLAlchemy + Pydantic response-model
pattern (`_document_out` helper, `response_model=...`).

## Goals / Non-Goals

**Goals:**
- Three retrieval patterns: by document, by field name, by classified
  type.
- Every returned field-level record surfaces confidence and
  `needs_review`.
- An optional needs-review-only filter.
- Pagination on the two cross-document retrieval patterns.

**Non-Goals:**
- Access scoping/authentication (4.1 — not yet built; see proposal.md's
  Sequencing note).
- Any UI (3.3).
- Write/update operations on field-level records (this story is
  read-only).
- Filtering duplicate documents out of results (no precedent for this
  in the codebase today, not requested by the BRD for this story).
- Full-text or fuzzy search over `field_value` — exact field-name and
  type matching only, consistent with the BRD's "straightforward
  relational query" framing.

## Decisions

**1. Three focused endpoints rather than one generalized query
endpoint.**
- `GET /documents/{document_id}/fields` — by document.
- `GET /fields/{field_name}` — by field, across documents.
- `GET /document-types/{type}/documents` — by classified type.
Each accepts `needs_review: bool | None` as an optional query param
(Requirement: Filter Retrieval To Records Needing Review); the latter
two accept pagination params.
- Alternative considered: one generic `/query` endpoint accepting a
  filter object (field name, type, document id, needs_review, as
  optional combinable params). Rejected — the BRD names three specific
  access patterns, not an arbitrary filter system; three focused,
  clearly-named endpoints are easier to reason about, document, and
  secure individually once 4.1 lands, than one endpoint whose behavior
  depends on which combination of filters is present.

**2. "By type" is implemented as a filtered lookup on
`field_name = "_document_type"`, but the reserved field-name convention
is not exposed in the endpoint's path, params, or response shape.**
`GET /document-types/{type}/documents` internally queries
`ExtractionResult` where `field_name == DOCUMENT_TYPE_FIELD_NAME and
field_value == type`, then returns the matching documents (via
`DocumentOut`, reusing the existing response model) — not raw
`ExtractionResult` rows with the internal field name visible.
- Alternative considered: expose `_document_type` as just another field
  name callers query via the by-field endpoint
  (`GET /fields/_document_type?value=type`). Rejected — leaks an
  internal storage convention into the public API contract; a caller
  shouldn't need to know document type happens to be modeled as a
  reserved-name field row rather than a first-class attribute. The
  dedicated endpoint keeps that an implementation detail, matching the
  spec's own framing ("without requiring the caller to know how document
  type is internally represented in storage").

**3. By-field and by-type responses include which document each record
belongs to; by-document responses don't repeat the document identifier
on every record (it's already in the request path).**
Reduces redundant payload on the by-document response, which is the one
endpoint returning multiple records that all share the same document.

**4. Pagination via limit/offset query params (`limit`, default and max
values set conservatively; `offset`), not cursor-based.**
- Alternative considered: cursor-based (opaque token) pagination.
  Rejected as unnecessary complexity for the MVP's expected data volume;
  offset/limit is simpler to implement and consistent with "no
  background processing / keep it simple" deployment guidance. Revisit
  if result-set sizes or consistency-under-concurrent-writes become an
  actual problem.

## Risks / Trade-offs

- [No access control on new endpoints exposing extraction results] →
  Accepted and explicitly flagged (see proposal.md's Sequencing note),
  consistent with every existing endpoint's current posture, not a new
  gap. Revisit when 4.1 lands.
- [Offset-based pagination can skip or repeat records if rows are
  inserted between page requests] → Accepted for MVP; extraction volume
  and concurrency are low, and this is a read-only reporting-style API,
  not a use case sensitive to exact-once pagination guarantees.
- [Three separate endpoints instead of one flexible query surface could
  need extending later if new access patterns emerge] → Accepted; the
  BRD specifies exactly these three patterns, and adding a fourth
  focused endpoint later is lower-risk than redesigning one overloaded
  endpoint's contract after callers depend on it.

## Migration Plan

Not applicable — no schema change. This story adds application-layer
read endpoints only.

Rollback: remove the new router(s)/endpoints and their response models.
No data or schema impact.
