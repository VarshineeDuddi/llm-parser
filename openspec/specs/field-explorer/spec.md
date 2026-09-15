# field-explorer Specification

## Purpose

Lets a user search across every one of their documents by field name, to
see at a glance which documents have a given fact and what its value is
in each, without already knowing which documents to look at.

## Requirements

### Requirement: Search Documents By Field Name
The system SHALL let a user enter a field name and see every document
they own that has a field-level record with that name, along with its
value.

#### Scenario: Matching documents and values are shown
- **WHEN** a user searches for a field name that exists on one or more
  of their own documents
- **THEN** the user sees each matching document identified, together
  with that field's value for that document

#### Scenario: No results for an unused field name
- **WHEN** a user searches for a field name none of their own documents
  has
- **THEN** the user sees an explicit no-results message, not an empty or
  broken-looking table

### Requirement: Field Explorer Results Are Paginated
The system SHALL support paging through field explorer results when more
matches exist than fit on one page.

#### Scenario: Large result set is paginated
- **WHEN** a field name search matches more results than fit on one page
- **THEN** the user can retrieve further pages of matches

### Requirement: Field Explorer Results Are Sortable
The system SHALL let a user sort the currently-displayed page of field
explorer results by value, by confidence, or by review-required status.

#### Scenario: Results are sorted by the selected column
- **WHEN** a user selects a sort option among value, confidence, or
  review-required status
- **THEN** the currently-displayed results are ordered accordingly
