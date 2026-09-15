## Purpose

Lets the system understand what a document actually is and contains —
classifying its type and pulling out whatever key/value facts are
present in it, using an LLM, without a predefined field list — so a
future story can surface that information to the person who uploaded it.

## Requirements

### Requirement: LLM Extraction Triggered After Successful Text Extraction
The system SHALL invoke LLM-based classification and extraction
automatically for a document immediately after that document's text
extraction (per `text-extraction`) has succeeded. The system SHALL NOT
invoke LLM extraction for a document whose text extraction failed or has
not yet completed.

#### Scenario: LLM extraction runs after successful text extraction
- **WHEN** a document's text extraction completes with a succeeded
  outcome
- **THEN** the system sends that document's extracted text to the LLM
  for classification and extraction

#### Scenario: LLM extraction is skipped for a document with no extracted text
- **WHEN** a document's text extraction outcome is failed (no text
  layer, unreadable file)
- **THEN** the system does not invoke LLM extraction for that document,
  and no extraction results are created for it

### Requirement: Free-Form Document Classification
The system SHALL classify an extracted document's type using the LLM's
reading of its content, without relying on a predefined, closed list of
document types.

#### Scenario: Document type is classified from content
- **WHEN** LLM extraction runs for a document
- **THEN** the system records a classified document type derived from
  the LLM's reading of that document's text

### Requirement: Free-Form Field Extraction
The system SHALL extract whatever key/value facts the LLM identifies as
present in a document's text, without constraining extraction to a
predefined or document-type-specific field list.

#### Scenario: Fields present in the document are extracted
- **WHEN** LLM extraction runs for a document whose text contains
  identifiable facts (for example, names, dates, amounts)
- **THEN** the system records each identified fact as a field/value pair
  without requiring that field to appear on any predefined list

#### Scenario: No predefined list constrains extraction
- **WHEN** LLM extraction runs for two documents of different, unrelated
  types
- **THEN** the set of fields extracted for each is determined by that
  document's own content, not by a shared fixed schema of expected
  fields

### Requirement: Extracted Values Must Be Grounded in the Source Document
The system SHALL persist an extracted field/value only when it can be
traced to specific content in the document's extracted text. The system
SHALL NOT persist a value the LLM presents as fact when that value is
unsupported by, or ambiguous with respect to, the document's text.

#### Scenario: Grounded value is persisted
- **WHEN** the LLM extracts a field/value that corresponds to specific
  text in the document
- **THEN** the system persists that field/value along with a reference
  to the source text it is grounded in

#### Scenario: Ungrounded or ambiguous value is not persisted as fact
- **WHEN** the LLM's response includes a value it cannot tie to specific
  document text, or flags a value as ambiguous
- **THEN** the system does not persist that value as a confirmed
  field/value record

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

### Requirement: LLM Extraction Outcome Tracking
The system SHALL record, per document, whether LLM extraction succeeded
or failed, and SHALL record a human-readable reason when it failed. This
outcome SHALL be observable separately from the document's text-
extraction outcome.

#### Scenario: Successful LLM extraction is recorded
- **WHEN** LLM extraction for a document completes successfully
- **THEN** the document's LLM extraction outcome is recorded as
  succeeded

#### Scenario: Failed LLM extraction is recorded with a reason
- **WHEN** LLM extraction for a document fails (for example, the LLM
  call errors, times out, or returns an unparseable response)
- **THEN** the document's LLM extraction outcome is recorded as failed,
  with a human-readable reason, and no field-level records are created
  for that document from the failed attempt

### Requirement: LLM Extraction Failure Isolation
The system SHALL handle an LLM extraction failure for one document
without affecting that document's existing upload or text-extraction
records, and without affecting LLM extraction for any other document.

#### Scenario: One document's LLM extraction failure does not affect others
- **WHEN** LLM extraction fails for one document
- **THEN** that document's upload and text-extraction records remain
  intact, and LLM extraction for other documents continues unaffected
