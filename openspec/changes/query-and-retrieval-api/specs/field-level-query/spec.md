## Purpose

Lets a caller actually read back the field-level extraction results
Story 3.1 made durable — by document, by field name across documents,
and by classified document type — so the data those earlier stories
computed is retrievable rather than write-only.

## ADDED Requirements

### Requirement: Retrieve All Fields For A Document
The system SHALL allow retrieving every field-level record for a given
document by that document's identifier. Each returned record SHALL
include its field name, value, confidence, and whether it requires
human review.

#### Scenario: Fields retrieved for a document with extracted results
- **WHEN** a caller requests the fields for a document that has
  field-level records
- **THEN** the system returns every field-level record for that
  document, each including confidence and its review-required flag

#### Scenario: Empty result for a document with no extracted fields
- **WHEN** a caller requests the fields for a document that exists but
  has no field-level records (for example, extraction failed, or
  produced nothing grounded)
- **THEN** the system returns an empty result, not an error

#### Scenario: Not found for a nonexistent document
- **WHEN** a caller requests fields for a document identifier that does
  not correspond to any document
- **THEN** the system returns a not-found response

### Requirement: Retrieve All Occurrences Of A Field Across Documents
The system SHALL allow retrieving every field-level record with a given
field name across all documents that have one.

#### Scenario: Records retrieved by field name
- **WHEN** a caller requests records for a field name that exists on one
  or more documents
- **THEN** the system returns every field-level record with that field
  name, each identifying which document it belongs to

#### Scenario: Empty result for an unused field name
- **WHEN** a caller requests records for a field name no document has
- **THEN** the system returns an empty result, not an error

### Requirement: Retrieve Documents By Classified Type
The system SHALL allow retrieving the set of documents whose classified
document type matches a given value, without requiring the caller to
know how document type is internally represented in storage.

#### Scenario: Documents retrieved by classified type
- **WHEN** a caller requests documents of a given classified type that
  one or more documents have
- **THEN** the system returns those documents

#### Scenario: Empty result for an unused type
- **WHEN** a caller requests documents of a classified type no document
  has
- **THEN** the system returns an empty result, not an error

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
