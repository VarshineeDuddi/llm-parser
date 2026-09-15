## Sprints story

**5.6 Upload UX Polish** (item `57591000000028010`) — a UI Showcase
story with no epic (workspace plan limitation, per the story's own
description; confirmed to exist in Sprints via the Zoho Sprints MCP, not
invented).

## Scope

Upgrade the existing upload page's interaction: drag-and-drop file
selection, a per-stage progress indicator (uploading → extracting →
classifying → duplicate check), and an inline result feed — upgrading
`frontend/src/UploadPage.tsx` in place, not replacing it. No new
endpoint, no data-model change; confirmed genuinely matches
`parser-rapid`'s criteria (no data-model change, no new external
integration, no security/credential surface, no change to field-
discipline/key-value-storage rules) before drafting further.

## Users

The person uploading a document — this is purely an interaction/
feedback improvement to a flow that already works, not a new capability.

## Risks

- Low. Purely frontend interaction polish over an already-working,
  already-authenticated upload flow (4.1). The main risk is UX-level
  (accurately reflecting backend stage timing that isn't separately
  observable today — see below), not correctness or security.
- The upload endpoint today is a single synchronous request/response
  (upload → extraction → duplicate check → LLM extraction all happen
  server-side before the response returns) — there's no intermediate
  progress signal from the backend to drive a true per-stage indicator.
  This affects how "per-stage progress" can honestly be implemented; see
  tasks.md for the resolution (a client-side approximated sequence, not
  a fabricated claim of real backend progress events).
