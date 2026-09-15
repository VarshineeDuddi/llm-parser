## 1. Response Models

- [ ] 1.1 Add a `FieldResultOut` Pydantic model (`field_name`, `field_value`, `confidence`, `needs_review`, `created_at`, and `document_id` for cross-document responses) and verify it serializes an `ExtractionResult` row correctly via a unit test
- [ ] 1.2 Add pagination response wrapper (`items`, plus enough metadata for the caller to request the next page) and verify a unit test covers an empty page and a partial last page

## 2. Retrieve By Document

- [ ] 2.1 Implement `GET /documents/{document_id}/fields` returning all field-level records for that document (without a repeated `document_id` per record, per design.md Decision 3) and verify an integration test confirms all records for a seeded document are returned
- [ ] 2.2 Verify a document that exists but has no field-level records returns an empty result (200), not an error, via a test (spec: Empty result for a document with no extracted fields)
- [ ] 2.3 Verify a nonexistent document identifier returns a not-found response, via a test (spec: Not found for a nonexistent document)
- [ ] 2.4 Add the `needs_review` optional filter to this endpoint and verify a test confirms only flagged records are returned when applied, and all records when omitted (spec: Filter Retrieval To Records Needing Review)

## 3. Retrieve By Field Name

- [ ] 3.1 Implement `GET /fields/{field_name}` returning all field-level records with that name across documents (each identifying its document, per design.md Decision 3) and verify an integration test confirms records from multiple documents are returned together
- [ ] 3.2 Verify an unused field name returns an empty result, not an error, via a test (spec: Empty result for an unused field name)
- [ ] 3.3 Add the `needs_review` optional filter to this endpoint and verify a test, matching task 2.4's coverage for this endpoint
- [ ] 3.4 Add limit/offset pagination to this endpoint and verify a test confirms a bounded page is returned and a further page can be requested for a field name with more matches than one page's limit (spec: Cross-Document Retrieval Is Paginated)

## 4. Retrieve By Classified Type

- [ ] 4.1 Implement `GET /document-types/{type}/documents` returning documents whose classified type matches, internally querying `field_name = DOCUMENT_TYPE_FIELD_NAME` without exposing that convention in the endpoint's contract (design.md Decision 2), reusing the existing `DocumentOut` response model, and verify an integration test confirms documents of a seeded type are returned
- [ ] 4.2 Verify an unused classified type returns an empty result, not an error, via a test (spec: Empty result for an unused type)
- [ ] 4.3 Add limit/offset pagination to this endpoint and verify a test matching task 3.4's coverage for this endpoint

## 5. Test Coverage & Verification

- [ ] 5.1 Add backend tests covering every scenario in specs/field-level-query/spec.md and verify the full suite passes
- [ ] 5.2 Verify none of the three new endpoints, nor the existing `GET /documents/{id}` and `GET /documents/{id}/extraction`, require authentication today, confirming this story's endpoints match the existing (unauthenticated) posture rather than introducing an inconsistency — via a test asserting all four return normal responses with no auth header present
- [ ] 5.3 Manually verify end-to-end: upload a document, confirm its fields are retrievable by document, its classified type retrievable via the by-type endpoint, and at least one field name retrievable via the by-field endpoint across more than one uploaded document
