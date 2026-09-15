## Why

Story 2.1 already refuses to persist a value it can't trace back to the
document's text at all — but a value that passes that mechanical
grounding check can still be a misread, a misclassification, or a
genuine ambiguity the model wasn't sure about. Per the BRD (FR4, the
accuracy/no-fabrication expectation, and Risk (a): "LLM misclassifies or
extracts noise as fact"), every extracted field needs a confidence
indicator, and anything low-confidence or ambiguous must be flagged for
human review rather than presented as settled fact. This is Zoho
Sprints story **2.2 Confidence Scoring & Low-Confidence Flagging** (item
`57591000000024013`) under epic **LLM-Based Free-Form Extraction**
(`57591000000024001`) in the Document Parser (MVP) project — confirmed
to exist in Sprints via the Zoho Sprints MCP, not invented. It depends on
Story 2.1 (`llm-extraction`, archived — needs the raw extraction output
to score) and, per the epic split entry, should fit the field-level
record shape Story 3.1 will later formalize.

BRD source: no standalone `docs/BRD.md` exists in this repo; the
business requirement referenced is the MVP product description captured
in `openspec/config.yaml`'s `context` block, specifically the grounding
hard constraint ("unsupported or ambiguous output must not be treated as
confirmed fact") that this story operationalizes for the "ambiguous but
technically grounded" case 2.1's binary check doesn't cover.

## What Changes

- Extend the existing LLM extraction call (2.1) to request a per-field
  confidence indicator alongside each `{field_name, value, source_quote}`
  entry, rather than adding a second LLM call or a new integration.
- Add a mechanical confidence adjustment on top of the model's
  self-reported figure: an entry whose `source_quote` matched only after
  whitespace normalization (not an exact substring), or whose
  `source_quote` appears more than once at different positions in the
  document's text (ambiguous location), has its confidence capped down
  rather than trusting the model's own number unchecked — consistent
  with 2.1's precedent that self-reported claims alone don't satisfy the
  grounding/certainty bar.
- Every extraction result (already mechanically grounded per 2.1) now
  carries a confidence score and a `needs_review` flag; an entry below a
  defined confidence threshold is flagged `needs_review = true` rather
  than presented as confirmed. It is still stored — flagging, not
  discarding, is the mechanism (per the BRD's own framing: "flagged for
  human review rather than stored as fact," i.e. stored, but marked as
  not-yet-confirmed).
- The classified document type (stored as a field-level record per
  2.1's reserved-name convention) also carries a confidence score and
  can be flagged, using the same mechanism as any other field.
- Out of scope for this story: the mechanical grounding gate itself
  (unchanged — an ungrounded value is still dropped entirely, before
  confidence scoring ever applies); any API or UI surfacing of
  confidence/flags (3.2/3.3); the durable field-level data model (3.1);
  human review workflow/actions on a flagged entry (no story for that
  yet).

## Capabilities

### New Capabilities
- None. This behavior layers directly onto the existing extraction flow;
  it does not stand alone as an independently operable capability.

### Modified Capabilities
- `llm-extraction`: extraction results now carry a confidence score and
  a `needs_review` flag; low-confidence or ambiguously-grounded entries
  are flagged rather than presented as confirmed fact. The mechanical
  grounding requirement itself is unchanged.

## Impact

- **Backend**: extends the existing LLM prompt/response schema (2.1's
  `llm_extraction.py`) to include confidence per field; adds the
  mechanical confidence-adjustment logic (exact vs. normalized-only
  match, ambiguous/repeated `source_quote` location); adds a threshold
  check setting `needs_review`.
- **Data**: two new nullable columns on the existing `extraction_results`
  table (`confidence`, `needs_review`) — additive only, no new table, no
  change to any other table's columns.
- **Frontend**: none in this story (see Out of scope — 3.2/3.3 cover
  surfacing this).
- **Dependencies**: depends on 2.1 (`llm-extraction`, archived — the
  extraction call and grounding gate this story layers on top of). No
  new dependency on Story 3.1's data model — the two new columns are
  additive to 2.1's existing minimal table, same posture 2.1 itself took
  toward 3.1.

**Schema classification note**: per `config.yaml`'s risk dimensions —
no new external integration (reuses 2.1's existing Anthropic call), no
new credential, and the data-model change is two nullable columns added
to an already-existing table (not a new integration surface or a change
to how data is stored/secured). This differs from 2.1, which introduced
the external integration and credential itself; this story only adds a
scoring dimension on top of that already-approved integration. Kept on
`parser-standard`, consistent with the Sprints story's own suggested
classification.

## Rollback

Remove the confidence field from the LLM prompt/response schema and the
mechanical adjustment logic, revert the migration adding `confidence` and
`needs_review`, and stop setting either. Existing extraction results
(2.1) are unaffected — this story only adds two nullable columns and new
logic around them; nothing about which values get persisted or how
grounding is enforced changes.
