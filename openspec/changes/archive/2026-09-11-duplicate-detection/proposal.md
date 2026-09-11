## Why

Once a document's content has already been accepted and its text
extracted, uploading the same content again should not be treated as new
work. Per the BRD, the system "does not re-process a document it has
already parsed (duplicate detection by content)," and per the
cost-awareness requirement, every processed document is expected to
eventually trigger a paid LLM extraction call — re-processing identical
content wastes that cost. This is Zoho Sprints story **1.3 Duplicate
Detection** under epic **Document Ingestion & Duplicate Detection**
(`57591000000023001`) in the Document Parser (MVP) project — the exact
Sprints item ID for 1.3 was not looked up during this proposal and
should be confirmed/linked when the Sprints story is synced (e.g. via
the `zoho:update-story` skill). It is the third story in the epic,
explicitly flagged as a sibling of 1.2 in that story's own proposal, and
depends on both 1.1 (`document-ingestion` — a document must exist) and
1.2 (`text-extraction` — extracted text must exist to compare).

LLM-based field extraction — the actual costly step this guards against
re-running — has not been built yet. This story lays the groundwork (the
duplicate relationship and a comparable content signature) so that once
extraction exists, it can check duplicate status before spending an LLM
call; it does not itself skip any LLM call, since none exists to skip.

BRD source: no standalone `docs/BRD.md` exists in this repo; the business
requirement referenced is the MVP product description captured in
`openspec/config.yaml`'s `context` block, specifically the "duplicate
detection by content" functional requirement and the cost-awareness
non-functional requirement that duplicate detection avoids redundant LLM
calls.

## What Changes

- Add a duplicate-detection capability: after a document's text
  extraction succeeds, compute a content signature (hash) from its
  extracted text and compare it against previously extracted documents.
- If the content matches an existing, non-duplicate document, record the
  new upload as a duplicate: set its status to `duplicate` and store a
  reference to the original document it matches.
- If no match is found, the document proceeds exactly as it does today —
  no behavior change for unique uploads.
- A document whose extraction failed (no text layer, unreadable file) is
  never compared and can never be marked a duplicate — duplicate
  detection only operates on documents with successfully extracted text.
- The original document a duplicate points to is never itself modified,
  re-scored, or marked duplicate as a result of a later match against it.
- Out of scope for this story: actually skipping any future LLM
  extraction call for a duplicate (that enforcement point doesn't exist
  yet — no LLM-based extraction has been built); fuzzy or near-duplicate
  matching beyond exact content-hash equality; and deduplicating
  documents whose extraction failed.

## Capabilities

### New Capabilities
- `duplicate-detection`: detecting, after a document's text extraction
  succeeds, whether its content matches an already-processed document,
  and recording that relationship instead of treating the upload as new,
  independent content.

### Modified Capabilities
- None. `document-ingestion`'s `status` field is already open-ended (not
  a closed enum — 1.2 already established this precedent when it left
  the field unchanged while extraction outcomes were added elsewhere),
  so adding a `duplicate` status value does not change any existing
  requirement's behavior. `text-extraction`'s requirements govern
  extracting and persisting text and outcome; adding an internal content
  signature alongside the extracted text for comparison purposes changes
  no externally observable behavior of that capability.

## Impact

- **Backend**: a new duplicate-lookup step invoked after the existing
  extraction service call succeeds; a content-hashing utility over
  extracted text; a query comparing a new document's hash against prior
  documents' hashes; an update path setting a document's status and
  duplicate reference.
- **Data**: a new nullable, indexed `content_hash` column on
  `document_extractions` (populated only on successful extraction); a
  new nullable, self-referential `duplicate_of_id` column on `document`
  (FK to `document.id`); reuse of the existing open-ended `status` field
  with a new `duplicate` value — no schema change needed for that value
  itself.
- **Frontend**: surface duplicate status and a reference to the original
  document in the existing upload result / document status display.
- **Dependencies**: depends on 1.1 (a document record must exist) and
  1.2 (extracted text must exist to hash and compare). No new external
  service dependency — comparison is local, in-process.

**Schema classification note**: this story adds data-model elements
(two new nullable columns), one of `config.yaml`'s listed
parser-sensitive triggers. Consistent with the precedent set in 1.1 and
1.2 — both judged foundational, additive MVP pipeline plumbing rather
than risk-bearing changes, with no credentials, no new external
integration, and no change to the hard constraints — this story is kept
on parser-standard; flagging here so a reviewer can override that
judgment.

## Rollback

Remove the duplicate-lookup call from the post-extraction flow, revert
the migration adding `content_hash` and `duplicate_of_id`, and stop
computing/comparing content hashes. Uploaded documents and the 1.1/1.2
capabilities are unaffected — no document that predates this story has
its `status` changed away from what extraction already recorded for it.
