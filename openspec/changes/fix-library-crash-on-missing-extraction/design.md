## Context

See proposal.md - Why, which includes the confirmed root cause.
Relevant current state (from the actual code):
`_document_out(document, db)` in `backend/app/routers/documents.py`
calls `db.execute(select(DocumentExtraction).where(...)).scalar_one()`
— raises `NoResultFound` (unhandled) if no row exists.
`list_documents()` builds its page via
`[_document_out(document, db) for document in documents]`, so one raise
aborts the whole page. `get_document()` and `upload_document()` also
call `_document_out()` and are equally vulnerable, just with a smaller
blast radius (one document's own request, not a shared list).
`run_extraction()` (`backend/app/extraction.py`) always creates a
`DocumentExtraction` row in normal operation, but as a separate
transaction from the `Document` row's own commit.

## Goals / Non-Goals

**Goals:**
- `_document_out()` never raises when a document's extraction row is
  missing.
- The resulting state is explicit and observable (not a silently
  fabricated "succeeded"/"failed"), consistent with how every other
  ambiguous state in this codebase is handled (2.1's grounding,
  3.3/5.2's no-fields/no-text states).
- One document's missing row doesn't affect any other document in a
  list response.

**Non-Goals:**
- Closing the write-path race itself (wrapping the two commits in one
  transaction, or reconciling orphaned rows). Flagged in proposal.md's
  Impact as a separate, undecided reliability question — this change
  fixes the read path unconditionally, regardless of why the gap exists
  or whether it's later closed at the source.
- Any frontend change. `extraction_status` is already a plain string;
  an unrecognized value displays as-is rather than being unstyled-but-
  hidden, which is acceptable for what should be a rare edge case.
- Retrying or auto-repairing the missing extraction row on read (e.g.,
  triggering `run_extraction` again from the list endpoint) — a
  meaningfully different, riskier change (re-running extraction as a
  side effect of a read) not needed to fix the reported crash.

## Decisions

**1. `_document_out()` uses `.scalar_one_or_none()` and synthesizes an
explicit `"unknown"` extraction status (with a fixed explanatory
`extraction_failure_reason`) when the row is absent, instead of
raising.**
- Alternative considered: treat a missing row the same as a `"failed"`
  extraction. Rejected — conflates two different situations (extraction
  ran and failed, vs. extraction outcome was never recorded at all);
  `"unknown"` is honest about what's actually known, matching this
  project's consistent preference for explicit states over conflated or
  fabricated ones.
- Alternative considered: omit the affected document from list results
  rather than showing it with an unknown state. Rejected — silently
  hiding a document a user actually uploaded is worse than showing it
  with an honest "we don't know its extraction outcome" state; the
  document itself is real and owned by the caller, it's specifically the
  extraction record that's missing.

**2. One shared fix, not four separate ones.**
Since all four affected endpoints (list, get-by-id, upload response, and
implicitly any future caller) go through the same `_document_out()`
helper, fixing it once fixes all of them uniformly — no endpoint-
specific logic needed.

## Risks / Trade-offs

- [The underlying write-path race that produces this state at all is
  not closed by this change] → Accepted and explicitly flagged
  (proposal.md Impact) as a separate decision, not silently left
  unaddressed. This change makes the symptom (a crash) never happen
  again regardless of whether the root cause is ever fixed.
- [A document stuck in `"unknown"` state has no path back to
  `"succeeded"`/`"failed"` without direct database intervention or a
  future reconciliation story] → Accepted; out of this fix's scope per
  the Non-Goals above. Worth a human's attention if it turns out to
  happen often in practice, which this fix doesn't investigate.

## Migration Plan

Not applicable — no schema change. Pure application-code fix.

Rollback: revert `_document_out()` to its prior form. No data or schema
impact.
