## Purpose

Defines the durable storage contract for a document's extracted fields —
one record per document/field pair, mechanically enforced rather than a
convention callers must uphold themselves — so any future capability
that reads or writes extraction results can rely on it without
re-deriving the guarantee.

## Requirements

### Requirement: One Record Per Document/Field Pair
The system SHALL NOT persist more than one field-level record for the
same document/field pair. This SHALL be enforced by the storage layer
itself, not only by caller discipline.

#### Scenario: Storage rejects a duplicate document/field pair
- **WHEN** something attempts to persist a second field-level record for
  a document/field pair that already has one
- **THEN** the storage layer prevents the duplicate from being persisted

### Requirement: Same-Extraction Duplicate Fields Are Deduplicated, Not Rejected
When a single extraction run produces more than one grounded candidate
for the same document/field pair, the system SHALL persist exactly one
of them — the one with the highest confidence — rather than treating the
collision as an error that discards the extraction or fails the request.

#### Scenario: Higher-confidence duplicate is kept
- **WHEN** one extraction run for a document produces two grounded
  candidate entries with the same field name and different confidence
  values
- **THEN** the system persists only the entry with the higher confidence
  for that document/field pair, and the extraction run completes
  successfully

### Requirement: Field-Level Records Are Retrievable By Document and By Field
The system SHALL support efficient retrieval of a document's field-level
records by document, and of field-level records across documents by
field name.

#### Scenario: Records retrievable by document
- **WHEN** field-level records exist for a document
- **THEN** all of that document's records can be retrieved by its
  document identifier without scanning unrelated documents' records

#### Scenario: Records retrievable by field name
- **WHEN** field-level records with a given field name exist across
  multiple documents
- **THEN** those records can be retrieved by field name without scanning
  records for unrelated field names

### Requirement: Storage Shape Compatible With Future Template-Driven Extraction
The field-level storage contract SHALL NOT encode any document-type- or
template-specific structure. A future template-driven extraction
capability constraining which field names are expected for a given
document type SHALL be achievable without changing this storage
contract's shape.

#### Scenario: Template-driven extraction reuses the same storage shape
- **WHEN** a future capability constrains which fields are expected for
  a document type
- **THEN** it persists results through this same one-record-per-field
  contract, with no new document-type-specific column or table required
