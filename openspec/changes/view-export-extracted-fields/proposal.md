## Why

Story 3.2 made a document's extracted fields retrievable via an API, but
nothing yet presents them to the person who uploaded the document. Per
the BRD (FR8's view/export portion), a user needs to see a document's
extracted fields and export them, with review of low-confidence fields
happening by looking at what's flagged rather than through a dedicated
correction workflow (explicitly out of scope). This is Zoho Sprints
story **3.3 View/Export Extracted Fields for a Document** (item
`57591000000025013`) — confirmed to exist in Sprints, not invented. It
depends on Story 3.2 (`field-level-query`, archived — needs the
retrieval API).

**Epic note (checked, not silently picked):** this story is numbered
"3.3" and its own dependency text refers to Story 3.2, both suggesting
epic **Field-Level Extraction Storage & Query** (`57591000000025001`).
However, its actual `epicId` in Sprints is `57591000000022028`
(**Access Scoping for Extraction Results**, epic 4) — the same epic as
Story 4.1. This looks like a data mismatch in the Sprints backlog (the
story's own content is a clean continuation of 3.1→3.2→3.3, not related
to access scoping) rather than an intentional placement, but I'm not
silently reassigning it. Referencing the epic Sprints actually has on
file (`57591000000022028`) here, flagging the discrepancy for a human to
confirm/correct in Sprints.

BRD source: no standalone `docs/BRD.md` exists in this repo; the
business requirement referenced is `openspec/config.yaml`'s `context`
block and the query API 3.2 built.

**Scope note (a reasonable assumption, recorded per project convention
rather than assumed silently):** the frontend has no router and no
document-list/browse page — `App.tsx` renders `UploadPage` directly, and
no "list all documents" endpoint exists to browse against. This story
scopes "view" as inline display on the upload page for the document just
processed (not a new routed document browser) and "export" as a
client-side CSV download of the already-fetched fields (no new backend
endpoint) — consistent with "preserve existing architecture unless
justified" and the story's own boundary ("not the query API itself").

## What Changes

- Extend the existing upload page to show a document's extracted fields
  inline once processing completes, alongside the upload/extraction
  status it already shows.
- Visually distinguish a field flagged `needs_review` from one that
  isn't, so a user can tell an unconfirmed value from a confirmed one at
  a glance — this is what makes "review happens via querying flagged
  records directly" (per the BRD's own scope note) actually usable by a
  person, not just an API consumer.
- Show a clear message when a document has no extracted fields (text
  extraction or LLM extraction failed, or nothing was grounded) rather
  than an empty or broken-looking table.
- Add an "Export" action that downloads the currently-displayed fields
  as a CSV file (field name, value, confidence, needs-review) — built
  from data already fetched via 3.2's existing by-document endpoint, no
  new backend read surface.
- Out of scope for this story (per the BRD's own Scope note and this
  story's boundary): any correction/edit workflow for a flagged field;
  a document list/browse/history page; any new backend query endpoint
  (reuses 3.2's `GET /documents/{document_id}/fields` as-is).

## Capabilities

### New Capabilities
- `field-level-view`: presenting a document's extracted fields (with
  confidence/review status) to the user inline after processing, and
  exporting them as a downloadable file.

### Modified Capabilities
- None. `field-level-query`'s API (3.2) is unchanged — this story only
  calls the existing by-document endpoint. `llm-extraction` and
  `field-level-storage` are unaffected.

## Impact

- **Backend**: none. No new endpoint, no schema change — this story is
  entirely a frontend presentation/export layer over 3.2's existing API.
- **Data**: none.
- **Frontend**: extends `UploadPage.tsx` (or a new component it renders)
  to fetch and display `GET /documents/{document_id}/fields` after a
  successful upload, plus a CSV export action; a small new API client
  function in `api/documents.ts` for the fields fetch (mirroring
  `uploadDocument`'s existing pattern).
- **Dependencies**: depends on 3.2 (archived — the by-document endpoint
  this story calls). No dependency on Story 4.1 (access scoping) to
  function — same posture as 3.2 itself (see 3.2's own Sequencing note);
  this story doesn't add any new backend surface, so it doesn't expand
  that gap either.

**Schema classification note**: per `config.yaml`'s risk dimensions — no
data-model change, no new external integration, no new credential, no
new backend endpoint at all. A frontend-only presentation layer over an
already-approved, already-shipped API. Consistent with the Sprints
story's own suggested `parser-standard` classification.

## Rollback

Remove the fields-display section and export action from the upload
page, and the small API client addition. No backend, data, or existing-
endpoint impact — this story adds no server-side surface to roll back.
