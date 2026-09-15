## MODIFIED Requirements

### Requirement: Local File Upload
The system SHALL allow an authenticated user to upload a document file
from their local machine through an API endpoint. The system SHALL
reject an upload request from a caller that is not authenticated,
without accepting the file or creating a document record.

#### Scenario: Successful upload of a supported file
- **WHEN** an authenticated user uploads a file in a supported format
  (PDF, DOCX, PPTX, or TXT) that contains at least one byte of content
- **THEN** the system accepts the file, stores it, creates a document
  metadata record owned by that user, and returns the created document's
  identifier and status to the caller

#### Scenario: Upload with no file provided
- **WHEN** an authenticated user submits an upload request without
  attaching a file
- **THEN** the system rejects the request with an error indicating no
  file was provided, and does not create a document record

#### Scenario: Unauthenticated upload is rejected
- **WHEN** an upload request is made without valid authentication
- **THEN** the system rejects the request with an authentication-failure
  response and does not accept the file or create a document record
