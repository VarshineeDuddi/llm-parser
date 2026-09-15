## Context

See proposal.md - Why. Relevant current state: `GET /fields/{field_name}`
(3.2, retrofitted with auth/ownership scoping by 4.1) returns
`PaginatedResponse[FieldResultWithDocumentOut]` — each item has
`field_name`, `field_value`, `confidence`, `needs_review`, `created_at`,
and `document_id`, but no document filename. 5.2 (drafted alongside this
story) provides a document detail route this story's rows can link to.

## Goals / Non-Goals

**Goals:**
- Search by field name, see matching documents and values.
- Pagination over the existing endpoint's `limit`/`offset`.
- Client-side sort over the loaded page.

**Non-Goals:**
- Resolving document filenames via extra per-row API calls — the
  by-field endpoint returns a document identifier, not a filename; this
  story displays that identifier as a link rather than adding N+1
  lookups (see Decision 1).
- Server-side sort (a new backend query parameter) — sorting is
  client-side over the currently-loaded page only.
- Fuzzy or partial field-name matching — exact match only, consistent
  with 3.2's own endpoint contract.

## Decisions

**1. Rows link to the document by identifier (via 5.2's detail route),
without resolving a filename through an extra API call per row.**
The by-field endpoint returns `document_id` only. Filename lives on
`DocumentOut`, reachable via a separate `GET /documents/{id}` call.
- Alternative considered: issue one `GET /documents/{id}` call per
  returned row to show filenames directly in the table. Rejected — an
  N+1 request pattern for a table that could show dozens of rows per
  page, for a convenience (filename vs. clicking through) the Sprints
  story's own text doesn't ask for ("Dependencies: none — endpoint
  already exists" implies no backend change and, by extension, no
  request-fan-out workaround for one). The document identifier, linked
  to 5.2's detail view, gets a user to the filename in one click.
- Flagged as a real trade-off, not a hidden gap: if this proves
  insufficient UX once used, the natural fix is a backend change (adding
  filename to `FieldResultWithDocumentOut`), which is out of scope here
  precisely because it would be a backend change this story's boundary
  excludes.

**2. Sorting is implemented client-side, over the array already fetched
for the current page — not a new backend sort parameter.**
- Alternative considered: add `sort_by`/`sort_dir` query params to
  `GET /fields/{field_name}`. Rejected — that's a backend change this
  story's boundary excludes ("not the query API itself," matching 3.3's
  precedent for the same kind of scoping decision); sorting one already-
  fetched page client-side satisfies the requirement without it.

## Risks / Trade-offs

- [Document identifiers (UUIDs) are not human-friendly to scan in a
  table without a filename] → Accepted per Decision 1; mitigated by one-
  click access to the full document detail (5.2) where the filename is
  immediately visible.
- [Client-side sort only affects the currently-loaded page, not the full
  result set across pages] → Accepted; consistent with Non-Goals — a
  user sorting page 2 doesn't see page 1's rows re-interleaved, which is
  a reasonable, disclosed limitation of client-side-only sorting.

## Migration Plan

Not applicable — no backend or schema change. Frontend-only.

Rollback: remove the Field Explorer page/component and its API client
addition. No other impact.
