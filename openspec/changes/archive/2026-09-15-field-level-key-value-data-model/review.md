## Reviewed-by

Architect

## Date

15/09/2026

## Decision

Approved

## Response to Concerns

Evidence summary of what design.md and security-privacy.md raised, for
the architect's review — not a self-approval:

- **[discuss.md/design.md] This story is a retrofit, not greenfield —
  2.1 and 2.2 are already shipped and running against
  `extraction_results` as it stands today** → Addressed by the explicit
  "extend in place, no new table, no data migration" decision, made with
  the user before drafting (see proposal.md's Approach note), which
  keeps 2.1/2.2's code and data shape untouched.
- **[design.md] Existing rows might already violate the new uniqueness
  constraint on `(document_id, field_name)`** → Addressed by a
  pre-migration verification step that checks for duplicates and, if
  found, keeps the highest-confidence row per pair (logged) before the
  constraint is added — not a silent failure or an assumption that no
  duplicates exist.
- **[design.md] Same-extraction collisions (one LLM response returning
  two entries with the same field name) would otherwise violate the new
  constraint** → Addressed by a deliberate, narrowly-scoped
  dedup-on-collision policy (keep highest confidence) implemented in the
  persistence loop, chosen over letting the whole extraction fail — see
  design.md Decision 3 for the reasoning and rejected alternative.
- **[design.md] Nullability tightening on `confidence`/`needs_review`
  could fail if any existing row actually has a null value** →
  Addressed by verifying the invariant before applying NOT NULL, per the
  Migration Plan; current code already always sets both, so this is
  expected to be a no-op check, not a blind assumption.
- **[security-privacy.md] Data sensitivity classification** → Addressed
  by carrying forward 2.1's classification rather than re-deriving it,
  since this story governs the same data and introduces no new data
  category, credential, or external interaction.

This summary is evidence for the architect's review, not a substitute
for it — none of the above constitutes approval.
