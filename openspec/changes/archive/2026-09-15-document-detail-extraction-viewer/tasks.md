## 1. API Client

- [x] 1.1 Add `getDocument(documentId)` and `getExtraction(documentId)` functions to `api/documents.ts` calling `GET /documents/{id}` and `GET /documents/{id}/extraction` with `authHeaders()` attached, mirroring `getDocumentFields`'s existing pattern (`getDocumentFields` itself already exists from 3.3), and verify unit tests confirm both parse successful responses into typed records

## 2. Document Detail Page

- [x] 2.1 Implement the Document Detail page at `/documents/:id` (filling 5.1's reserved route, or establishing it if built first per design.md Decision 1) fetching all three endpoints for the given document ID, and verify a component test confirms the page renders given mocked responses
- [x] 2.2 Display raw extracted text when present, and an explicit "no extracted text available" message when text extraction failed, and verify a component test covers both states (spec: Document Detail Shows Raw Extracted Text)
- [x] 2.3 Display the fields table with confidence and needs-review indicators per field (reusing 3.3's visual pattern per design.md Decision 2), and an explicit "no fields available" message when there are none, and verify a component test covers both states (spec: Document Detail Shows Fields With Confidence And Review Status)
- [x] 2.4 Display a duplicate-of link when the document's `duplicate_of_id` is set, and nothing when it isn't, and verify a component test covers both states (spec: Document Detail Shows Duplicate Relationship)

## 3. Test Coverage & Verification

- [x] 3.1 Add tests covering every scenario in specs/document-detail-view/spec.md and verify the full suite passes
- [x] 3.2 Manually verify end-to-end: upload a document, navigate to its detail view, confirm text/fields/duplicate status all render correctly, and upload a duplicate of it to confirm the duplicate-of link appears on the second document's detail page
