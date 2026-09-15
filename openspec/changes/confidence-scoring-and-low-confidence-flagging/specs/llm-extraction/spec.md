## MODIFIED Requirements

### Requirement: Field-Level Result Storage
The system SHALL store extraction results as one record per
document/field pair, including the classified document type as such a
record, and SHALL NOT store results as document-type-specific columns or
tables. Each record SHALL carry a confidence indicator and a flag
denoting whether it requires human review before being treated as
confirmed fact.

#### Scenario: Results stored as field-level records
- **WHEN** LLM extraction succeeds for a document
- **THEN** each extracted field (including the classified document type)
  exists as a separate field-level record referencing that document,
  using the same record structure regardless of the document's
  classified type

#### Scenario: Every record carries a confidence indicator and review flag
- **WHEN** a field-level record is created from a successful LLM
  extraction
- **THEN** that record includes a confidence indicator and a flag stating
  whether it requires human review

## ADDED Requirements

### Requirement: Confidence Scoring for Extracted Fields
The system SHALL compute a confidence score for each extracted field,
including the classified document type, reflecting how certain the
system is that the value is a correct, non-ambiguous reading of the
document — distinct from, and computed only for, a value that has
already passed the mechanical grounding check (Requirement: Extracted
Values Must Be Grounded in the Source Document). The mechanical grounding
check's own pass/fail behavior is unchanged by this requirement.

#### Scenario: Grounded field receives a confidence score
- **WHEN** a field/value passes the mechanical grounding check and is
  persisted as a field-level record
- **THEN** that record's confidence score reflects the system's
  certainty in the value, not merely whether it was grounded

### Requirement: Ambiguous Grounding Lowers Confidence
The system SHALL treat a grounded value as less certain when its match
against the document's text is not an exact substring match (only
matches after whitespace normalization), or when its `source_quote`
corresponds to more than one distinct location in the document's text.
Such ambiguity SHALL be reflected in a lower confidence score than an
unambiguous, exact match would receive, regardless of any confidence the
LLM itself reported for that value.

#### Scenario: Exact match receives higher confidence than a normalized-only match
- **WHEN** two otherwise-identical extracted values differ only in that
  one matches the document's text exactly and the other matches only
  after whitespace normalization
- **THEN** the exact match's confidence score is higher than the
  normalized-only match's confidence score

#### Scenario: Ambiguous source location lowers confidence
- **WHEN** an extracted value's `source_quote` appears at more than one
  distinct location in the document's text
- **THEN** that value's confidence score reflects that ambiguity rather
  than relying solely on the model's self-reported confidence

### Requirement: Low-Confidence Fields Are Flagged for Review
The system SHALL flag a field-level record as requiring human review
when its confidence score falls below a defined threshold, rather than
presenting it as confirmed fact. A flagged record SHALL remain stored
and retrievable, not discarded.

#### Scenario: Low-confidence field is flagged
- **WHEN** an extracted field's confidence score falls below the defined
  threshold
- **THEN** that field's record is flagged as requiring human review

#### Scenario: Flagged field is not discarded
- **WHEN** a field-level record is flagged as requiring human review
- **THEN** the record still exists and is retrievable, distinguishable
  from records that were not flagged

#### Scenario: High-confidence field is not flagged
- **WHEN** an extracted field's confidence score meets or exceeds the
  defined threshold
- **THEN** that field's record is not flagged as requiring human review
