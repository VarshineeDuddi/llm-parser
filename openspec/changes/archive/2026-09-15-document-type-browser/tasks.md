## 1. API Client

- [x] 1.1 Add a `getDocumentsByType(type, { limit, offset })` function to `api/documents.ts` calling `GET /document-types/{type}/documents` with `authHeaders()` attached, and verify a unit test confirms the header is present and the paginated response parses into typed records

## 2. Document Type Browser Page

- [x] 2.1 Implement the Document Type Browser page with a type-name input and a results table (filename, format, size, status, extraction status) fetched via `getDocumentsByType`, and verify a component test confirms results render for a mocked filter (spec: Matching documents are shown)
- [x] 2.2 Add an explicit no-results message for a filter with zero matches, and verify a component test confirms it renders instead of an empty table (spec: No results for an unused type)
- [x] 2.3 Add pagination controls wired to `limit`/`offset`, and verify a component test confirms requesting the next page fetches with the correct offset (spec: Document Type Browser Results Are Paginated)
- [x] 2.4 Make each row link to that document's detail route (5.2), and verify a test confirms the link target for a rendered row

## 3. Test Coverage & Verification

- [x] 3.1 Add tests covering every scenario in specs/document-type-browser/spec.md and verify the full suite passes
- [x] 3.2 Manually verify end-to-end: upload two or more documents that classify to the same type, filter by that type, and confirm all matching documents appear
