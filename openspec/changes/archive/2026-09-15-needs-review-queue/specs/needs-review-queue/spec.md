## Purpose

Lets a user see every field across all of their documents that's been
flagged as needing review, in one place, so review happens by scanning
what's flagged rather than checking each document individually.

## ADDED Requirements

### Requirement: List Fields Needing Review Across Documents
The system SHALL allow an authenticated user to retrieve every field-
level record flagged as requiring human review, across all documents
they own.

#### Scenario: Flagged fields are listed across documents
- **WHEN** an authenticated user requests their needs-review queue and
  has at least one field flagged across any of their documents
- **THEN** the system returns every such flagged field, each identifying
  which document it belongs to

#### Scenario: Empty result when nothing is flagged
- **WHEN** an authenticated user requests their needs-review queue and
  has no field flagged across any of their documents
- **THEN** the system returns an empty result, not an error

#### Scenario: Another user's flagged fields are excluded
- **WHEN** an authenticated user requests their needs-review queue, and
  a flagged field exists on a document owned by a different user
- **THEN** the returned queue never includes that other user's flagged
  field

### Requirement: Needs-Review Queue Is Paginated
The system SHALL support pagination for the needs-review queue, so a
caller is never required to receive an unbounded result set in a single
response.

#### Scenario: Large queue is paginated
- **WHEN** more flagged fields exist than fit in one page
- **THEN** the system returns a bounded page of results along with a way
  for the caller to retrieve the next page
