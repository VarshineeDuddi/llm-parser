## Context

See proposal.md - Why, including the Auth note. Relevant current state
(now including 4.1, merged after this design was first drafted):
`DocumentOut` (backend schema) already carries every field this story's
table needs (`id`, `status`, `original_filename`, `format`,
`size_bytes`, `created_at`, `extraction_status`, `extraction_failure_
reason`, `duplicate_of_id`). `PaginatedResponse[T]` (3.2) already
provides the pagination envelope this story needs. Every existing
document/extraction endpoint now requires authentication via
`get_current_user` (`backend/app/auth.py`) and filters by
`Document.owner_id == current_user.id`; the frontend's `authHeaders()`
helper (`frontend/src/api/documents.ts`) attaches the stored key to
every request, and `RegistrationForm.tsx` handles the no-key-yet case.
`frontend/src/App.tsx` renders `UploadPage` directly today — no router,
no other page exists.

## Goals / Non-Goals

**Goals:**
- A new `GET /documents` endpoint listing all documents, paginated.
- A Document Library table page as the new default/landing view.
- A routing foundation so this page, the upload flow, and a future
  per-document detail route (5.2) can coexist.

**Non-Goals:**
- The detail view itself (5.2) — this story only reserves the route and
  makes table rows link to it.
- Any change to upload interaction (5.6).
- Sorting/filtering beyond the table's default order (newest first) —
  no BRD or Sprints text asks for it here; a reasonable future
  enhancement, not required now.
- Any backend change beyond the one new list endpoint — extraction,
  duplicate detection, and LLM extraction logic are all untouched.

## Decisions

**1. New endpoint reuses `DocumentOut` and `PaginatedResponse[T]`
as-is — no new response schema.**
`GET /documents` returns `PaginatedResponse[DocumentOut]`, ordered by
`created_at` descending (newest first), with the same `limit`/`offset`
pattern as 3.2's existing paginated endpoints.
- Alternative considered: a leaner list-specific response model omitting
  fields not needed in a table (e.g., `extraction_failure_reason`).
  Rejected — `DocumentOut` is already small, already public via
  `GET /documents/{id}`, and reusing it avoids maintaining two response
  shapes for materially the same data ("reuse existing abstractions").

**1a. Authentication and ownership scoping reuse 4.1's existing
mechanism exactly — `Depends(get_current_user)` plus a
`.where(Document.owner_id == current_user.id)` filter, the same pattern
3.2's endpoints already use post-4.1.**
No new judgment call: 4.1's own `access-scoping` spec already states its
cross-document scoping requirement covers "any future such query," and
this list endpoint is exactly that case.
- Alternative considered: none seriously — deviating from the
  established pattern (e.g., a different auth check) would be
  inconsistent with every sibling endpoint for no benefit.

**2. Introduce `react-router-dom` now, in this story — not deferred
again.**
3.3 deliberately avoided adding a router, scoping itself to inline
display on the single existing page. This story is different: it
explicitly replaces that single page with a landing view, and two more
stories in this same batch (5.2, and implicitly 5.6's polish of the
now-secondary upload flow) need real multi-view navigation. Introducing
it here, once, establishes the foundation the rest of this UI wave
builds on rather than each story inventing its own ad hoc navigation.
- Alternative considered: keep extending single-page conditional
  rendering (as 3.3 did) to also cover the library view. Rejected — that
  pattern was already a deliberate, scoped trade-off for 3.3's narrow
  addition; stretching it across three coexisting full views (library,
  upload, detail) would produce more complexity than adopting a small,
  standard routing library once.
- Two routes established here: `/` (library, default) and
  `/documents/:id` (reserved for 5.2 — this story links to it but
  doesn't implement what renders there beyond, at most, a placeholder).
  The upload flow becomes reachable from the library (e.g., `/upload`),
  not the default route.

**2a. The existing "no key stored yet" registration gate (4.1's
`RegistrationForm.tsx`) sits above routing, not per-route.**
Since every route now needs an authenticated fetch, a logged-out user
sees the registration prompt regardless of which route they land on,
before that route's own data-fetching runs — not a separate "please log
in" state duplicated in the library and the upload page independently.
- Alternative considered: let each page handle its own "not
  authenticated" state independently (matching how `uploadDocument`
  today returns `unauthorized: true` on a 401). Rejected for the
  library's default-view role specifically — gating at the router level
  means a logged-out user's very first screen is the registration
  prompt, not a library that immediately fails to load.

**3. Default sort: newest first (`created_at` descending), no
client-configurable sort in this story.**
- Alternative considered: let the user pick a sort column. Rejected as
  unnecessary scope for a first "see everything" table; matches "keep it
  simple" deployment guidance and isn't asked for by the story text.

## Risks / Trade-offs

- [Introducing routing changes the frontend's overall shape, touching
  `App.tsx` more structurally than any prior frontend story] → Accepted;
  Decision 2 explains why this is the right point to do it once rather
  than deferring again. Scoped to the minimum needed (two routes) rather
  than a full navigation redesign.
- [No pagination UI decided yet beyond "a way to retrieve the next
  page" — could be simple Next/Previous buttons or infinite scroll] →
  Left as an implementation detail for tasks.md rather than over-
  specified here; either satisfies the spec's requirement.
- [Reserved `/documents/:id` route with nothing real behind it until 5.2
  ships] → Accepted; a placeholder (e.g., "detail view coming soon") is
  acceptable for this story's boundary — the route existing and being
  linkable is what 5.2 needs, not a finished page.

## Migration Plan

Not applicable — no schema change. Backend: one new read endpoint.
Frontend: new dependency (`react-router-dom`) and new page/routing
structure.

Rollback: remove the new endpoint, the library page, and revert
`App.tsx` to render `UploadPage` directly (no router). No data impact.
