## Context

See proposal.md - Why. Relevant current state (from the actual 2.1
implementation, `backend/app/llm_extraction.py` and `models.py`):
`run_llm_extraction` sends a document's `extracted_text` to the
Anthropic client in one call, parses a `{"fields": [{field_name, value,
source_quote}, ...]}` JSON response, and for each entry calls
`is_grounded(source_quote, extracted_text)` — a whitespace-normalized
substring check — persisting only entries that pass as `ExtractionResult`
rows (`id`, `document_id`, `field_name`, `field_value`, `source_quote`,
`created_at`). The classified document type is persisted as a row with
`field_name = "_document_type"`, the same reserved-name convention as
every other field. `LlmExtraction` tracks the call's own outcome
(succeeded/failed + reason), independent of `DocumentExtraction.status`.
Note: `duplicate_of_id` (1.3) exists on `Document` but `run_llm_extraction`
does not currently check it — LLM extraction still runs for documents
later found to be duplicates. That gap is pre-existing and out of scope
here (not something this story introduces or is responsible for fixing).

## Goals / Non-Goals

**Goals:**
- Add a confidence score and a `needs_review` flag to every
  `ExtractionResult` row, computed for entries that already passed the
  existing mechanical grounding check.
- Ensure confidence isn't purely the model's self-report: an
  ambiguously-grounded match (normalized-only, or a `source_quote`
  found at multiple locations) is mechanically penalized regardless of
  what the model claims.
- Apply a threshold below which a record is flagged for review.

**Non-Goals:**
- Changing the grounding gate itself — an entry that fails
  `is_grounded` is still dropped entirely, before confidence scoring
  ever runs. This story only scores entries that already passed.
- Any API endpoint, UI, or human review workflow/action for a flagged
  record (3.2/3.3, and no review-action story exists yet).
- Wiring the duplicate-skip check (pre-existing gap, not this story's
  scope).
- Per-field confidence calibration/tuning beyond a single fixed
  threshold — no A/B or per-document-type threshold for the MVP.

## Decisions

**1. The model reports a `confidence` value (0.0-1.0) per field entry,
as an additional key in the existing structured-output response — not a
second LLM call.**
The prompt/response schema extends from `{field_name, value,
source_quote}` to `{field_name, value, source_quote, confidence}`.
- Alternative considered: compute confidence purely mechanically (e.g.,
  from match characteristics alone, no model input). Rejected — the
  model's own read of ambiguity (e.g., "this document doesn't clearly
  state whether this is a due date or an issue date") carries signal a
  purely mechanical check over the already-grounded text can't recover;
  discarding it entirely would throw away real information.
- This does not reopen the grounding decision 2.1 already made about
  not trusting self-reported claims: grounding is a binary fact/no-fact
  gate handled entirely mechanically, unchanged; confidence is a
  secondary, non-gating dimension applied only after that gate passes,
  and is itself mechanically adjusted (Decision 2) rather than trusted
  outright.

**2. Mechanical confidence adjustment runs after the model's
self-reported score, and can only lower it, never raise it.**
Two checks, each capping the final confidence if triggered:
- Not an exact substring match (only matched via `is_grounded`'s
  whitespace normalization) → cap confidence at a fixed ceiling below
  what an exact match could report.
- `source_quote` found at more than one position in `extracted_text`
  (a simple `str.count` check) → cap confidence at a fixed ceiling
  reflecting that ambiguity.
Both checks can apply to the same entry (the lower of the two caps
wins).
- Alternative considered: let the model's self-reported confidence stand
  unadjusted. Rejected — same reasoning as 2.1's grounding decision: an
  unverified model claim shouldn't be the sole determinant of something
  the hard constraint cares about ("ambiguous output must not be treated
  as confirmed fact"); a mechanical, inspectable check is added on top.
- Alternative considered: reject (not just downgrade) any non-exact or
  ambiguous-location match, treating it like a grounding failure.
  Rejected — that would conflate confidence with grounding and discard
  entries the BRD explicitly wants flagged and kept for review, not
  dropped.

**3. Threshold is a single fixed constant for the MVP (not
per-document-type or configurable via API/UI).**
A field-level record's `needs_review` is set when its final confidence
(after mechanical adjustment) falls below this constant.
- Alternative considered: make the threshold configurable per deployment
  or per document type. Rejected as premature — no story yet exposes
  configuration, and per-type tuning implies the kind of document-type-
  aware behavior the hard constraint's storage model explicitly avoids
  encoding structurally.

**4. `confidence` (nullable float) and `needs_review` (nullable
boolean, default false) added directly to the existing
`extraction_results` table — no new table.**
- Alternative considered: a separate `field_confidence` table joined to
  `extraction_results`. Rejected — one-to-one with no independent
  lifecycle; a join for data that's always read together adds complexity
  with no benefit at this cardinality, same reasoning 1.3 used for
  `duplicate_of_id` living directly on `Document`.

## Hard constraints confirmation

- **Grounded in source document**: unchanged and unaffected — the
  mechanical grounding gate (`is_grounded`) still runs first and
  unchanged; this story only adds scoring on top of what already passed
  it. Nothing ungrounded becomes easier to persist because of this
  story.
- **Field-level key/value storage model**: `confidence` and
  `needs_review` are added as columns on the existing per-field
  `extraction_results` row — still one row per document/field pair, no
  document-type-specific columns or tables introduced.

## Risks / Trade-offs

- [Self-reported model confidence could be systematically
  overconfident, understating true ambiguity even after mechanical
  adjustment] → Accepted for MVP; the mechanical checks (Decision 2)
  catch the specific ambiguity patterns the system can verify
  independently of the model (non-exact match, repeated location) — not
  a claim that this fully solves calibration, just that it doesn't rely
  solely on trusting the model.
- [Single fixed threshold may over- or under-flag depending on document
  type or field kind, with no tuning mechanism yet] → Accepted; revisit
  once real flagged/reviewed data exists to inform a better threshold or
  per-type approach — premature to guess now.
- [Extending the LLM response schema to include `confidence` could
  itself be a new source of response-shape drift] → Mitigated by
  reusing 2.1's existing response-parsing validation path: a response
  missing or malforming the new `confidence` key is treated as an
  invalid response the same way a missing `source_quote` already is,
  not a new unhandled failure mode.

## Migration Plan

- Add an Alembic migration adding nullable `confidence` (float) and
  `needs_review` (boolean, default false) columns to `extraction_results`.
- No changes to `document`, `document_extractions`, `llm_extractions`, or
  any existing column.
- Rollback: drop both columns via a down-migration; revert the prompt/
  response schema and the mechanical adjustment/threshold logic. No
  impact on already-persisted `ExtractionResult` rows' `field_name`/
  `field_value`/`source_quote` — only the two new columns are affected.
