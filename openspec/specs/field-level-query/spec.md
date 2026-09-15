## Purpose

Lets a caller actually read back the field-level extraction results
Story 3.1 made durable — by document, by field name across documents,
and by classified document type — so the data those earlier stories
computed is retrievable rather than write-only.

## Requirements

### Requirement: Retrieve All Fields For A Document
The system SHALL allow retrieving every field-level record for a given
document by that document's identifier, for the authenticated user that
owns it. Each returned record SHALL include its field name, value,
confidence, and whether it requires human review.

#### Scenario: Fields retrieved for a document with extracted results
- **WHEN** the owning authenticated user requests the fields for their
  own document that has field-level records
- **THEN** the system returns every field-level record for that
  document, each including confidence and its review-required flag

#### Scenario: Empty result for a document with no extracted fields
- **WHEN** the owning authenticated user requests the fields for their
  own document that exists but has no field-level records (for example,
  extraction failed, or produced nothing grounded)
- **THEN** the system returns an empty result, not an error

#### Scenario: Not found for a nonexistent document
- **WHEN** a caller requests fields for a document identifier that does
  not correspond to any document
- **THEN** the system returns a not-found response

#### Scenario: Not found for a document owned by another user
- **WHEN** a caller requests fields for a document that exists but is
  owned by a different user
- **THEN** the system returns the same not-found response as for a
  nonexistent document, without revealing that the document belongs to
  someone else

### Requirement: Retrieve All Occurrences Of A Field Across Documents
The system SHALL allow retrieving every field-level record with a given
field name across all documents owned by the requesting authenticated
user.

#### Scenario: Records retrieved by field name
- **WHEN** an authenticated user requests records for a field name that
  exists on one or more of their own documents
- **THEN** the system returns every field-level record with that field
  name from that user's own documents, each identifying which document
  it belongs to

#### Scenario: Empty result for an unused field name
- **WHEN** a caller requests records for a field name none of their own
  documents has
- **THEN** the system returns an empty result, not an error

#### Scenario: Records from another user's documents are excluded
- **WHEN** a field name exists on both the requesting user's own
  documents and a different user's documents
- **THEN** the system returns only the records from the requesting
  user's own documents, never a record from a document owned by a
  different user

### Requirement: Retrieve Documents By Classified Type
The system SHALL allow retrieving the set of documents, owned by the
requesting authenticated user, whose classified document type matches a
given value, without requiring the caller to know how document type is
internally represented in storage.

#### Scenario: Documents retrieved by classified type
- **WHEN** an authenticated user requests documents of a given classified
  type that one or more of their own documents have
- **THEN** the system returns those documents

#### Scenario: Empty result for an unused type
- **WHEN** a caller requests documents of a classified type none of
  their own documents has
- **THEN** the system returns an empty result, not an error

#### Scenario: Documents from another user's account are excluded
- **WHEN** a classified type matches both the requesting user's own
  documents and a different user's documents
- **THEN** the system returns only the requesting user's own matching
  documents, never a document owned by a different user

### Requirement: Filter Retrieval To Records Needing Review
The by-document and by-field retrieval SHALL support restricting results
to only field-level records flagged as requiring human review.

#### Scenario: Only flagged records are returned when the filter is applied
- **WHEN** a caller requests a document's fields, or a field name's
  occurrences, with the needs-review filter applied
- **THEN** the system returns only records flagged as requiring human
  review, omitting records that are not flagged

### Requirement: Cross-Document Retrieval Is Paginated
Retrieval by field name and by classified type SHALL support pagination,
so a caller is never required to receive an unbounded result set in a
single response.

#### Scenario: Large result set is paginated
- **WHEN** a field name or classified type matches more field-level
  records or documents than fit in one page
- **THEN** the system returns a bounded page of results along with a
  way for the caller to retrieve the next page
