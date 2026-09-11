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
tables.

#### Scenario: Results stored as field-level records
- **WHEN** LLM extraction succeeds for a document
- **THEN** each extracted field (including the classified document type)
  exists as a separate field-level record referencing that document,
  using the same record structure regardless of the document's
  classified type

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
