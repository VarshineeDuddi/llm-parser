## Sprints story

**5.7 UI Shell & Visual Design** (item `57591000000028015`) — a UI
Showcase story with no epic (workspace plan limitation, per the story's
own description; confirmed to exist in Sprints via the Zoho Sprints MCP
— note: the initial request named this "Filtered Extraction Export,"
which doesn't exist anywhere in the backlog; confirmed with the user
that the real story is 5.7 UI Shell & Visual Design before proceeding).

## Scope

Follow-up to Stories 5.1-5.6 (all merged, confirmed against the actual
current frontend code, not just the Sprints description): a shared app
shell wrapping all routes, a real MUI theme, formatted display helpers
(file size, dates, status chips, a confidence indicator), and loading/
empty states — applied across all five existing data pages. Confirmed
genuinely matches `parser-rapid`'s criteria (no data-model change, no
new external integration, no security/credential surface, no change to
field-discipline/key-value-storage rules) before drafting further —
purely visual/presentation layer.

## Users

Every user of the application — this touches the shell and every
existing page's presentation, though not what data is shown or how it's
fetched.

## Risks

- Low from a correctness standpoint (no logic change), but real
  regression risk from a coverage standpoint: this story touches all six
  existing pages' rendering, so it's the first change with a chance to
  visually or structurally break something already working across the
  whole app at once. Mitigated by keeping each page's data-fetching and
  conditional logic untouched — only presentation markup/styling
  changes.
- Confirmed directly against the actual code (not just the story
  description) that `field.confidence` is never rendered anywhere today
  — only the `needs_review` boolean, via a plain Chip. The story's claim
  of a coverage gap here is accurate, not stale.
- Confirmed each existing page currently has no navigation back to the
  library except `DocumentLibraryPage` itself, which hardcodes its own
  nav buttons — the shared app shell this story adds is a real
  usability fix, not just visual polish.
