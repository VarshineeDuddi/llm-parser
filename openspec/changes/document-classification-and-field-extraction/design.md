## Context

See proposal.md - Why. Relevant current state: `text-extraction` (1.2)
persists `extracted_text` per document in `document_extractions`
(`status` succeeded/failed, `failure_reason`, `extracted_at`), running
synchronously right after upload. `duplicate-detection` (1.3) adds a
`content_hash` on that same table and a `duplicate_of_id` on `Document`,
but has not merged to `dev` as of this branch — this design does not
depend on or reference those columns. No LLM integration exists yet
anywhere in the codebase; this is the first. No field-level results table
exists yet either — Story 3.1 (a later epic) owns the durable, queryable
version of that model; this story needs a place to land its own output
now, so it introduces a minimal table under the same field-level
constraint, not a competing one.

## Goals / Non-Goals

**Goals:**
- Classify a document's type and extract free-form key/value facts from
  its extracted text via the Anthropic LLM, immediately after text
  extraction succeeds.
- Persist only grounded results, as field-level records, with a
  traceable pointer back into the source text.
- Track LLM extraction outcome (succeeded/failed + reason) per document,
  independent of text-extraction's own outcome.

**Non-Goals:**
- Confidence scoring beyond the binary grounded/not-grounded filter
  (2.2's job).
- The durable, queryable field-level data model and any query/retrieval
  API (3.1/3.2) — this story's table is intentionally minimal.
- Duplicate-skip enforcement (deferred until 1.3 merges — see
  proposal.md Impact).
- Any UI surfacing of results (3.3).
- Multi-call or agentic extraction strategies (chunking very long
  documents, multi-turn refinement) — one LLM call per document for the
  MVP.

## Decisions

**1. Classification and field extraction happen in one LLM call, via a
single structured-output request, not two separate calls.**
The prompt asks the model to return a single JSON object: a classified
`document_type` string plus a list of `{field_name, value, source_quote}`
entries, where `source_quote` must be a substring the system can verify
appears in the document's `extracted_text`.
- Alternative considered: two calls (classify, then extract using the
  classified type as context). Rejected for the MVP — doubles LLM cost
  per document (directly working against the BRD's cost-awareness
  concern) for a benefit (type-informed extraction prompting) that free-
  form extraction with no predefined field list doesn't clearly need.

**2. Grounding is enforced mechanically, not just by prompting.**
Prompting the model to only report grounded facts is necessary but not
sufficient — the hard constraint requires the system itself not to treat
unsupported output as fact. After the LLM responds, the system verifies
each entry's `source_quote` is an actual substring of that document's
`extracted_text` (whitespace-normalized, same normalization as 1.3's
content hashing). An entry whose `source_quote` doesn't verify, or is
missing, is dropped before persistence — never stored as a confirmed
field/value.
- Alternative considered: trust the model's own confidence/grounding
  self-report. Rejected — self-reported grounding is exactly the kind of
  unverified claim the hard constraint says not to treat as fact; a
  mechanical substring check is verifiable and requires no model
  cooperation.
- This substring check is deliberately strict (and will reject some
  genuinely-grounded paraphrased facts) — accepted trade-off, see Risks.

**3. Results stored in a new, minimal `extraction_results` table:
`id`, `document_id` (FK), `field_name`, `field_value`, `source_quote`,
`created_at` — one row per field, document type included as a row with
a reserved `field_name` (e.g. `_document_type`) rather than a separate
column.**
A second small table/columns track the LLM call's own outcome, mirroring
1.2's pattern: `document_id` (FK, unique), `status`
(`succeeded`/`failed`), `failure_reason`, `extracted_at`.
- Alternative considered: wait for Story 3.1's data model before storing
  anything. Rejected — this story has to persist its output somewhere to
  be usable at all, and 3.1 is a later epic with no committed shape yet;
  blocking on it would stall this story indefinitely.
- Alternative considered: a JSON blob column on `Document` holding all
  extracted fields. Rejected — directly violates the field-level
  key/value hard constraint (one record per document/field pair).
- Naming this table `extraction_results` (not `document_fields` or
  similar) leaves room for 3.1 to define the "real" long-term table
  under its own name without a naming collision; migrating this story's
  rows into 3.1's model, if needed, is that story's concern.
- Reusing the document-type-as-reserved-field-name approach (rather than
  a `document_type` column on `Document`) keeps the pattern consistent:
  nothing about a document's classification varies the schema shape.

**4. Anthropic API key sourced from an environment variable, read once
at startup via the existing settings/config module (established in
1.1's scaffolding), never logged.**
The extraction service logs LLM call outcome (succeeded/failed, latency,
token counts) but never the document text sent or the raw model
response, per the data policy (production document content must not be
written to application logs).

## Hard constraints confirmation

- **Grounded in source document**: enforced mechanically (Decision 2),
  not merely by prompt instruction — an ungrounded or unverifiable value
  is dropped before it is ever persisted, so nothing unsupported reaches
  storage as a "confirmed fact."
- **Field-level key/value storage model**: `extraction_results` stores
  exactly one row per document/field pair, including document type as a
  reserved-name field row, with no document-type-specific columns or
  tables — directly satisfying this constraint and staying compatible
  with the future template-driven capability the constraint anticipates.

## Risks / Trade-offs

- [Anthropic API cost scales per document, uncontrolled while 1.3's
  duplicate-skip isn't wired in yet] → Accepted for this story per
  proposal.md's Impact; flagged explicitly as a deferred follow-up, not
  silently absorbed. Revisit as soon as 1.3 merges to `dev`.
- [Substring-match grounding check is strict and will reject some
  genuinely-grounded but paraphrased facts, reducing recall] → Accepted;
  false rejection (dropping a true fact) is a materially safer failure
  mode than false acceptance (persisting a fabricated one) given the
  hard constraint's framing ("must not be treated as confirmed fact").
- [Single LLM call per document means a very long document's text could
  exceed context or produce incomplete extraction] → Accepted for MVP
  scope; chunking/multi-call strategies are explicitly a Non-Goal here.
- [LLM response format drift (model doesn't return valid structured
  JSON)] → Treated as a failed LLM extraction outcome (Requirement: LLM
  Extraction Outcome Tracking), not a crash — the response parser
  validates shape before any field is considered for grounding checks.

## Migration Plan

- Add an Alembic migration creating `extraction_results` (FK to
  `document.id`) and the LLM extraction outcome tracking
  table/columns.
- No changes to `document`, `document_extractions`, or their existing
  columns or migration history.
- Rollback: drop the new table(s) via a down-migration; remove the
  post-extraction LLM call and the Anthropic client wrapper. No impact
  on already-stored documents, extracted text, or duplicate-detection
  state.

## Open Questions

- Whether `extraction_results` will later be replaced wholesale by
  Story 3.1's data model, or 3.1 builds on top of it (e.g. adding
  indexing/query support to the same table). This does not change this
  story's specs, approach, or tasks — it only affects how much of this
  story's schema Story 3.1 reuses versus supersedes, which is that
  story's decision to make when it starts.
