## Why

Stories 5.1-5.6 are functionally complete but visually and structurally
rough: no shared navigation (each page hardcodes its own nav buttons,
and most have none at all), no custom theme (default MUI indigo/
Roboto), raw unformatted data (`size_bytes` as a bare integer, status
strings shown verbatim, duplicate as plain "Yes"/"No"), the per-field
`confidence` value the backend already computes is never shown anywhere
(only the `needs_review` boolean), and pages render blank while
fetching. Zoho Sprints story **5.7 UI Shell & Visual Design** (item
`57591000000028015`) — a UI Showcase story with no epic — addresses all
of this as a visual/presentation pass over the now-complete set of
pages.

## What Changes

- Add a shared app-shell/layout component (persistent nav — sidebar or
  top bar) wrapping every route in `App.tsx`, replacing
  `DocumentLibraryPage`'s hardcoded nav buttons and giving every other
  page navigation it currently lacks.
- Add a real MUI theme via `createTheme` (palette + typography),
  applied through a `ThemeProvider` at the app root.
- Add formatted display helpers and apply them across
  `DocumentLibraryPage`, `DocumentDetailPage`, `FieldExplorerPage`,
  `DocumentTypeBrowserPage`, and `NeedsReviewQueuePage`:
  - human-readable file size (not a bare byte count)
  - short/relative formatted dates (not a raw `toLocaleString()` dump)
  - color-coded status chips (replacing plain lowercase status text)
  - a confidence indicator (bar or percentage) shown next to each field,
    surfacing `ExtractionResult.confidence` for the first time anywhere
    in the UI, alongside the existing `needs_review` chip
- Add loading skeletons and explicit empty states where pages currently
  render nothing while their data fetch is in flight.
- Out of scope for this story: any new endpoint, any change to what data
  is fetched or when, any change to existing data contracts or business
  logic — this is presentation/formatting only, over already-working
  pages.

## Impact

- **Backend**: none.
- **Data**: none.
- **Frontend**: new shared layout component; a `theme.ts` (or similar)
  defining the MUI theme; new formatting helper functions (file size,
  date, status color mapping, confidence display); `App.tsx` updated to
  wrap routes in the layout and apply the theme; all five data pages
  updated to use the formatting helpers, the confidence indicator, and
  loading/empty states, with their existing data-fetching logic
  unchanged.

## Risk Classification (Stage 0b)

| Dimension | Applies? | Detail |
|---|---|---|
| Data model change | No | No schema touched. |
| New external integration | No | No external service involved. |
| Security/credential handling | No | No credential introduced or touched. |
| Multi-module | Partial | Touches every existing frontend page's presentation layer, but each page's own data-fetching/business logic is unchanged — a broad but shallow, purely visual change, not a cross-cutting architectural or backend one. |

No dimension crosses a trigger requiring `parser-standard` or
`parser-sensitive` — confirmed in discuss.md before drafting. Genuinely
bounded, low-risk visual polish across already-shipped pages. Kept on
`parser-rapid`, matching the Sprints story's own suggested
classification.

## Rollback

Revert the shell/theme/formatting-helper changes and each page's use of
them. No backend, data, or data-fetching logic is touched by this story,
so rollback is a pure frontend revert with no other impact.
