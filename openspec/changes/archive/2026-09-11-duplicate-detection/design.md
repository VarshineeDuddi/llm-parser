## Context

See proposal.md - Why. The relevant current state: `document-ingestion`
(1.1) creates a `Document` record (status starts and today remains
`received`) for every accepted upload; `text-extraction` (1.2) runs
synchronously right after that and writes a `document_extractions` row
(`extracted_text`, `status` succeeded/failed, `failure_reason`,
`extracted_at`) keyed by `document_id`, independent of `Document.status`.
No LLM-based field extraction exists yet, so there is currently nothing
downstream for duplicate detection to actually gate — this story only
establishes the relationship and signature a future story will consult.

## Goals / Non-Goals

**Goals:**
- Compute a comparable content signature for a document once its text
  extraction succeeds.
- Detect an exact match against a prior, non-duplicate document's
  signature and record the relationship.
- Make that relationship visible by document ID, without disturbing the
  original document it points to.

**Non-Goals:**
- Actually skipping a future LLM extraction call for a duplicate — no
  such call exists yet to skip.
- Fuzzy, partial, or near-duplicate matching (whitespace normalization
  aside) — only exact content-hash equality.
- Deduplicating documents whose extraction failed, or across different
  extraction attempts of the same document (1.2 supports only one
  attempt per document today).

## Decisions

**1. The content signature hashes extracted text, not the raw uploaded
file's bytes.**
A SHA-256 digest is computed over the document's `extracted_text` (from
1.2), after collapsing runs of whitespace so incidental formatting
differences don't produce a false negative.
- Alternative considered: hash the raw uploaded file's bytes at upload
  time. Rejected — it only catches byte-identical re-uploads and would
  miss the same document re-saved or re-exported to a different file
  with different bytes but identical content, which is the more useful
  case "duplicate detection by content" is meant to catch. It also
  couples dedup to the upload step rather than the point where content
  actually becomes comparable.
- Trade-off accepted: a document whose extraction failed has no
  signature and can never participate in duplicate detection (see
  Requirement: Duplicate Detection Requires Successful Extraction). This
  is judged acceptable — such a document has no reliable content signal
  to compare in the first place.

**2. Duplicate relationship stored as a nullable, self-referential
`duplicate_of_id` column on `Document`, reusing the existing open-ended
`status` field with a new `duplicate` value — no new table.**
`document_extractions` gains a nullable, indexed `content_hash` column,
populated only when extraction succeeds.
- Alternative considered: a separate `document_duplicates` link table.
  Rejected — a document duplicates at most one original, so a single
  nullable FK column is sufficient; a link table would add join
  complexity with no benefit at this cardinality.
- Alternative considered: a new closed status enum. Rejected — 1.2
  already established that `Document.status` is open-ended and adding
  values doesn't change `document-ingestion`'s requirements; introducing
  a separate enum type here would contradict that precedent and "preserve
  existing architecture unless a change is justified."
- Chains are prevented by construction: the duplicate lookup only
  considers candidates whose own status is not `duplicate`, so
  `duplicate_of_id` always points directly at an original, never at
  another duplicate.

**3. The duplicate lookup runs synchronously, immediately after a
successful extraction, in the same request.**
Consistent with 1.2's "Extraction Triggered After Upload" pattern and
`config.yaml`'s synchronous-processing guidance for the MVP. On a
successful extraction, the service hashes the text, queries
`document_extractions` for the earliest other row with the same
`content_hash` whose document status is not `duplicate`, and if found,
sets the new document's `status` to `duplicate` and `duplicate_of_id` to
that document's ID. On no match, or on a failed extraction, nothing
about this flow changes today's behavior.

## Risks / Trade-offs

- [Two near-simultaneous uploads of the same new content could both miss
  seeing each other and both become "originals"] → Acceptable for MVP;
  synchronous single-request processing at expected low upload volume
  makes this rare. Revisit with a DB-level uniqueness/locking strategy if
  volume demonstrates the need, per `config.yaml`'s deployment guidance.
- [Whitespace-normalized exact hashing misses near-duplicate content with
  substantive but small differences] → Accepted; the BRD scope is
  content-identical re-uploads, not fuzzy similarity matching. Fuzzy
  matching is a future enhancement, not this story's scope.
- [A document whose extraction later succeeds on retry could never be
  deduplicated under today's single-attempt model] → Not a new risk
  introduced by this story; 1.2 already limits extraction to one attempt
  per document. Revisit alongside any future retry story.

## Hard constraints confirmation

- **Grounded in source document**: duplicate matching is exact hash
  equality over verbatim extracted text — nothing is inferred, guessed,
  or fabricated about the relationship between two documents. There are
  no extracted facts produced by this story to ground.
- **Field-level key/value storage model**: not applicable — this story
  introduces no field/value extraction records. The new `content_hash`
  and `duplicate_of_id` columns are structural bookkeeping about the
  document itself, not extraction results, and neither introduces nor
  forecloses the field-level table the future extraction story will need.

## Migration Plan

- Add an Alembic migration adding a nullable, indexed `content_hash`
  column to `document_extractions`, and a nullable, self-referential
  `duplicate_of_id` column (FK to `document.id`) to `document`.
- No changes to `document`'s or `document_extractions`' existing
  columns or migration history.
- Rollback: drop both new columns via a down-migration; remove the
  duplicate-lookup call from the post-extraction flow. No impact on
  already-stored documents, extracted text, or the 1.1/1.2 capabilities.
