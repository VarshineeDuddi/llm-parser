## Why

There's no way to filter documents by their classified type without
already knowing the exact type string. This is Zoho Sprints story **5.4
Document Type Browser** (item `57591000000030016`) — a UI Showcase story
with no epic (workspace plan limitation, per the story's own
description; confirmed to exist in Sprints, not invented). No blocking
dependencies; the endpoint it needs already exists.

BRD source: no standalone `docs/BRD.md` exists in this repo; this story
comes directly from the Sprints backlog item's own description.

**Scope note (a reasonable assumption, recorded per project
convention):** no endpoint exists to list the set of distinct classified
types across a user's documents, and the story's own text says no
backend change is needed. This story is therefore a free-text type
filter (type a classified type, see matching documents) — the same
pattern 5.3 uses for field names — not a dropdown populated from a
discovered list of types. Building type discovery would be a backend
change outside this story's stated boundary.

## What Changes

- Add a Document Type Browser page: a text input for a classified
  document type, and a paginated table of documents matching that type
  — powered entirely by the existing
  `GET /document-types/{type}/documents` endpoint (already authenticated
  and owner-scoped per 4.1; no backend change).
- Unlike 5.3's field explorer, this endpoint already returns full
  `DocumentOut` records (including filename), so no document-identifier-
  only limitation applies here — rows can show filenames directly.
- Out of scope for this story: type discovery/autocomplete (no backend
  support exists for it — see Scope note); single-document detail (5.2);
  cross-document field search (5.3); any backend change.

## Capabilities

### New Capabilities
- `document-type-browser`: filtering a user's own documents by their
  classified type.

### Modified Capabilities
- None. Calls the existing, unmodified `field-level-query` capability
  as-is.

## Impact

- **Backend**: none. `GET /document-types/{type}/documents` already
  exists, already requires authentication, and already scopes results
  to the caller's own documents (4.1's retrofit onto 3.2).
- **Data**: none.
- **Frontend**: new Document Type Browser page/component; a small API
  client addition (a typed wrapper over
  `GET /document-types/{type}/documents`, reusing 3.2's
  `PaginatedResponse`/`DocumentOut` shapes as-is) using the existing
  `authHeaders()` pattern.
- **Dependencies**: none blocking. Rows can link to 5.2's document-
  detail route, but don't require 5.2 to exist first.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential, no
new backend endpoint. Reuses an already-authenticated, already-owner-
scoped endpoint (4.1) exactly as-is. Kept on `parser-standard`, matching
the Sprints story's own suggested classification.

## Rollback

Remove the Document Type Browser page/component and the small API
client addition. No backend, data, or existing-endpoint impact.
