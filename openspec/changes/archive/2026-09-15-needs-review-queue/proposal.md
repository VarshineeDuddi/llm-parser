## Why

2.2 introduced the `needs_review` flag and 3.3/5.2 show it per-document,
but there's nowhere to see every flagged field across all of a user's
documents in one place to actually work through them. This is Zoho
Sprints story **5.5 Needs-Review Queue** (item `57591000000027016`) — a
UI Showcase story with no epic (workspace plan limitation, per the
story's own description; confirmed to exist in Sprints, not invented).

BRD source: no standalone `docs/BRD.md` exists in this repo; this story
comes directly from the Sprints backlog item's own description,
specifically operationalizing the "review happens via querying flagged
records directly" framing 3.3 was built around, but across documents
instead of one at a time.

**Approach note (a real decision this story's own text leaves open, made
and recorded here rather than defaulted silently):** the story text
explicitly offers two paths — a new cross-document aggregation endpoint,
or a client-side stopgap aggregating across Story 5.1's document list.
This proposal takes the backend-endpoint path: a new
`GET /needs-review` endpoint, paginated and owner-scoped exactly like
3.2's existing cross-document endpoints. Rejected alternative: the
client-side stopgap, which would require one fields-fetch per document
(N+1 requests) and would only work once 5.1 exists; see design.md
Decisions for the full reasoning. This also means, unlike the stopgap
approach, this story does not depend on 5.1.

## What Changes

- Add a new backend endpoint returning every field-level record flagged
  `needs_review = true` across all documents owned by the authenticated
  caller, paginated — reusing 3.2's existing response shape
  (`FieldResultWithDocumentOut`) exactly, no new schema.
- Add a Needs-Review Queue page: a table of every flagged field across
  the user's documents, using the new endpoint.
- Read-only: no correction, resolution, or "mark reviewed" action —
  same boundary the BRD set for 3.3's per-document display.
- Out of scope for this story: any correction/resolution workflow (no
  story for that exists yet); the document library (5.1) or detail view
  (5.2) — this story doesn't depend on either, though rows can link to
  5.2's detail route.

## Capabilities

### New Capabilities
- `needs-review-queue`: a cross-document view of every field flagged as
  requiring human review, for the authenticated caller's own documents.

### Modified Capabilities
- None. No existing capability's requirements change — this adds a new
  read path over data `llm-extraction` and `field-level-storage` already
  produce, using the same authentication/ownership-scoping mechanism
  4.1 already established.

## Impact

- **Backend**: new `GET /needs-review` endpoint, authenticated via the
  existing `get_current_user` dependency and filtered to
  `ExtractionResult.needs_review == True` joined against the caller's
  own documents, paginated (reusing 3.2's `PaginatedResponse`/
  `FieldResultWithDocumentOut` shapes — no new response schema).
- **Data**: none — read-only, no schema change.
- **Frontend**: new Needs-Review Queue page/component; a small API
  client addition using the existing `authHeaders()` pattern.
- **Dependencies**: none blocking (see Approach note — the backend-
  endpoint path removes the soft dependency on 5.1 the stopgap approach
  would have had). Rows can link to 5.2's detail route.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential. This
endpoint's authentication and ownership scoping reuse 4.1's exact
mechanism, the same pattern 5.1's new list endpoint already applied — no
new security judgment call. Kept on `parser-standard`, matching the
Sprints story's own suggested classification.

## Rollback

Remove the `GET /needs-review` endpoint and the Needs-Review Queue page/
component. No data impact — this story is entirely additive read
surface.
