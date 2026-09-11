## Why

Documents accepted by the local upload story (1.1) are stored as opaque
files — nothing in the system can yet read what's inside them. Before any
LLM-based field extraction can happen, the system needs to pull the raw
text-layer content out of an accepted document so that content exists as
plain text the rest of the pipeline can consume. This is Zoho Sprints
story **1.2 Text Extraction from Uploaded Documents** under epic
**Document Ingestion & Duplicate Detection** (`57591000000023001`) in the
Document Parser (MVP) project — the exact Sprints item ID for 1.2 was not
looked up during this proposal and should be confirmed/linked when the
Sprints story is synced (e.g. via the `zoho:update-story` skill). It is
the second story in the epic, depending on 1.1 (a document must already
exist in storage), and unblocks any future LLM-based field extraction
work, which needs plain text to operate on.

BRD source: no standalone `docs/BRD.md` exists in this repo; the business
requirement referenced is the MVP product description captured in
`openspec/config.yaml`'s `context` block (text-layer documents only, free-
form LLM extraction deferred to a later story, field-level storage model
for eventual extraction results).

## What Changes

- Add a text extraction capability: for a document already accepted and
  stored by the upload story (1.1), read its stored file and extract the
  document's text-layer content (PDF, DOCX, PPTX, TXT — the same four
  formats 1.1 validates on upload).
- Extraction is text-layer only. Scanned/image-only PDFs or any document
  without an extractable text layer are out of scope for the MVP (no
  OCR) — per `config.yaml`, the product targets text-layer documents.
- Run extraction synchronously as a follow-on step after a successful
  upload, consistent with the deployment context's "parsing is
  synchronous initially" guidance.
- Persist the extracted text so it can be retrieved later by document ID,
  independent of the source format.
- Track extraction outcome on the document (succeeded / failed with a
  reason), and surface that outcome so a caller can tell whether a
  document is ready for downstream processing.
- Out of scope for this story: any LLM-based field/value extraction from
  the text (a later story), OCR for non-text-layer documents, and
  duplicate detection (1.3, a sibling story in the same epic).

## Capabilities

### New Capabilities
- `text-extraction`: reading an accepted document's stored file,
  extracting its text-layer content for supported formats, persisting
  the extracted text, and tracking/reporting extraction outcome.

### Modified Capabilities
- None. The `document-ingestion` capability's status field is already
  generic ("a status indicating the document has been received") and
  does not enumerate a closed set of values, so adding further status
  values as extraction progresses does not change any existing
  requirement's behavior.

## Impact

- **Backend**: new extraction service invoked after a successful upload;
  one extraction implementation per supported format (PDF, DOCX, PPTX,
  TXT) reading text-layer content only; new Pydantic models for
  extraction status/result; extraction outcome update path for the
  existing document record.
- **Data**: introduces storage for a document's extracted text (e.g. a
  new table or column keyed by document ID) and outcome/error tracking.
  This is the extracted text itself — the document's full plain-text
  content — not the field-level key/value records the hard constraint
  governs; that constraint applies to future LLM-derived field extraction
  results, not to this raw text-layer extraction step.
- **Frontend**: surface extraction status (pending/succeeded/failed and
  failure reason) alongside the existing upload result, likely as a
  status update to the same document record shown after upload.
- **Dependencies**: depends on 1.1 (`document-ingestion`) — a document
  must already exist in storage with a "received" status before
  extraction can run. No new external service dependency (no S3 or LLM
  involvement); extraction is local, in-process file parsing.

**Schema classification note**: this story adds a new data-model element
(extracted text + outcome storage), one of `config.yaml`'s listed
parser-sensitive triggers. Consistent with the precedent set in 1.1 (the
first document table was judged foundational MVP plumbing, not a risk-
bearing change), this is continuing, additive pipeline storage for the
same document lifecycle — no credentials, no new external integration,
no change to the hard constraints. Kept on parser-standard; flagging here
so a reviewer can override that judgment.

## Rollback

Remove the extraction service and its trigger after upload, revert the
migration adding extracted-text/outcome storage, and stop invoking
extraction. Uploaded documents and the 1.1 upload capability are
unaffected — extraction is a downstream addition that does not alter how
documents are accepted or stored.
