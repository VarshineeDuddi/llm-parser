## Reviewed-by

_Left blank intentionally._ Per this artifact's own rules, `Reviewed-by`
is filled by the architect's PR approval event, not hand-typed by the
drafting agent. This file currently contains only the evidence summary
below, prepared ahead of a PR review flow.

## Date

_Left blank intentionally_, for the same reason as Reviewed-by.

## Decision

Approved

## Response to Concerns

Evidence summary of what design.md and security-privacy.md raised, for
the architect's review — not a self-approval:

- **[design.md] Uncontrolled per-document Anthropic cost, since 1.3's
  duplicate-skip isn't wired in yet** → Addressed by explicit scoping,
  not by solving it: proposal.md's Impact and design.md's Risks both
  flag this as a deliberate, temporary gap (1.3 hasn't merged to `dev`
  as of this branch) rather than a silently absorbed cost. Flagged as a
  follow-up once 1.3 lands, not resolved in this change.
- **[design.md] Substring-match grounding check is strict and will
  reject some genuinely-grounded, paraphrased facts** → Accepted
  trade-off: design.md argues false rejection is safer than false
  acceptance given the grounding hard constraint's framing ("must not be
  treated as confirmed fact"). Recall is not this story's optimization
  target.
- **[design.md] Single LLM call per document risks incomplete
  extraction on very long documents** → Accepted for MVP scope;
  chunking/multi-call strategies are an explicit Non-Goal, not an
  oversight.
- **[design.md] LLM response format drift (model doesn't return valid
  structured output)** → Addressed structurally: treated as a failed
  LLM extraction outcome via the response parser validating shape before
  any grounding check runs, per specs/llm-extraction/spec.md's
  "Requirement: LLM Extraction Outcome Tracking" — not left as an
  unhandled error path.
- **[security-privacy.md] First story to send production document
  content to a third-party service (Anthropic)** → Addressed by scoping
  this explicitly as the "approved LLM extraction path" the data policy
  already anticipates, with confirmation that no extracted field value,
  document content, or document identifier is sent to any other external
  system, and that logs never capture the API key, document text, or raw
  model response.
- **[security-privacy.md] Document content classified as
  personal/business-sensitive** → Addressed by treating this as a
  standing classification for the pipeline (not unique to this story's
  implementation choices) and confirming it is consistent with, not in
  conflict with, proposal.md's risk table.

This summary is evidence for the architect's review, not a substitute
for it — none of the above constitutes approval.
