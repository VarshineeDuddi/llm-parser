## Why

There's no way to answer "show me every document's value for field X"
without already knowing which documents have it. This is Zoho Sprints
story **5.3 Field Explorer (Cross-Document Runnable Table)** (item
`57591000000030011`) — a UI Showcase story with no epic (workspace plan
limitation, per the story's own description; confirmed to exist in
Sprints, not invented), described as "the primary 'see the data in a
runnable table' surface." No blocking dependencies; the endpoint it
needs already exists.

BRD source: no standalone `docs/BRD.md` exists in this repo; this story
comes directly from the Sprints backlog item's own description.

## What Changes

- Add a Field Explorer page: a text input for a field name, and a
  paginated, sortable table of every document that has that field, with
  its value — powered entirely by the existing
  `GET /fields/{field_name}` endpoint (already authenticated and owner-
  scoped per 4.1; no backend change).
- Each row identifies its document; clicking through goes to that
  document's detail view (5.2's route), since the by-field endpoint
  returns a document identifier, not a filename — see design.md for why
  this story doesn't add a filename-resolution call.
- Sorting is client-side, over the currently-loaded page of results (by
  value, by confidence, or by needs-review status) — no new backend
  sort parameter.
- Out of scope for this story: single-document detail (5.2); the
  document-type browser (5.4); any backend change — this story is
  frontend-only over an already-implemented endpoint.

## Capabilities

### New Capabilities
- `field-explorer`: a cross-document search view letting a user look up
  every document holding a given field name, with its value.

### Modified Capabilities
- None. Calls the existing, unmodified `field-level-query` capability
  as-is.

## Impact

- **Backend**: none. `GET /fields/{field_name}` already exists, already
  requires authentication, and already scopes results to the caller's
  own documents (4.1's retrofit onto 3.2).
- **Data**: none.
- **Frontend**: new Field Explorer page/component; a small API client
  addition (a typed wrapper over `GET /fields/{field_name}` — 3.2's
  `PaginatedResponse`/`FieldResultWithDocumentOut` shapes are reused
  as-is) using the existing `authHeaders()` pattern.
- **Dependencies**: none blocking. Links to 5.2's document-detail route
  from each row, but doesn't require 5.2 to exist first — a link to a
  not-yet-built route is a lower-risk gap than a hard build dependency.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential, no
new backend endpoint. Reuses an already-authenticated, already-owner-
scoped endpoint (4.1) exactly as-is. Kept on `parser-standard`, matching
the Sprints story's own suggested classification.

## Rollback

Remove the Field Explorer page/component and the small API client
addition. No backend, data, or existing-endpoint impact.
