## 1. Anthropic Client & Credential Wiring

- [ ] 1.1 Add the Anthropic Python SDK as a backend dependency and verify package installation succeeds
- [ ] 1.2 Add an `ANTHROPIC_API_KEY` setting to the existing settings/config module (env-var only, no default/hardcoded value) and verify a configuration test confirms the app fails to start when it is unset (test-strategy: Credential handling)
- [ ] 1.3 Implement a thin Anthropic client wrapper (single method: send document text, return raw model response) with no document text, API key, or raw response written to logs, and verify a log-inspection test confirms none of those appear in log output for a mocked call (test-strategy: Production document content sent to a third party)

## 2. Data Model

- [ ] 2.1 Define the `ExtractionResult` SQLAlchemy model (`id`, `document_id` FK, `field_name`, `field_value`, `source_quote`, `created_at`) per design.md and verify the model enforces one row per document/field pair with no document-type-specific columns
- [ ] 2.2 Define the LLM extraction outcome tracking model (`document_id` FK unique, `status`, `failure_reason`, `extracted_at`) per design.md and verify it is independent of `document_extractions`' own `status` column
- [ ] 2.3 Generate and apply the Alembic migration for both and verify it applies and rolls back cleanly without altering `document` or `document_extractions`' existing columns or migration history

## 3. Classification & Extraction Prompting

- [ ] 3.1 Build the structured-output prompt requesting a single JSON response (`document_type` plus a list of `{field_name, value, source_quote}` entries) and verify a unit test confirms the prompt includes the document's full `extracted_text` and no other document's content
- [ ] 3.2 Implement response parsing with shape validation (rejects non-JSON or missing-required-keys responses) and verify unit tests cover a valid response, a non-JSON response, and a response missing required keys (spec: LLM Extraction Outcome Tracking — failed scenario; test-strategy: LLM response format drift)

## 4. Grounding Enforcement

- [ ] 4.1 Implement the grounding-verification function (whitespace-normalized substring match of `source_quote` against the document's `extracted_text`) and verify unit tests cover an exact match, a whitespace-normalized match, and a non-matching/paraphrased value (spec: Extracted Values Must Be Grounded in the Source Document)
- [ ] 4.2 Wire grounding verification into the response-processing path so an entry failing the check is dropped before persistence, never stored as a field/value record, and verify a unit test confirms a response mixing grounded and ungrounded entries persists only the grounded ones (spec: Ungrounded or ambiguous value is not persisted as fact)
- [ ] 4.3 Persist the classified document type as a field-level record using the reserved field name convention (not a `Document` column) and verify a test confirms it appears as an `ExtractionResult` row like any other field (spec: Field-Level Result Storage)

## 5. Extraction Orchestration & Upload Integration

- [ ] 5.1 Implement an orchestration service that: skips documents whose text extraction did not succeed, calls the Anthropic client wrapper, runs response parsing and grounding verification, and writes `ExtractionResult` rows plus the outcome record, and verify an integration test (mocked Anthropic client) confirms the full path for a successful response
- [ ] 5.2 Wire the orchestration service to run synchronously immediately after a successful text extraction, and verify an integration test confirms LLM extraction is invoked within the same upload request when text extraction succeeds, and NOT invoked when it fails (spec: LLM Extraction Triggered After Successful Text Extraction)
- [ ] 5.3 Wrap the Anthropic call and response processing in error handling so any exception (network error, timeout, API error) is captured as a failed LLM extraction outcome with a reason rather than propagating, and verify a unit test simulates a client exception and confirms a `failed` outcome is recorded, not an unhandled error (spec: Failed LLM extraction is recorded with a reason)
- [ ] 5.4 Verify an LLM extraction failure for one document does not affect that document's existing upload/text-extraction records or LLM extraction for other documents, via a test that forces a failure for one document among several and asserts the others are unaffected (spec: LLM Extraction Failure Isolation)

## 6. Test Coverage & Verification

- [ ] 6.1 Add backend tests covering every scenario in specs/llm-extraction/spec.md (triggered/skipped after text extraction, classification, free-form field extraction, grounded/ungrounded persistence, field-level storage, outcome tracking, failure isolation) and verify the full suite passes
- [ ] 6.2 Add the documenting test from test-strategy.md confirming LLM extraction runs for every successfully-extracted document today (no duplicate-skip), so a future change to that behavior is a deliberate, visible diff
- [ ] 6.3 Manually verify end-to-end against the real Anthropic API using only synthetic/de-identified fixture documents (per data policy): upload a document, confirm classification and at least one extracted field appear as `ExtractionResult` rows, each with a `source_quote` verifiable in the document's extracted text
- [ ] 6.4 Verify both hard constraints hold per design.md's confirmation: no ungrounded value is ever persisted as a field/value record (re-run the grounding unit tests as part of this verification), and `ExtractionResult` contains no document-type-specific columns
