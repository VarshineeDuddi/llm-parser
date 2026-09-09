## 1. Backend Project Scaffolding

- [ ] 1.1 Create the FastAPI application skeleton (app entrypoint, settings/config loading, Docker setup) and verify `uvicorn` starts the app and responds on a health-check route
- [ ] 1.2 Configure SQLAlchemy 2.x engine/session setup and Alembic migration environment, and verify `alembic upgrade head` runs cleanly against a local PostgreSQL instance
- [ ] 1.3 Add an S3-compatible storage client wrapper (config for endpoint/bucket/credentials via environment variables, no secrets committed) and verify a test file can be written to and read back from the configured bucket

## 2. Document Data Model

- [ ] 2.1 Define the `Document` SQLAlchemy model (`id`, `original_filename`, `format`, `size_bytes`, `storage_key`, `status`, `created_at`) per design.md and verify the model matches the generic, format-agnostic shape required by specs/document-ingestion/spec.md
- [ ] 2.2 Generate and apply the Alembic migration for the `documents` table and verify the migration applies and rolls back cleanly

## 3. Upload Endpoint

- [ ] 3.1 Implement the upload API endpoint (accepts a multipart file upload) and verify it returns 4xx with a clear error when no file is attached (spec: Local File Upload)
- [ ] 3.2 Implement format validation combining file extension and content-sniffing for PDF/DOCX/PPTX/TXT and verify unit tests cover: each supported format accepted, an unsupported format rejected, and a mismatched extension/content pair rejected (spec: Supported Format Validation)
- [ ] 3.3 Implement empty-file rejection and verify a zero-byte upload is rejected with a clear error and no document record is created (spec: Supported Format Validation)
- [ ] 3.4 Wire the endpoint to store the accepted file in object storage under a generated document ID and create the corresponding `Document` record with status `received`, and verify an integration test confirms the stored file is retrievable via the recorded storage key (spec: Durable Source File Storage, Document Metadata Record)
- [ ] 3.5 Enforce a maximum upload size at the API layer and verify an oversized upload is rejected before being written to storage
- [ ] 3.6 Return the created document's identifier and status on success, and a human-readable rejection reason on failure, and verify response contracts with request/response model tests (spec: Upload Result Visibility)

## 4. Frontend Upload UI

- [ ] 4.1 Scaffold the React + TypeScript + Vite + MUI frontend project and verify it builds and runs locally
- [ ] 4.2 Build an upload page/component that lets a user pick a local file and submit it to the upload endpoint, and verify it displays the accepted document's identifier/status on success
- [ ] 4.3 Display the rejection reason returned by the API when an upload fails, and verify this manually for an unsupported-format file and an empty file

## 5. Test Coverage & Verification

- [ ] 5.1 Add backend tests covering every scenario in specs/document-ingestion/spec.md (successful upload, no file provided, unsupported format, empty file, retrievability, metadata shape, rejection messaging) and verify the full suite passes
- [ ] 5.2 Verify the `documents` table shape does not encode any document-type-specific columns, confirming the hard constraint that storage shape must not vary by document type
- [ ] 5.3 Manually verify end-to-end: upload one file of each supported format (PDF, DOCX, PPTX, TXT) through the frontend and confirm each is accepted, stored, and recorded
