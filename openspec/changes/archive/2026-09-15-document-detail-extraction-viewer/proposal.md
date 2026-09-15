## Why

3.3 added an inline fields summary to the upload page, but there's no
dedicated place to see everything about one document — its full raw
extracted text, every field with its confidence, and its duplicate
relationship — especially for a document reached later, not just right
after uploading it. This is Zoho Sprints story **5.2 Document Detail /
Extraction Viewer** (item `57591000000029011`) — a UI Showcase story
with no epic (workspace plan limitation, per the story's own
description; confirmed to exist in Sprints, not invented). It's
reachable from Story 5.1's table via row click but buildable
independently per the story's own text.

BRD source: no standalone `docs/BRD.md` exists in this repo; this story
comes directly from the Sprints backlog item's own description.

## What Changes

- Add a Document Detail page showing, for one document: its raw
  extracted text, a table of every LLM-extracted field with a
  confidence badge and a needs-review indicator per field, and a
  duplicate-of link when the document is a duplicate.
- Fills in the `/documents/:id` route Story 5.1 reserves (or, if built
  before 5.1 lands, establishes that same route itself — see design.md).
- Read-only: no correction, edit, or re-review action on a field — same
  boundary 3.3 established for its own inline display.
- Out of scope for this story: the document library/table itself (5.1);
  any change to the upload flow (5.6); any backend change at all — this
  story calls `GET /documents/{id}`, `GET /documents/{id}/fields`, and
  `GET /documents/{id}/extraction`, all already implemented, already
  authenticated and owner-scoped (4.1).
- This story does not remove or consolidate 3.3's existing inline fields
  summary on the upload page — that stays as-is; whether the upload flow
  is later simplified to link here instead of duplicating a summary is
  5.6's call, not required by this story.

## Capabilities

### New Capabilities
- `document-detail-view`: presenting one document's full extraction
  picture — raw text, every field with confidence/review status, and
  duplicate relationship — in a dedicated, read-only view.

### Modified Capabilities
- None. This story calls existing, unmodified endpoints
  (`document-ingestion`, `text-extraction`, `field-level-query`) and
  introduces no new backend behavior.

## Impact

- **Backend**: none. Purely a new frontend view over three already-
  implemented, already-authenticated endpoints.
- **Data**: none.
- **Frontend**: new Document Detail page/component; a small API client
  addition (`getDocument`, `getExtraction` — `getDocumentFields` already
  exists from 3.3) using the existing `authHeaders()` pattern; fills the
  `/documents/:id` route.
- **Dependencies**: soft dependency on 5.1 for the route it reserves (not
  hard-blocking — see design.md for what happens if built first).

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential, no
new backend endpoint at all. Every piece of data this story displays is
already authenticated and owner-scoped by the endpoints it calls (4.1).
Kept on `parser-standard`, matching the Sprints story's own suggested
classification.

## Rollback

Remove the Document Detail page/component and the small API client
addition. No backend, data, or existing-endpoint impact.
