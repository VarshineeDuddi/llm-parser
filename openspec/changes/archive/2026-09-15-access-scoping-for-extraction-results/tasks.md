## 1. User Identity & Credential Handling

- [x] 1.1 Define the `User` SQLAlchemy model (`id`, `name`, `api_key_hash`, `created_at`) and verify it matches design.md's shape, with no raw key column anywhere
- [x] 1.2 Implement API key generation (`secrets.token_urlsafe`) and SHA-256 hashing, and verify unit tests confirm a generated key hashes consistently and an incorrect key's hash never matches a stored one
- [x] 1.3 Implement `POST /users` (or equivalent registration endpoint) creating a user and returning the raw key exactly once, and verify an integration test confirms the response includes the key and no other field leaks the hash directly comparable to a raw key
- [x] 1.4 Verify no log line, error message, or any endpoint response other than registration's own ever includes a raw API key, via a test asserting this for at least one authenticated request and one failed-auth request (spec: Raw key is never retrievable again)

## 2. Data Model: Ownership

- [x] 2.1 Add a nullable `owner_id` FK (`document.owner_id -> users.id`) to the `Document` model and verify the model change does not alter any other existing column
- [x] 2.2 Generate and apply the Alembic migration creating `users` and adding `document.owner_id`, with no backfill of existing rows (per design.md Decision 4), and verify it applies and rolls back cleanly
- [x] 2.3 Verify a document seeded before the migration has `owner_id = NULL` after migration and is not retroactively assigned any owner, via a migration test

## 3. Authentication Dependency

- [x] 3.1 Implement a `get_current_user` FastAPI dependency reading the `Authorization: Bearer <key>` header, hashing the provided key, looking up the matching user, and raising an authentication-failure error on missing/invalid key, and verify unit tests cover: valid key resolves the correct user, missing header rejected, invalid key rejected (spec: Authentication Required For Document And Extraction Endpoints)
- [x] 3.2 Apply `get_current_user` to all six existing document/extraction endpoints (`POST /documents/upload`, `GET /documents/{id}`, `GET /documents/{id}/extraction`, `GET /documents/{id}/fields`, `GET /fields/{field_name}`, `GET /document-types/{type}/documents`) and verify a table-driven/parametrized test confirms every one of the six rejects an unauthenticated request (test-strategy.md: omission-risk coverage)

## 4. Ownership Scoping: Upload & Single-Document Reads

- [x] 4.1 Wire the upload endpoint to record the authenticated caller as `owner_id` on the created document, and verify an integration test confirms the created document's owner matches the authenticated user (spec: Newly Uploaded Documents Are Owned By The Uploading User)
- [x] 4.2 Add an ownership check to `GET /documents/{id}`, `GET /documents/{id}/extraction`, and `GET /documents/{id}/fields` returning not-found when the caller is not the document's owner (including when `owner_id` is NULL), matching the existing nonexistent-document response exactly, and verify integration tests confirm: owner succeeds, non-owner gets not-found, request for a NULL-owner (pre-existing) document gets not-found (spec: Single-Document Access Is Scoped To The Owning User; Documents Without a Recorded Owner Are Not Accessible To Any User)

## 5. Ownership Scoping: Cross-Document Queries

- [x] 5.1 Add an ownership filter to `GET /fields/{field_name}` restricting results to the caller's own documents, and verify an integration test seeds two users' documents with the same field name and confirms each user's query returns only their own (spec: Cross-Document Query Results Are Scoped To The Caller's Own Documents)
- [x] 5.2 Add the same ownership filter to `GET /document-types/{type}/documents`, and verify an integration test matching task 5.1's coverage for this endpoint

## 6. Frontend: Registration & Key Attachment

- [x] 6.1 Add a minimal registration form (name input) calling the new registration endpoint and storing the returned key in `localStorage`, shown when no key is currently stored, and verify a component test confirms the key is stored after successful registration
- [x] 6.2 Update `uploadDocument` in `api/documents.ts` to attach the stored key via the `Authorization` header, and verify a unit test confirms the header is present on the request (also updated `getDocumentFields`, which the existing 3.3 post-upload flow calls immediately afterward against the same now-authenticated endpoint)
- [x] 6.3 Handle a 401 response from the upload call by prompting re-registration rather than failing silently, and verify a component test confirms the registration form reappears on a 401

## 7. Regression & Full Retrofit Verification

- [x] 7.1 Update every existing test in `test_upload.py` and `test_query.py` to authenticate as a seeded test user, and verify the full existing suite still passes with authentication required (also updated `test_duplicates.py`, `test_extraction.py`, and `test_llm_extraction.py`, which shared the same now-authenticated endpoints via the `client` fixture and would otherwise have broken)
- [x] 7.2 Add backend tests covering every scenario in specs/access-scoping/spec.md and the modified scenarios in specs/document-ingestion/spec.md and specs/field-level-query/spec.md, and verify the full suite passes
- [x] 7.3 Manually verify end-to-end: register a user via the frontend, upload a document, confirm it's retrievable by that user, register a second user, and confirm the second user cannot see the first user's document through any of the six endpoints
- [x] 7.4 Verify both hard constraints hold per design.md's confirmation: extraction/grounding behavior is unchanged (re-run 2.1's grounding tests), and no document-type-specific column was introduced anywhere in this story's changes
