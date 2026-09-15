## 1. Backend: List Endpoint

- [x] 1.1 Implement `GET /documents` requiring `Depends(get_current_user)` and returning `PaginatedResponse[DocumentOut]` filtered to `Document.owner_id == current_user.id` and ordered by `created_at` descending, with `limit`/`offset` pagination matching 3.2's existing pattern, and verify an integration test confirms documents are returned newest-first, paginated correctly, and scoped to the authenticated caller (spec: Documents are listed; Another user's documents are excluded)
- [x] 1.2 Verify an empty document set (for that user) returns an empty paginated result, not an error, via a test (spec: Empty result when nothing has been uploaded)
- [x] 1.3 Verify an unauthenticated request to this endpoint is rejected, matching every other document/extraction endpoint's behavior, via a test (spec: Unauthenticated request is rejected)

## 2. Frontend: Routing Foundation

- [x] 2.1 Add `react-router-dom` as a frontend dependency and verify the package installs and the app builds
- [x] 2.2 Restructure `App.tsx` to route between `/` (library, default) and the upload flow, plus a reserved `/documents/:id` route (placeholder content, for 5.2), keeping the existing "no key stored" registration gate above routing so it applies regardless of which route loads first, and verify a test confirms the library renders at `/` and the upload page is reachable from it (spec: Document Library Is The Default View)

## 3. Frontend: Document Library Table

- [x] 3.1 Add a `getDocuments()` function to `api/documents.ts` calling `GET /documents` with `authHeaders()` attached, mirroring `getDocumentFields`'s existing pattern, and verify a unit test confirms the header is present and the response parses into typed records
- [x] 3.2 Implement the Document Library page fetching via `getDocuments()` and rendering a table (filename, format, size, upload date, status, extraction status, duplicate flag), and verify a component test confirms fetched documents render with the expected columns (spec: List All Uploaded Documents)
- [x] 3.3 Add pagination controls (Next/Previous or equivalent) wired to the endpoint's `limit`/`offset`, and verify a component test confirms requesting the next page fetches with the correct offset (spec: Document List Is Paginated)
- [x] 3.4 Make each row link to `/documents/{id}` (the route reserved for 5.2), and verify a test confirms the link target for a rendered row

## 4. Test Coverage & Verification

- [x] 4.1 Add tests covering every scenario in specs/document-library/spec.md and verify the full suite passes
- [x] 4.2 Manually verify end-to-end: register a user, upload two or more documents, confirm the library shows them newest-first with correct columns, register a second user, and confirm the second user's library is empty (not the first user's documents)
