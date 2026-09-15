## Context

See proposal.md - Why and Scope note. Relevant current state:
`GET /document-types/{type}/documents` (3.2, retrofitted with auth/
ownership scoping by 4.1) returns `PaginatedResponse[DocumentOut]` —
already includes filename and every other field this story's table
needs, unlike 5.3's by-field endpoint. No endpoint exists to enumerate
distinct classified types.

## Goals / Non-Goals

**Goals:**
- Free-text filter by classified type, see matching documents.
- Pagination over the existing endpoint's `limit`/`offset`.

**Non-Goals:**
- Type discovery/autocomplete — no backend support exists for listing
  distinct types; this story is a free-text filter, not a dropdown (see
  proposal.md's Scope note).
- Single-document detail (5.2) or field search (5.3).
- Any backend change.

## Decisions

**1. Free-text type input, not a dropdown of discovered types.**
Mirrors 5.3's same judgment call for field names, for the same reason:
no backend endpoint exists to enumerate the distinct values, and adding
one would be a backend change outside this story's stated boundary
("endpoint already exists," no dependencies listed).
- Alternative considered: derive a type list client-side by fetching
  every document (once 5.1 exists) and extracting distinct
  `_document_type` values. Rejected — fragile (depends on 5.1 existing
  and on exposing the internal reserved-field-name convention, which
  3.2's design explicitly chose not to leak into the API contract) and
  out of proportion to what this story asks for.

**2. Table reuses `DocumentOut` fields directly — no per-row lookup
needed, unlike 5.3.**
The by-type endpoint already returns full document records, so rows can
show filename, format, size, status, etc. immediately.

## Risks / Trade-offs

- [A user must know or guess an exact type string, since there's no
  discovery mechanism] → Accepted per Decision 1; consistent with 5.3's
  same trade-off for field names, and not something this story's
  boundary asks to solve.

## Migration Plan

Not applicable — no backend or schema change. Frontend-only.

Rollback: remove the Document Type Browser page/component and its API
client addition. No other impact.
