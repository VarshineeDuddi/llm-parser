## Context

See proposal.md - Why. Relevant current state (from the actual code):
`GET /documents/{document_id}/fields` (3.2, in `backend/app/routers/
documents.py`) returns `list[FieldResultOut]` directly (not paginated —
3.2's own design judged by-document naturally bounded), each with
`field_name`, `field_value`, `confidence`, `needs_review`, `created_at`.
`frontend/src/UploadPage.tsx` already renders upload/extraction/
duplicate status via MUI `Alert` components after a successful upload,
using `DocumentOut` from `frontend/src/api/documents.ts`'s
`uploadDocument`. No router, no document-list page, no existing pattern
for tabular data display in the frontend yet.

## Goals / Non-Goals

**Goals:**
- Fetch and display a document's fields inline on the upload page once
  processing completes.
- Visually distinguish `needs_review` fields.
- Handle the zero-fields case explicitly.
- Client-side CSV export of the displayed fields.

**Non-Goals:**
- Any routing, document list, or document history/browse page (see
  proposal.md's Scope note).
- Any correction/edit action on a flagged field (explicitly out of BRD
  scope).
- A new backend endpoint — reuses 3.2's existing
  `GET /documents/{document_id}/fields` as-is.
- Any format beyond CSV for export (JSON export would be a trivial
  follow-on if ever requested, but isn't part of this story).
- Displaying the classified document type (`_document_type` reserved
  field) any differently from other fields — it appears in the same
  table like any other field, consistent with 2.1/3.1's convention that
  it's just a field with a reserved name, not a special UI element. Any
  distinct treatment is a future enhancement, not required here.

## Decisions

**1. Fields fetch happens automatically after a successful upload, as
part of the existing `handleSubmit` flow in `UploadPage.tsx` — not a
separate user-triggered "load fields" action.**
Mirrors how `extraction_status` and `duplicate_of_id` are already shown
automatically today; fields are just another piece of the same
already-fetched-after-upload picture.
- Alternative considered: a "View Fields" button the user clicks to
  trigger the fetch. Rejected — adds a click for no benefit; the data is
  cheap to fetch (already a single GET, no pagination needed for one
  document) and the user just uploaded specifically to get this result.

**2. A small new MUI table (or equivalent list) renders each field row,
with a `needs_review` row visually flagged via a MUI `Chip`/color
treatment (e.g., a "Needs review" chip, or a warning-colored row) rather
than a separate "flagged fields" section.**
- Alternative considered: two separate lists (confirmed fields,
  flagged fields). Rejected — splits what's conceptually one result set
  into two, complicating the "no fields at all" empty state (would need
  to handle "no fields in either list" vs "no flagged fields" as
  different states) for no clear benefit over an inline visual flag on
  one unified list.

**3. Export is implemented as a pure client-side function: take the
already-fetched `FieldResultOut[]`, build a CSV string in-browser, and
trigger a download via a Blob/object URL — no network call.**
- Alternative considered: a backend export endpoint returning
  `text/csv`. Rejected per proposal.md's Scope note — the data is
  already on the client after the fields fetch; a server round-trip to
  reformat data the browser already has adds a new backend surface this
  story's boundary explicitly excludes ("not the query API itself").

**4. No-fields state distinguishes "extraction/LLM processing hasn't
succeeded" from "processing succeeded but produced zero grounded
fields," using the already-available `extraction_status` (from
`DocumentOut`, already displayed) as context, rather than the fields
list alone.**
An empty `fields` array is ambiguous on its own (could mean "still
processing," "failed," or "succeeded with nothing groundable"); pairing
it with the existing `extraction_status` alert gives the user a reason,
not just an absence.
- Alternative considered: treat every empty-fields case identically with
  one generic "No fields available" message. Rejected — the existing
  `extraction_status`/`extraction_failure_reason` alerts already
  distinguish failure from success on this same page; ignoring that
  context for the fields section specifically would be a regression in
  clarity relative to what's already shown today.

## Risks / Trade-offs

- [Client-side-only fetch means a user who navigates away loses the
  ability to re-view a past document's fields, since there's no
  document-list/browse page] → Accepted per proposal.md's Scope note;
  building that page is a materially larger feature not requested by
  this story or the epic split.
- [CSV export via Blob/object URL relies on browser download behavior
  the sandboxed preview environment used during development may not
  fully exercise] → Mitigated by manual verification in a real browser
  as part of this story's test plan (see tasks.md), not solely
  relying on automated component tests.
- [No pagination on the fields fetch, matching 3.2's own by-document
  design choice — a document with an unusually large number of fields
  renders them all at once] → Accepted; consistent with 3.2's existing
  decision that by-document is naturally bounded, not a new risk this
  story introduces.

## Migration Plan

Not applicable — no backend or schema change. This story adds frontend
code only.

Rollback: revert the `UploadPage.tsx` changes and remove the new API
client function. No other impact.
