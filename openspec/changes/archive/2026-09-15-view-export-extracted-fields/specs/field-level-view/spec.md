## Purpose

Lets the person who uploaded a document actually see what was extracted
from it — with low-confidence fields visibly distinguished so review
happens by looking at what's flagged, not through a separate correction
workflow — and take that data out of the system as a file.

## ADDED Requirements

### Requirement: Extracted Fields Are Displayed For A Processed Document
The system SHALL display a document's extracted field-level records to
the user once that document has finished processing, including each
field's name, value, and whether it requires human review.

#### Scenario: Fields displayed after successful processing
- **WHEN** a document has been uploaded and its extraction produced one
  or more field-level records
- **THEN** the user sees those fields, each showing its name, value, and
  review-required status

### Requirement: Fields Requiring Review Are Visually Distinguished
The system SHALL visually distinguish a field flagged as requiring human
review from one that is not, so a user can tell an unconfirmed value
from a confirmed one without inspecting each field individually.

#### Scenario: Flagged field is visually distinct from a confirmed one
- **WHEN** a document's displayed fields include at least one flagged as
  requiring review and at least one that is not
- **THEN** the user can visually distinguish which fields require review
  from which do not

### Requirement: No-Fields State Is Explicit, Not Empty Or Broken
The system SHALL show a clear message when a document has no extracted
fields to display, rather than an empty or broken-looking display.

#### Scenario: Document with no extracted fields shows an explicit message
- **WHEN** a document's processing completed but produced no field-level
  records (for example, extraction failed, or nothing was grounded)
- **THEN** the user sees a message explaining that no fields are
  available, not an empty table with no explanation

### Requirement: Displayed Fields Can Be Exported As A File
The system SHALL let the user export the currently-displayed fields as a
downloadable file, including each field's name, value, confidence, and
review-required status.

#### Scenario: User exports a document's fields
- **WHEN** a user requests to export a document's displayed fields
- **THEN** the system provides a downloadable file containing each
  displayed field's name, value, confidence, and review-required status
