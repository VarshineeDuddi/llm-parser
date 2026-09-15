## Why

The product has no way to see what's already been uploaded — only
per-document, per-field, or per-type lookups when you already know an
identifier. This is Zoho Sprints story **5.1 Document Library (Table
View)** (item `57591000000030006`) — a UI Showcase story with no epic
(the workspace plan doesn't support additional epics, per the story's
own description; confirmed to exist in Sprints, not invented). It has
no blocking dependencies and can start immediately.

BRD source: no standalone `docs/BRD.md` exists in this repo; this story
comes directly from the Sprints backlog item's own description rather
than a numbered BRD requirement.

**Auth note (updated after drafting began, not missed):** Story 4.1
(access scoping) merged into `dev` after this proposal was first drafted
and pushed. Every document/extraction endpoint now requires
authentication and is scoped to the calling user. This revision updates
this proposal, design, specs, and tasks accordingly — the new list
endpoint requires authentication and returns only the caller's own
documents, consistent with every other endpoint in the system today.

## What Changes

- Add a new backend endpoint listing all documents owned by the
  authenticated caller (filename, format, size, upload date, status,
  extraction status, duplicate flag) — this read path doesn't exist
  today; every current endpoint requires already knowing a document ID,
  field name, or type. Requires authentication and is scoped to the
  caller's own documents, per 4.1's now-general "any future such query"
  scoping rule.
- Add a Document Library page: a table of the authenticated user's own
  uploaded documents, using the new list endpoint, as the application's
  new landing screen.
- Introduce client-side routing (previously absent — `App.tsx` rendered
  `UploadPage` directly): a library route as the default view, with the
  existing upload page reachable from it, and a route reserved for
  Story 5.2's per-document detail view (not built here, just the path
  this story's table rows will link to).
- Out of scope for this story: the detail drill-down view itself (5.2 —
  this story only provides the table and links out to where it will
  live); any change to the upload flow's own interaction (5.6); any
  change to what data exists or how it's computed — purely a new read
  endpoint and a new page over already-existing data.

## Capabilities

### New Capabilities
- `document-library`: listing all uploaded documents in one paginated,
  read-only view.

### Modified Capabilities
- None. No existing capability's requirements change — this adds a new
  read path over data `document-ingestion`, `text-extraction`,
  `duplicate-detection`, and `llm-extraction` already produce.

## Impact

- **Backend**: new `GET /documents` endpoint, authenticated via the
  existing `get_current_user` dependency (4.1) and filtered to
  `Document.owner_id == current_user.id`, paginated (reusing 3.2's
  existing `PaginatedResponse` wrapper and `DocumentOut` response model
  — both already contain every field this story needs, so no new
  response schema).
- **Data**: none — read-only, no schema change.
- **Frontend**: new Document Library page/component, fetching via the
  existing `authHeaders()` pattern (4.1) so the request carries the
  stored API key like every other call; `react-router-dom` added as a
  new dependency (first routing library in this project — see design.md
  for why this story, not a later one, is where that's introduced);
  `App.tsx` restructured to route between the library (default) and
  upload views, with the library treated the same as the upload flow
  regarding the "no key stored yet" registration prompt (4.1) — a
  logged-out user sees that prompt before either view's data loads.
- **Dependencies**: none blocking. Provides the navigation shell (router
  + a reserved detail route) that Story 5.2 will build into, and the
  document list Story 5.5 said it "benefits from" existing first.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential. This
endpoint's authentication and ownership scoping reuse 4.1's already-
approved, already-implemented mechanism exactly (the same
`get_current_user` dependency and the same `owner_id` filter pattern
3.2's endpoints use post-4.1) rather than introducing any new
security-relevant surface — 4.1's own spec explicitly anticipated "any
future such query" needing this same scoping, so applying it here isn't
a new judgment call. Introducing client-side routing is a real frontend
architectural addition, but a standard, low-risk one for a growing
multi-view frontend — not the kind of security- or data-sensitive change
`config.yaml`'s "significant architecture changes" trigger is aimed at.
Kept on `parser-standard`, matching the Sprints story's own suggested
classification.

## Rollback

Remove the new `GET /documents` endpoint, the Document Library page, and
the routing restructure (reverting `App.tsx` to render `UploadPage`
directly, as before). No data impact — this story is entirely additive
read/presentation surface.
