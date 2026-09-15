## Purpose

Lets a user filter their documents down to those classified as a given
type, without needing to already know which documents match.

## ADDED Requirements

### Requirement: Filter Documents By Classified Type
The system SHALL let a user enter a classified document type and see
every document they own that matches it.

#### Scenario: Matching documents are shown
- **WHEN** a user filters by a classified type that one or more of their
  own documents have
- **THEN** the user sees those matching documents

#### Scenario: No results for an unused type
- **WHEN** a user filters by a classified type none of their own
  documents has
- **THEN** the user sees an explicit no-results message, not an empty or
  broken-looking table

### Requirement: Document Type Browser Results Are Paginated
The system SHALL support paging through document type browser results
when more matches exist than fit on one page.

#### Scenario: Large result set is paginated
- **WHEN** a type filter matches more documents than fit on one page
- **THEN** the user can retrieve further pages of matches
