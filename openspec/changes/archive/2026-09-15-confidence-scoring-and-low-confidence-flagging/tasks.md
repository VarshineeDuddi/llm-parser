## 1. Data Model

- [x] 1.1 Add nullable `confidence` (float) and `needs_review` (boolean, default false) columns to the `ExtractionResult` model per design.md and verify the model change does not alter `field_name`, `field_value`, or `source_quote`
- [x] 1.2 Generate and apply the Alembic migration for both columns and verify it applies and rolls back cleanly without altering existing `extraction_results`, `document`, or `document_extractions` rows

## 2. Prompt & Response Schema

- [x] 2.1 Extend the LLM prompt to request a `confidence` value (0.0-1.0) per field entry alongside `field_name`, `value`, and `source_quote`, and verify a unit test confirms the prompt text requests the new key
- [x] 2.2 Extend response parsing to require and validate `confidence` on each entry, treating a missing or non-numeric `confidence` the same as any other malformed entry (invalid response), and verify unit tests cover a valid response with confidence, a response missing `confidence`, and a response with a non-numeric `confidence` (spec: Confidence Scoring for Extracted Fields)

## 3. Mechanical Confidence Adjustment

- [x] 3.1 Implement a function that caps confidence when a `source_quote` matched only via whitespace normalization (not an exact substring), and verify a unit test confirms an exact match keeps its reported confidence while a normalized-only match is capped lower (spec: Exact match receives higher confidence than a normalized-only match)
- [x] 3.2 Implement a function that caps confidence when a `source_quote` appears at more than one distinct location in the document's `extracted_text`, and verify a unit test confirms a uniquely-located quote is unaffected while a repeated one is capped lower (spec: Ambiguous source location lowers confidence)
- [x] 3.3 Combine both mechanical adjustments with the model-reported confidence (lowest applicable cap wins) into a single final confidence value per entry, and verify a unit test confirms an entry triggering both adjustments receives the lower of the two caps

## 4. Threshold & Review Flagging

- [x] 4.1 Define the fixed confidence threshold constant per design.md and set `needs_review = true` on persistence when an entry's final confidence falls below it, and verify a unit test confirms entries above, at, and below the threshold are flagged correctly (spec: Low-Confidence Fields Are Flagged for Review)
- [x] 4.2 Verify a flagged record is still persisted and retrievable (not discarded or excluded from normal storage), via a test that confirms a flagged `ExtractionResult` row exists and is queryable like any other row (spec: Flagged field is not discarded)
- [x] 4.3 Set the classified document type's field-level record (`_document_type`) through the same confidence/flagging path as any other field, and verify a test confirms it receives a confidence score and can be flagged like any other field

## 5. Integration with Existing Extraction Flow

- [x] 5.1 Wire the confidence computation and threshold check into `run_llm_extraction`'s persistence path so every entry that passes the existing grounding check also receives `confidence`/`needs_review` before being saved, and verify an integration test (mocked Anthropic client) confirms both fields are populated on every persisted `ExtractionResult` row
- [x] 5.2 Verify the existing grounding gate's behavior is unchanged: an entry that still fails `is_grounded` is dropped entirely and never reaches confidence scoring, via a regression test re-running 2.1's grounding scenarios (spec: Extracted Values Must Be Grounded in the Source Document — unchanged)

## 6. Test Coverage & Verification

- [x] 6.1 Add backend tests covering every new/modified scenario in specs/llm-extraction/spec.md (confidence indicator present on every record, exact-vs-normalized-match confidence difference, ambiguous-location confidence penalty, low-confidence flagging, flagged-not-discarded, high-confidence not flagged) and verify the full suite passes
- [x] 6.2 Manually verify end-to-end against the real Anthropic API using synthetic/de-identified fixture documents (per data policy): confirm extracted fields show varying confidence values and that a deliberately ambiguous fixture (e.g. a repeated phrase used as a source quote) is flagged `needs_review`
- [x] 6.3 Verify both hard constraints hold per design.md's confirmation: the grounding gate's pass/fail behavior is bit-for-bit unchanged (re-run 2.1's grounding unit tests), and `extraction_results` still contains no document-type-specific columns after adding `confidence`/`needs_review`
