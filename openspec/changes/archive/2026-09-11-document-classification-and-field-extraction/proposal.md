## Why

The system can currently get a document in, extract its raw text, and
tell whether it's a duplicate — but nothing yet reads what the document
is actually about. Per the BRD's functional requirement (FR3) and
business objective, the system must classify a document's type and pull
out whatever key/value facts are present in it, using the Anthropic LLM,
with no predefined field list constraining what "counts." This is Zoho
Sprints story **2.1 Document Classification & Free-Form Field Extraction
via LLM** (item `57591000000023018`) under epic **LLM-Based Free-Form
Extraction** (`57591000000024001`) in the Document Parser (MVP) project —
confirmed to exist in Sprints, not invented (see discuss.md). It is the
first story in that epic, depends on Story 1.2 (`text-extraction`, needs
extracted plain text to work on) and, per the epic split entry itself,
nominally on Story 1.3 (`duplicate-detection`, to avoid wasted LLM calls
on already-processed content) — see discuss.md and Impact for why this
story does not implement that skip yet.

BRD source: no standalone `docs/BRD.md` exists in this repo; the business
requirement referenced is the MVP product description captured in
`openspec/config.yaml`'s `context` block — specifically the "LLM extracts
useful information present in" a document, free-form extraction with no
template or predefined field list, and the hard constraint that extracted
values must be grounded in the source document.

**Schema note**: this proposal is drafted under `parser-sensitive`, not
the `parser-standard` default, per an explicit stop-and-flag decision
made with the user before drafting began. See the Risk Classification
table below for why.

## What Changes

- Add an LLM-based extraction capability: for a document whose text has
  already been extracted (1.2) successfully, send that text to the
  Anthropic LLM and have it (a) classify the document's type and (b)
  extract whatever key/value facts are present — no predefined field
  list or document-type template constrains what can be extracted.
- Classification and extraction happen in a single LLM call/response per
  document (not two separate calls), since both draw on the same model
  read of the document's content.
- Store results as field-level key/value records — one row per
  document/field pair, including the classified document type as one
  such field — never as document-type-specific columns, per the storage
  hard constraint. This story's storage is intentionally minimal and
  compatible with, not a preemption of, Story 3.1's dedicated field-level
  data model.
- Every extracted field/value is stored alongside a pointer back to
  where in the source text it came from (or an explicit "not directly
  quotable" marker), so nothing is presented as fact without a traceable
  basis in the document — the mechanism satisfying the grounding hard
  constraint.
- A document whose text extraction failed (no text layer, unreadable
  file) is never sent to the LLM — there's nothing groundable to extract
  from.
- Out of scope for this story: confidence scoring or flagging
  low-confidence output (2.2, a sibling story); the durable field-level
  data model and query/retrieval API (3.1/3.2, later epic — this story's
  storage is a minimal placeholder compatible with that future model);
  skipping the LLM call for documents already flagged as duplicates by
  1.3 (1.3 has not merged to `dev` as of this branch — see Impact);
  viewing/exporting results in a UI (3.3).

## Capabilities

### New Capabilities
- `llm-extraction`: sending an extracted document's text to the
  Anthropic LLM, classifying its document type, extracting free-form
  key/value facts with no predefined field list, and persisting results
  as grounded field-level records.

### Modified Capabilities
- None. `text-extraction`'s requirements (what gets extracted and how
  outcome is tracked) are unchanged — this story only reads its
  persisted `extracted_text` for documents whose extraction succeeded.

## Impact

- **Backend**: new Anthropic SDK client wrapper and API key
  configuration (environment-variable only, per data policy); a new
  extraction-orchestration step invoked after text extraction succeeds;
  prompt construction and response parsing for classification + free-form
  field extraction; a grounding check before persisting each field.
- **Data**: a new field-level results table (document ID, field name,
  field value, and a grounding pointer/quote into the source text) —
  minimal, compatible with the future dedicated model Story 3.1 will
  build; no document-type-specific columns.
- **Frontend**: none in this story (see Out of scope — 3.3 covers
  viewing results).
- **Dependencies**: depends on 1.2 (`text-extraction`, archived —
  extracted text must exist). Nominally depends on 1.3
  (`duplicate-detection`) per the epic split entry, but 1.3 has not been
  merged to `dev` as of this branch (it's still in progress on
  `feature/1.3-duplicate-detection`). Rather than block this story on an
  unmerged branch, this story runs the LLM call for every successfully
  extracted document, including ones that would eventually be flagged
  duplicate; wiring the duplicate-skip check is deferred to a follow-up
  once 1.3 lands on `dev` and is explicitly out of scope here (flagged,
  not silently dropped). No new dependency on Story 3.1's data model —
  this story's storage is deliberately minimal so it does not pre-empt
  that later story's design.

## Risk Classification (Stage 0b)

| Dimension | Applies? | Detail |
|---|---|---|
| Data model change | Yes | New field-level results table (document ID, field name, value, grounding pointer). Additive only; no existing table's columns change. |
| New external integration | **Yes** | First story to call the Anthropic LLM API. No prior story in this repo has an external service call of this kind. |
| Security/credential handling | **Yes** | Introduces the Anthropic API key as a live credential (environment variable only, never logged or committed) and sends production document content to a third-party service for the first time. |
| Multi-module / architecture | Yes | Cross-cuts the existing extraction pipeline (backend service), a new LLM client module, and new persistence — the first story to add an outbound network dependency to the synchronous upload→extraction flow. |

Given at least two dimensions apply squarely (external integration,
security/credential) and this story directly implicates the grounding
hard constraint, this is classified **parser-sensitive**, consistent
with `config.yaml`'s explicit rule not to downgrade for process
convenience. This differs from the precedent set by 1.1–1.3, where the
only trigger present was an additive data-model change judged
foundational plumbing — here, an external integration and credential
handling are both genuinely present.

## Rollback

Remove the Anthropic client wrapper and the post-extraction LLM call,
revert the migration adding the field-level results table, and stop
sending document text to the LLM. Documents already uploaded, extracted,
and duplicate-checked (1.1–1.3) are unaffected — this story only adds a
new step after extraction succeeds and does not alter any of their
recorded state.
