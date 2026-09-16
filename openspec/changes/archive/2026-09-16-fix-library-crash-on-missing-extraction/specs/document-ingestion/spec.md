## MODIFIED Requirements

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
