## Purpose

Lets the system recognize when an uploaded document's content has
already been parsed, so it is recorded as a duplicate of the existing
document instead of being treated as new, independent content.

## ADDED Requirements

### Requirement: Duplicate Detection by Content
The system SHALL, after a document's text extraction has succeeded,
determine whether its extracted content matches the extracted content of
an already-processed document, and SHALL record a match as a duplicate
relationship rather than treating the new upload as independent content.

#### Scenario: Upload matches previously parsed content
- **WHEN** a newly uploaded document's extracted text content matches
  the extracted text content of a document that was already accepted
  and successfully extracted
- **THEN** the system records the new upload as a duplicate of the
  existing document rather than treating it as new content

#### Scenario: Upload with unique content
- **WHEN** a newly uploaded document's extracted text content does not
  match any existing document's extracted content
- **THEN** the system treats it as a new, independent document, with no
  duplicate relationship recorded

### Requirement: Duplicate Status Visibility
The system SHALL make a document's duplicate status, and a reference to
the original document it duplicates, retrievable using the document's
identifier.

#### Scenario: Caller can see a document is a duplicate
- **WHEN** a document has been recorded as a duplicate of another
- **THEN** retrieving that document's status shows it is a duplicate and
  identifies the original document it matches

#### Scenario: Caller sees no duplicate reference for unique content
- **WHEN** a document has not been matched to any other document's
  content
- **THEN** retrieving that document's status shows no duplicate
  relationship

### Requirement: Duplicate Detection Requires Successful Extraction
The system SHALL only compare documents whose text extraction succeeded.
A document whose extraction failed SHALL NOT be compared against other
documents for duplication and SHALL NOT itself be matched as a duplicate
of another document.

#### Scenario: Document with failed extraction is not compared
- **WHEN** a document's text extraction has failed
- **THEN** the system does not attempt duplicate comparison for that
  document, and its status reflects the extraction failure rather than
  any duplicate determination

#### Scenario: A failed-extraction document cannot be matched by later uploads
- **WHEN** a later upload's extracted content would otherwise match a
  document whose own extraction failed
- **THEN** the system does not record a duplicate relationship against
  that failed-extraction document

### Requirement: Original Document Unaffected by Duplicates
The system SHALL leave an original document's status and stored content
unaffected when one or more later uploads are detected as duplicates of
it.

#### Scenario: Multiple duplicates of the same original
- **WHEN** more than one later upload matches the same original
  document's content
- **THEN** the original document's status remains unaffected, and each
  later upload is independently recorded as a duplicate referencing the
  original
