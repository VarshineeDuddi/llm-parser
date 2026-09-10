## 1. Extraction Data Model

- [ ] 1.1 Define the `DocumentExtraction` SQLAlchemy model (`id`, `document_id` FK unique to `document.id`, `extracted_text`, `status`, `failure_reason`, `extracted_at`) per design.md and verify the model does not add or alter any column on the existing `Document` table
- [ ] 1.2 Generate and apply the Alembic migration for `document_extractions` and verify the migration applies and rolls back cleanly without touching the `documents` table's migration history

## 2. Format-Specific Extractors

- [ ] 2.1 Add `pypdf`, `python-docx`, and `python-pptx` as backend dependencies and verify package installation succeeds
- [ ] 2.2 Implement PDF text-layer extraction using `pypdf` and verify unit tests cover a PDF with extractable text and a PDF with no text layer (spec: Text-Layer Extraction for Supported Formats)
- [ ] 2.3 Implement DOCX text extraction using `python-docx` and verify a unit test extracts paragraph text from a sample DOCX (spec: Text-Layer Extraction for Supported Formats)
- [ ] 2.4 Implement PPTX text extraction using `python-pptx` and verify a unit test extracts text from slide shapes in a sample PPTX (spec: Text-Layer Extraction for Supported Formats)
- [ ] 2.5 Implement TXT extraction with UTF-8 decoding and a latin-1 fallback and verify a unit test covers both encodings
- [ ] 2.6 Implement a "no extractable text" detection rule (no non-whitespace text returned) shared across formats and verify a unit test confirms it flags an empty/whitespace-only extraction result (spec: Document has no extractable text layer)

## 3. Extraction Service & Upload Integration

- [ ] 3.1 Implement an extraction service that reads a document's stored file from object storage, dispatches to the correct format extractor by the document's recorded format, and writes a `DocumentExtraction` row recording outcome and (on success) text, and verify an integration test confirms the row is created for each supported format
- [ ] 3.2 Wrap the extraction service call in error handling so any extractor exception is captured as a failed outcome with a reason rather than propagating, and verify a unit test simulates an extractor raising an exception and confirms a `failed` row is recorded, not an unhandled error
- [ ] 3.3 Call the extraction service synchronously from the upload endpoint immediately after the `Document` record is created, and verify an integration test confirms extraction runs within the same upload request (spec: Extraction Triggered After Upload)
- [ ] 3.4 Verify a failure in extraction does not roll back or affect the already-created `Document` record or stored file, via a test that forces an extraction failure and asserts the document remains queryable with its `received` status intact (spec: Extraction Failure Isolation)
- [ ] 3.5 Extend the upload response model to include extraction outcome (status, and failure reason if failed) and verify a response contract test covers both success and failure shapes

## 4. Extracted Text Retrieval

- [ ] 4.1 Implement a way to retrieve a document's extracted text and extraction outcome by document ID (API endpoint or service method per design.md) and verify an integration test retrieves text for a document with a successful extraction (spec: Extracted Text Persistence)
- [ ] 4.2 Verify retrieval for a document whose extraction failed returns the failure outcome/reason rather than text, via a test covering that path (spec: Extraction Outcome Tracking)

## 5. Frontend Extraction Status

- [ ] 5.1 Update the existing upload result display to show extraction outcome (succeeded, or failed with reason) alongside the upload result, and verify this manually for a document that extracts successfully

## 6. Test Coverage & Verification

- [ ] 6.1 Add backend tests covering every scenario in specs/text-extraction/spec.md (extraction triggered after upload, text-layer extraction per format, no text layer, extracted text persistence and retrieval, outcome tracking, failure isolation) and verify the full suite passes
- [ ] 6.2 Manually verify end-to-end: upload one file of each supported format (PDF, DOCX, PPTX, TXT) and confirm extracted text is retrievable for each, then upload a scanned/image-only PDF (no text layer) and confirm it is recorded as a failed extraction with a reason rather than blocking the upload
- [ ] 6.3 Verify both hard constraints hold per design.md's confirmation: extracted text is verbatim/grounded (no inference at this stage), and the new `document_extractions` table does not introduce or foreclose the future field-level key/value storage model
