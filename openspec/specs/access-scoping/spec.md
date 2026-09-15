# access-scoping Specification

## Purpose

Establishes who a caller is and which documents they're allowed to see —
so extracted business/personal data, previously readable by anyone, is
only readable by the user who uploaded it.

## Requirements

### Requirement: User Registration And API Key Issuance
The system SHALL allow creating a new user identity and SHALL issue that
user a unique API key at creation time. The raw API key SHALL be
returned to the caller exactly once, at issuance, and SHALL NOT be
retrievable through any endpoint afterward.

#### Scenario: New user is registered and receives a key
- **WHEN** a caller requests a new user identity be created
- **THEN** the system creates the user and returns a unique API key in
  that same response

#### Scenario: Raw key is never retrievable again
- **WHEN** a user's API key has already been issued
- **THEN** no endpoint returns that raw key again; only the fact that a
  key exists, not its value, may be observable thereafter

### Requirement: Authentication Required For Document And Extraction Endpoints
The system SHALL require a valid API key, provided via the request's
`Authorization` header, for every document and extraction-related
endpoint. The system SHALL reject a request with a missing or invalid
key with an authentication-failure response, without performing the
requested action.

#### Scenario: Request without a key is rejected
- **WHEN** a request to a document or extraction endpoint is made with
  no `Authorization` header present
- **THEN** the system rejects the request with an authentication-failure
  response and takes no other action

#### Scenario: Request with an invalid key is rejected
- **WHEN** a request to a document or extraction endpoint is made with
  an `Authorization` header whose key does not match any issued key
- **THEN** the system rejects the request with an authentication-failure
  response and takes no other action

#### Scenario: Request with a valid key proceeds
- **WHEN** a request to a document or extraction endpoint is made with a
  valid, currently-issued API key
- **THEN** the system identifies the requesting user and proceeds to
  handle the request as that user

### Requirement: Newly Uploaded Documents Are Owned By The Uploading User
The system SHALL record, for every document uploaded from this
capability forward, which authenticated user uploaded it.

#### Scenario: Uploaded document is owned by its uploader
- **WHEN** an authenticated user uploads a document successfully
- **THEN** the resulting document record is associated with that user as
  its owner

### Requirement: Single-Document Access Is Scoped To The Owning User
The system SHALL treat a document as not found, for any single-document
read, when the requesting user is not that document's owner — the same
response as if the document did not exist at all.

#### Scenario: Owner can access their own document
- **WHEN** a user requests a document, its extraction, or its fields,
  and that user is the document's owner
- **THEN** the system returns the requested data

#### Scenario: Non-owner cannot access another user's document
- **WHEN** a user requests a document, its extraction, or its fields,
  and that user is not the document's owner
- **THEN** the system responds as if the document does not exist,
  without revealing that it belongs to someone else

### Requirement: Cross-Document Query Results Are Scoped To The Caller's Own Documents
The system SHALL restrict any query spanning multiple documents (by
field name, by classified type, or any future such query) to only
documents owned by the requesting user.

#### Scenario: Cross-document query returns only the caller's own data
- **WHEN** an authenticated user performs a query spanning multiple
  documents
- **THEN** the results include only documents and field-level records
  owned by that user, never another user's

### Requirement: Documents Without a Recorded Owner Are Not Accessible To Any User
The system SHALL treat a document with no recorded owner (for example,
one uploaded before this capability existed) as inaccessible through any
scoped endpoint to any regular authenticated user, rather than treating
it as owned by whoever asks or visible to everyone.

#### Scenario: Unowned document is not accessible to a regular user
- **WHEN** an authenticated user requests a document that has no
  recorded owner
- **THEN** the system responds as if the document does not exist for
  that user
