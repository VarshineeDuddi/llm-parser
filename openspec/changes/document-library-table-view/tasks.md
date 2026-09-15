## 1. Backend: List Endpoint

- [ ] 1.1 Implement `GET /documents` returning `PaginatedResponse[DocumentOut]` ordered by `created_at` descending, with `limit`/`offset` pagination matching 3.2's existing pattern, and verify an integration test confirms documents are returned newest-first and paginated correctly
- [ ] 1.2 Verify an empty document set returns an empty paginated result, not an error, via a test (spec: Empty result when nothing has been uploaded)

## 2. Frontend: Routing Foundation

- [ ] 2.1 Add `react-router-dom` as a frontend dependency and verify the package installs and the app builds
- [ ] 2.2 Restructure `App.tsx` to route between `/` (library, default) and the upload flow, plus a reserved `/documents/:id` route (placeholder content, for 5.2), and verify a test confirms the library renders at `/` and the upload page is reachable from it (spec: Document Library Is The Default View)

## 3. Frontend: Document Library Table

- [ ] 3.1 Implement the Document Library page fetching `GET /documents` and rendering a table (filename, format, size, upload date, status, extraction status, duplicate flag), and verify a component test confirms fetched documents render with the expected columns (spec: List All Uploaded Documents)
- [ ] 3.2 Add pagination controls (Next/Previous or equivalent) wired to the endpoint's `limit`/`offset`, and verify a component test confirms requesting the next page fetches with the correct offset (spec: Document List Is Paginated)
- [ ] 3.3 Make each row link to `/documents/{id}` (the route reserved for 5.2), and verify a test confirms the link target for a rendered row

## 4. Test Coverage & Verification

- [ ] 4.1 Add tests covering every scenario in specs/document-library/spec.md and verify the full suite passes
- [ ] 4.2 Manually verify end-to-end: upload two or more documents, confirm the library shows them newest-first with correct columns, and confirm navigating to the upload flow and back preserves the library view
