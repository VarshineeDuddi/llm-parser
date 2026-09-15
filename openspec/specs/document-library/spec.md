# document-library Specification

## Purpose

Lets a user see every document that's been uploaded, in one place,
instead of needing to already know a document's identifier to look
anything up.

## Requirements

### Requirement: List All Uploaded Documents
The system SHALL allow an authenticated user to retrieve a list of their
own uploaded documents, including each document's filename, format,
size, upload date, status, extraction status, and duplicate flag. This
list SHALL only include documents owned by the requesting user,
consistent with every other document/extraction endpoint.

#### Scenario: Documents are listed
- **WHEN** an authenticated user requests the document list and has
  uploaded at least one document
- **THEN** the system returns each of that user's uploaded documents'
  filename, format, size, upload date, status, extraction status, and
  duplicate flag

#### Scenario: Empty result when nothing has been uploaded
- **WHEN** an authenticated user requests the document list and has not
  uploaded any document
- **THEN** the system returns an empty result, not an error

#### Scenario: Another user's documents are excluded
- **WHEN** an authenticated user requests the document list, and
  documents exist that were uploaded by a different user
- **THEN** the returned list never includes a document owned by a
  different user

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request to list documents is made with no valid API key
- **THEN** the system rejects the request with an authentication-failure
  response and returns no document data

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
