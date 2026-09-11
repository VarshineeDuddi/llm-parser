## Sprints story

**2.1 Document Classification & Free-Form Field Extraction via LLM**
(item `57591000000023018`) under epic **LLM-Based Free-Form Extraction**
(`57591000000024001`) in the Document Parser (MVP) project, workspace
`60084866118`, project `57591000000022002`. Confirmed to exist in Sprints
via the Zoho Sprints MCP (not assumed or invented).

## Scope

For a document whose text has already been extracted (1.2), classify the
document's type and extract whatever key/value facts are present in it
using the Anthropic LLM — no predefined field list or document-type
template constrains what gets extracted. Boundary: this covers the core
LLM classification/extraction call itself, not confidence scoring on its
output (2.2, a sibling story) or the field-level storage shape those
results land in (3.1, a sibling story in a later epic).

## Users

Internal: this is a backend capability with no direct UI in this story;
its output is what a later story (3.3, View/Export Extracted Fields)
will eventually surface to the person who uploaded the document. The
people affected by getting this right are that end user (who needs
extracted facts to actually reflect their document, not a fabrication)
and whoever operates the system (who bears the Anthropic API cost per
call).

## Risks

- **Grounding**: the hard constraint that extracted fields must be
  grounded in the source document and unsupported/ambiguous output must
  not be treated as confirmed fact is squarely this story's problem —
  the LLM call is the one place fabrication could enter the system.
- **Cost**: per the BRD's cost-awareness requirement, every processed
  document is expected to trigger a paid LLM call; this is the first
  story that actually spends that cost, and duplicate-skip enforcement
  (1.3) is not yet available on this branch's base (see Dependencies) so
  no cost-avoidance short-circuit exists yet.
- **Credential handling**: this is the first story wiring a real
  Anthropic API key into the system — must come from environment
  variables/secrets, never hardcoded or logged, and production document
  content sent to the LLM must not be written to application logs (data
  policy).
- **External dependency**: first outbound call to a third-party service;
  availability/latency/rate-limit behavior of the Anthropic API becomes
  a new failure mode for the upload→extraction pipeline.
- **Free-form output shape**: with no fixed field list, the LLM's output
  shape can vary document to document, which the storage design (this
  story, ahead of 3.1's dedicated data-model story) has to accommodate
  without encoding document-type-specific structure.

## Dependencies

- **Story 1.2 (`text-extraction`, archived)**: this story consumes
  `text-extraction`'s persisted `extracted_text` per document. 1.2 used
  the `parser-standard` schema, which has no `discuss.md` to inherit
  from — this discuss.md is independently derived for this LLM-extraction
  layer, not a continuation of the same cycle.
- **Story 1.3 (`duplicate-detection`, in progress, not yet merged to
  `dev` as of this branch)**: per 1.3's own proposal, this story is where
  a duplicate-skip check would eventually avoid a redundant paid LLM
  call, but 1.3 has not landed on `dev` yet at the time this branch was
  created from it. This story does not depend on 1.3's columns to
  function and will not implement duplicate-skip enforcement; that
  integration is deferred until 1.3 is available (see proposal.md for
  how this is scoped out). 1.3 also used `parser-standard`, so there is
  no `discuss.md` to inherit from.
- **Story 3.1 (Field-Level Key/Value Data Model, not yet started)**: this
  story's own storage of extracted results should be compatible with
  3.1's eventual dedicated data model rather than pre-empting it —
  addressed in design.md.
