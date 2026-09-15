## Reviewed-by

Architect

## Date

15/09/2026
## Decision

Approved

## Response to Concerns

Evidence summary of what discuss.md, design.md, and security-privacy.md
raised, for the architect's review — not a self-approval:

- **[proposal.md] Access model choice: per-user ownership scoping vs. a
  simpler shared-secret gate** → Not a self-made call: resolved directly
  with the user before drafting began, with the trade-off (materially
  larger scope) stated explicitly rather than defaulted to the simpler
  option.
- **[discuss.md/design.md] Retrofitting onto six already-shipped,
  unauthenticated endpoints — an incomplete retrofit is a direct failure
  of this story's own purpose** → Addressed structurally, not just by
  diligence: design.md Decision 3 applies a single shared authentication
  dependency to every document/extraction route rather than per-endpoint
  ad hoc checks, and test-strategy.md (once drafted) will require an
  explicit test per retrofitted endpoint confirming it rejects
  unauthenticated requests.
- **[design.md] Pre-existing documents have no real owner** → Addressed
  by a deliberate, stated-plainly decision (Decision 4): they become
  inaccessible to any regular user rather than fabricating an ownership
  relationship or making them world-readable. The consequence (every
  document from 1.1-3.2's development/testing becomes unreachable via
  the API) is stated explicitly, not buried — this is exactly the kind
  of call an architect should confirm or override, not one this sync
  resolves unilaterally.
- **[design.md/security-privacy.md] First credential-issuing code in the
  project — key generation, hashing, one-time display** → Addressed with
  explicit reasoning for using a fast hash (SHA-256) over a slow
  password-hashing library, grounded in the difference between a
  high-entropy random token and a human-chosen password (Decision 2),
  and a hard requirement that the raw key is never retrievable or logged
  after issuance.
- **[design.md] Not-found vs. forbidden for another user's document** →
  Addressed deliberately (Decision 5): not-found uniformly, to avoid
  confirming another user's document exists, extending 3.2's existing
  not-found pattern rather than introducing a new response shape.
- **[design.md] Existing frontend would break once endpoints require
  auth** → Addressed with an explicit, scoped frontend change (minimal
  registration + key attachment on the existing upload call), not left
  as a silent regression.

This summary is evidence for the architect's review, not a substitute
for it — none of the above constitutes approval. Given this story's
security-critical, cross-cutting nature (the most Architect-gated story
in this epic so far), careful review of Decisions 1, 2, 4, and 5
specifically is warranted before approval.
