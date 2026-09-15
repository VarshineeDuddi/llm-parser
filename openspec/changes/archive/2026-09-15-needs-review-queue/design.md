## Context

See proposal.md - Why and Approach note. Relevant current state:
`ExtractionResult.needs_review` (2.2) is queryable today only per-
document (`GET /documents/{id}/fields?needs_review=true`, 3.2/4.1).
`GET /fields/{field_name}` and `GET /document-types/{type}/documents`
(3.2, retrofitted by 4.1) are the existing precedent for a paginated,
owner-scoped, cross-document query — this story's new endpoint follows
that exact same shape.

## Goals / Non-Goals

**Goals:**
- One endpoint returning every flagged field across a user's documents.
- A dashboard page over it.

**Non-Goals:**
- Any correction/resolution/"mark reviewed" action (no story for that
  exists yet).
- The document library (5.1) or detail view (5.2) — not a dependency,
  though rows link to 5.2.
- Filtering the queue by document or field name — a plain aggregate
  listing is what the story asks for; further filtering is a reasonable
  future enhancement, not required now.

## Decisions

**1. New backend endpoint (`GET /needs-review`), not a client-side
stopgap aggregating per-document fetches.**
The Sprints story text explicitly offers both as legitimate paths. A
backend endpoint is chosen because:
- It matches the exact pattern already established by 3.2's two
  cross-document endpoints (paginated, owner-scoped, no new auth
  judgment call) — implementing it is a small, well-precedented
  addition, not novel architecture.
- The stopgap alternative is an N+1 request pattern (one fields-fetch
  per document) that gets worse as a user's document count grows, and
  only works once 5.1's document list exists — a real dependency this
  approach avoids.
- Alternative considered (the stopgap): rejected for the reasons above,
  but noted as the story's own sanctioned fallback if this endpoint
  ever needs to be reverted without a replacement.

**2. Reuses `FieldResultWithDocumentOut` and `PaginatedResponse[T]`
exactly — no new response schema, same as `GET /fields/{field_name}`.**
- Alternative considered: a response shape that groups results by
  document (nested). Rejected — a flat list matches 3.2's existing
  precedent and the "scan everything flagged" use case; grouping is a
  frontend presentation concern (tasks.md may group for display), not
  a backend response-shape requirement.

**3. Query implementation: filter `ExtractionResult` where
`needs_review IS TRUE`, joined to `Document` where
`owner_id == current_user.id` — the same join/filter shape
`GET /document-types/{type}/documents` already uses, substituting the
filter condition.**

## Risks / Trade-offs

- [A very large number of flagged fields across many documents could
  make the queue unwieldy without grouping/sorting] → Accepted for MVP;
  pagination (per spec) bounds any single response; grouping by document
  in the UI is a reasonable frontend enhancement task, not a required
  backend feature.
- [No way to dismiss/resolve a flagged item from the queue] → Accepted
  as an explicit Non-Goal; this story is read-only by the BRD's own
  framing, matching 3.3's precedent.

## Migration Plan

Not applicable — no schema change. Backend: one new read endpoint.
Frontend: new page/component.

Rollback: remove the `GET /needs-review` endpoint and the Needs-Review
Queue page/component. No data impact.
