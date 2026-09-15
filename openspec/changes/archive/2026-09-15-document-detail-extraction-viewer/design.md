## Context

See proposal.md - Why. Relevant current state: `GET /documents/{id}`
(`DocumentOut`), `GET /documents/{id}/extraction` (`ExtractionOut`, with
`extracted_text`), and `GET /documents/{id}/fields`
(`list[FieldResultOut]`, each with `confidence`/`needs_review`) all
already exist, already require authentication and are owner-scoped
(4.1). 3.3 already established the pattern for fetching fields and
visually distinguishing `needs_review` (a chip/color treatment) on the
upload page — this story reuses that same visual pattern in a dedicated
view, not a new one. 5.1 (drafted alongside this story) reserves a
`/documents/:id` route with placeholder content for this story to fill.

## Goals / Non-Goals

**Goals:**
- Show raw extracted text, fields with confidence/review status, and
  duplicate relationship for one document.
- Fill 5.1's reserved route.

**Non-Goals:**
- Any correction/edit action on a field (matches 3.3's same boundary).
- The document library/table itself (5.1).
- Consolidating or removing 3.3's existing inline fields summary on the
  upload page (explicitly left alone — see proposal.md).
- Any backend change — purely a frontend view over existing endpoints.

## Decisions

**1. This story fills 5.1's reserved `/documents/:id` route; if built
before 5.1 lands, it establishes that same route itself rather than a
different path.**
Keeps the two stories' navigation consistent regardless of build order,
per the "soft dependency, not hard-blocking" relationship the Sprints
story text itself describes.
- Alternative considered: a route independent of 5.1's reservation
  (e.g., `/detail/:id`). Rejected — would create two different paths to
  the same concept depending on which story landed first, for no
  benefit.

**2. Reuses 3.3's exact visual pattern for confidence/needs-review (a
chip/color treatment per field), applied here in a full-page table
rather than an inline section.**
- Alternative considered: a different visual treatment for the detail
  page (e.g., a summary count of flagged fields instead of per-row
  indicators). Rejected — consistency with 3.3's already-shipped pattern
  is more valuable than a page-specific alternative, and per-row
  indicators are what "review happens via querying flagged records
  directly" (the BRD framing 3.3 was built around) actually needs.

**3. "No extracted text" and "no fields" are each their own explicit
state, following the same reasoning 3.3 used for its own no-fields
case: pair the empty state with why (extraction status), not a bare
empty message.**
- Alternative considered: one generic "nothing available" message
  covering both cases. Rejected — text extraction and LLM extraction
  are independent outcomes (a document can have text but no fields, or
  neither); collapsing them loses information 3.3 already established
  is worth showing.

## Risks / Trade-offs

- [Duplicates 3.3's fields-fetching logic in a second component] →
  Accepted for now; `getDocumentFields` (3.3) is reused as-is, only the
  presentation component is new. Extracting a shared fields-table
  component is a reasonable future refactor, not required by either
  story's boundary.
- [Route-reservation coordination with 5.1 depends on build order] →
  Mitigated by Decision 1's explicit fallback (establish the same route
  if built first); not a hard blocker either direction.

## Migration Plan

Not applicable — no backend or schema change. Frontend-only.

Rollback: remove the Document Detail page/component and the small API
client addition (`getDocument`, `getExtraction`). No other impact.
