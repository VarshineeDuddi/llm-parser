## 1. Backend: Needs-Review Endpoint

- [ ] 1.1 Implement `GET /needs-review` requiring `Depends(get_current_user)`, returning `PaginatedResponse[FieldResultWithDocumentOut]` filtered to `ExtractionResult.needs_review == True` joined to documents owned by the caller, and verify an integration test confirms flagged fields across multiple documents are returned together (spec: Flagged fields are listed across documents)
- [ ] 1.2 Verify a user with no flagged fields gets an empty paginated result, not an error, via a test (spec: Empty result when nothing is flagged)
- [ ] 1.3 Verify a second user's flagged fields never appear in the first user's queue, via a test seeding both users with flagged fields (spec: Another user's flagged fields are excluded)
- [ ] 1.4 Add pagination (`limit`/`offset`, matching 3.2's existing pattern) and verify a test confirms a bounded page is returned and a further page can be requested (spec: Needs-Review Queue Is Paginated)
- [ ] 1.5 Verify an unauthenticated request to this endpoint is rejected, matching every other document/extraction endpoint's behavior, via a test

## 2. Frontend: Needs-Review Queue Page

- [ ] 2.1 Add a `getNeedsReviewQueue({ limit, offset })` function to `api/documents.ts` calling `GET /needs-review` with `authHeaders()` attached, and verify a unit test confirms the header is present and the paginated response parses into typed records
- [ ] 2.2 Implement the Needs-Review Queue page rendering a table of flagged fields (document, field name, value, confidence) fetched via `getNeedsReviewQueue`, and verify a component test confirms results render for a mocked response
- [ ] 2.3 Add an explicit "nothing needs review" message for an empty queue, and verify a component test confirms it renders instead of an empty table
- [ ] 2.4 Add pagination controls wired to `limit`/`offset`, and verify a component test confirms requesting the next page fetches with the correct offset
- [ ] 2.5 Make each row link to that document's detail route (5.2), and verify a test confirms the link target for a rendered row

## 3. Test Coverage & Verification

- [ ] 3.1 Add tests covering every scenario in specs/needs-review-queue/spec.md and verify the full suite passes
- [ ] 3.2 Manually verify end-to-end: upload documents until at least one field is flagged needs-review (or force one via a low-confidence fixture), confirm it appears in the queue, and confirm a second user's queue does not show it
