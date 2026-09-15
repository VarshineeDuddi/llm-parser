## Purpose

Lets a user see everything the system knows about one document — its
raw extracted text, every field extracted from it with its confidence
and review status, and its duplicate relationship if any — in one
place, without needing to have just uploaded it.

## ADDED Requirements

### Requirement: Document Detail Shows Raw Extracted Text
The system SHALL display a document's raw extracted text on its detail
view, when that document's text extraction succeeded.

#### Scenario: Extracted text is shown
- **WHEN** a user views the detail for a document whose text extraction
  succeeded
- **THEN** the user sees that document's raw extracted text

#### Scenario: No text is shown when extraction failed
- **WHEN** a user views the detail for a document whose text extraction
  failed
- **THEN** the user sees an explanation that no extracted text is
  available, not a blank or broken display

### Requirement: Document Detail Shows Fields With Confidence And Review Status
The system SHALL display, on a document's detail view, every field
extracted from it along with its confidence and whether it requires
human review.

#### Scenario: Fields are shown with confidence and review status
- **WHEN** a user views the detail for a document that has extracted
  fields
- **THEN** the user sees each field's name, value, confidence, and
  whether it requires human review

#### Scenario: No fields is an explicit state, not empty or broken
- **WHEN** a user views the detail for a document that has no extracted
  fields
- **THEN** the user sees a message explaining that no fields are
  available, not an empty or broken-looking display

### Requirement: Document Detail Shows Duplicate Relationship
The system SHALL show, on a document's detail view, a link to the
original document it duplicates, when that document is flagged as a
duplicate.

#### Scenario: Duplicate relationship is shown
- **WHEN** a user views the detail for a document flagged as a duplicate
  of another document
- **THEN** the user sees a link to the original document it duplicates

#### Scenario: No duplicate indicator for a non-duplicate document
- **WHEN** a user views the detail for a document that is not flagged as
  a duplicate
- **THEN** no duplicate relationship is shown
