## Purpose

Lets a user get a document into the system by uploading it from their
local machine, so it can later be parsed and have fields extracted from
it.

## Requirements

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

### Requirement: Supported Format Validation
The system SHALL validate that an uploaded file's format is one of the
supported formats (PDF, DOCX, PPTX, TXT) before accepting it, and SHALL
reject files in unsupported formats.

#### Scenario: Upload of an unsupported format
- **WHEN** a user uploads a file whose format is not PDF, DOCX, PPTX, or
  TXT (for example, an image or a spreadsheet)
- **THEN** the system rejects the upload with an error identifying the
  file as an unsupported format, and does not store the file or create a
  document record

#### Scenario: Upload of an empty file
- **WHEN** a user uploads a file with a supported extension but zero
  bytes of content
- **THEN** the system rejects the upload with an error indicating the
  file is empty, and does not store the file or create a document record

### Requirement: Durable Source File Storage
The system SHALL persist an accepted uploaded file to object storage
such that it can be retrieved later using the document's stored location
reference.

#### Scenario: Accepted file is retrievable after upload
- **WHEN** a file has been accepted and its document record created
- **THEN** the file's content can be retrieved from object storage using
  the location reference recorded on the document

### Requirement: Document Metadata Record
The system SHALL create one document metadata record per accepted
upload, recording at minimum the original filename, detected format,
file size, storage location reference, upload timestamp, and a status
indicating the document has been received. The record structure SHALL
NOT vary by document format or type. Reading a document's metadata
record SHALL NOT fail when that document's extraction outcome is
unavailable (for example, no extraction record was ever created for
it); in that case the record SHALL show an explicit unknown-extraction
state rather than causing an error.

#### Scenario: Metadata recorded for an accepted upload
- **WHEN** a file is accepted and stored
- **THEN** a single document metadata record exists with the original
  filename, format, size, storage location reference, upload timestamp,
  and a "received" status, using the same record structure regardless of
  the file's format

#### Scenario: Reading a document whose extraction outcome is unavailable
- **WHEN** a document's metadata record is read and no extraction record
  exists for it
- **THEN** the system returns that document's metadata record with an
  explicit unknown-extraction state and an explanatory reason, rather
  than failing the request

#### Scenario: One document's unavailable extraction outcome does not affect others in a list
- **WHEN** a list of document metadata records is read, and one of the
  documents in that list has no extraction record
- **THEN** the system returns the full list, with that one document
  showing the explicit unknown-extraction state and every other
  document's record shown normally — not a failure of the entire list

### Requirement: Upload Result Visibility
The system SHALL inform the user whether their upload was accepted or
rejected, and SHALL include a human-readable reason when a file is
rejected.

#### Scenario: User sees rejection reason
- **WHEN** an upload is rejected for any validation reason (unsupported
  format, empty file, no file provided)
- **THEN** the user is shown a message describing why the upload was
  rejected
