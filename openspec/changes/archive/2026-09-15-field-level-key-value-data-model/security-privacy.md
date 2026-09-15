## Data sensitivity classification

**Personal and business-sensitive** — same classification as 2.1's
security-privacy.md, inherited in spirit here rather than re-derived
from scratch, since this story governs the storage of the exact same
extraction results 2.1 classified: `field_value` may contain names,
dates, amounts, or other personal/business-sensitive facts extracted
from user-uploaded documents. This story does not change what data is
stored or where it comes from — it only adds constraints/indexes around
existing columns — so the classification is unchanged, not newly
derived. Consistent with proposal.md's risk table (no new external
integration or credential; the data-model change is the trigger, not a
new data category).

## Credential handling

None. This story introduces no new credential, token, or secret — it
only adds a database constraint, two indexes, and a small
persistence-loop change. No environment variable or secrets-manager
entry is added or touched.

## External write-back scope

Not applicable — this story has no external-system interaction at all,
inbound or outbound. It only changes how `extraction_results` is
constrained and indexed within the existing PostgreSQL database and how
`llm_extraction.py`'s insert loop groups entries before writing to it.

## Inheritance

Not a formal `depends_on` inheritance (proposal.md does not set one),
but see discuss.md's Dependencies: this story's relationship to 2.1 is
inverted from the usual case (2.1 already depends on a placeholder
version of what this story formalizes, not the other way around). The
data-sensitivity classification above is carried forward from 2.1's
security-privacy.md because it governs the same data, not because this
story is a later cycle of 2.1's own change.
