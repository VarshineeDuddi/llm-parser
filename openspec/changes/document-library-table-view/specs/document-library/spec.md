## Purpose

Lets a user see every document that's been uploaded, in one place,
instead of needing to already know a document's identifier to look
anything up.

## ADDED Requirements

### Requirement: List All Uploaded Documents
The system SHALL allow retrieving a list of all uploaded documents,
including each document's filename, format, size, upload date, status,
extraction status, and duplicate flag.

#### Scenario: Documents are listed
- **WHEN** a caller requests the document list and at least one document
  has been uploaded
- **THEN** the system returns each uploaded document's filename, format,
  size, upload date, status, extraction status, and duplicate flag

#### Scenario: Empty result when nothing has been uploaded
- **WHEN** a caller requests the document list and no document has been
  uploaded
- **THEN** the system returns an empty result, not an error

### Requirement: Document List Is Paginated
The system SHALL support pagination for the document list, so a caller
is never required to receive an unbounded result set in a single
response.

#### Scenario: Large document list is paginated
- **WHEN** more documents exist than fit in one page
- **THEN** the system returns a bounded page of results along with a way
  for the caller to retrieve the next page

### Requirement: Document Library Is The Default View
The system SHALL present the document library as the application's
initial view, with the upload flow reachable from it rather than being
the only screen.

#### Scenario: Application opens to the document library
- **WHEN** a user opens the application
- **THEN** the document library is what they see, and they can navigate
  to the upload flow from there
