## Why

The upload flow works but gives minimal feedback: a file picker, an
Upload button, and a handful of static alerts once the (single,
synchronous) request completes. Zoho Sprints story **5.6 Upload UX
Polish** (item `57591000000028010`) — a UI Showcase story with no epic
(workspace plan limitation) — asks for drag-and-drop, per-stage
progress, and an inline result feed to make that flow feel responsive
and informative rather than a black box.

## What Changes

- Add drag-and-drop file selection alongside the existing file picker
  button on `UploadPage.tsx`.
- Add a progress indicator shown while the upload request is in flight.
  **Honesty note (a real constraint, not glossed over):** the backend's
  `/documents/upload` endpoint is a single synchronous call — it doesn't
  emit intermediate progress events as it moves through extraction,
  duplicate detection, and LLM classification server-side, and adding
  such a stream would be a backend change outside this story's
  `parser-rapid` scope (no new endpoints). The progress indicator is
  therefore a client-side approximated sequence during the wait, and the
  actual per-stage *outcomes* are revealed from the single response once
  it returns — not a claim of real-time backend progress.
- Add an inline result feed: once the response returns, present what
  happened as a short sequence of outcomes (uploaded → text extraction
  succeeded/failed → duplicate status → fields extracted/flagged count)
  derived entirely from the existing response fields, replacing the
  current static alert stack with a clearer narrative.
- Out of scope for this story: the document library (5.1), detail view
  (5.2), or any other page (5.3-5.5); any backend change — this story
  reshapes presentation and interaction around data the upload response
  already returns.

## Impact

- **Backend**: none.
- **Data**: none.
- **Frontend**: `UploadPage.tsx` updated in place (drag-and-drop, a
  progress indicator, and a result-feed presentation replacing the
  current static alerts); no new page, no new dependency required for
  drag-and-drop (native HTML5 drag/drop events, no library needed).

## Risk Classification (Stage 0b)

| Dimension | Applies? | Detail |
|---|---|---|
| Data model change | No | No schema touched. |
| New external integration | No | No external service involved. |
| Security/credential handling | No | No credential introduced or touched; reuses the existing `authHeaders()` pattern unchanged. |
| Multi-module | No | Confined entirely to `UploadPage.tsx`. |

None of `config.yaml`'s risk triggers apply. Genuinely bounded,
low-risk, frontend-only interaction polish — matches `parser-rapid`'s
criteria as confirmed in discuss.md, and the Sprints story's own
suggested classification.

## Rollback

Revert `UploadPage.tsx` to its prior state. No backend, data, or other
page impact.
