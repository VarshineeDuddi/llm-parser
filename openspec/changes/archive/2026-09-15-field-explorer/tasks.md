## 1. API Client

- [x] 1.1 Add a `getFieldOccurrences(fieldName, { limit, offset })` function to `api/documents.ts` calling `GET /fields/{field_name}` with `authHeaders()` attached, and verify a unit test confirms the header is present and the paginated response parses into typed records

## 2. Field Explorer Page

- [x] 2.1 Implement the Field Explorer page with a field-name input and a results table (document link, value, confidence, needs-review) fetched via `getFieldOccurrences`, and verify a component test confirms results render for a mocked search (spec: Matching documents and values are shown)
- [x] 2.2 Add an explicit no-results message for a search with zero matches, and verify a component test confirms it renders instead of an empty table (spec: No results for an unused field name)
- [x] 2.3 Add pagination controls wired to `limit`/`offset`, and verify a component test confirms requesting the next page fetches with the correct offset (spec: Field Explorer Results Are Paginated)
- [x] 2.4 Add client-side sort controls for value, confidence, and needs-review status over the currently-loaded page, and verify a component test confirms selecting each sort option reorders the displayed rows accordingly (spec: Field Explorer Results Are Sortable)
- [x] 2.5 Make each row's document identifier link to that document's detail route (5.2), and verify a test confirms the link target for a rendered row

## 3. Test Coverage & Verification

- [x] 3.1 Add tests covering every scenario in specs/field-explorer/spec.md and verify the full suite passes
- [x] 3.2 Manually verify end-to-end: upload two or more documents sharing a field name with different values, search for that field name, confirm all matching documents appear with correct values, and confirm sorting by each available column works
