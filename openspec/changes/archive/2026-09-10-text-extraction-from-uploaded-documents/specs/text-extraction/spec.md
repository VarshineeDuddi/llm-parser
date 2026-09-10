## Purpose

Lets the system turn an accepted, stored document into plain text, so
downstream processing (future LLM-based field extraction) has content to
work on instead of an opaque file.

## ADDED Requirements

### Requirement: Extraction Triggered After Upload
The system SHALL extract text from a document's stored file automatically
and synchronously as a follow-on step after the document is successfully
accepted and stored, without requiring a separate caller-initiated
action.

#### Scenario: Extraction runs after a successful upload
- **WHEN** a document has been accepted and its metadata record created
- **THEN** the system attempts text extraction for that document before
  returning the document as ready for further processing

### Requirement: Text-Layer Extraction for Supported Formats
The system SHALL extract a document's text-layer content for each of the
formats accepted by upload (PDF, DOCX, PPTX, TXT). Extraction SHALL be
limited to text already present in the document's text layer; the system
SHALL NOT perform optical character recognition (OCR) on images or
scanned content.

#### Scenario: Extraction of a text-layer PDF
- **WHEN** an accepted document is a PDF containing a text layer
- **THEN** the system extracts the text-layer content from the PDF

#### Scenario: Extraction of a DOCX, PPTX, or TXT document
- **WHEN** an accepted document is a DOCX, PPTX, or TXT file
- **THEN** the system extracts the document's textual content

#### Scenario: Document has no extractable text layer
- **WHEN** an accepted document (for example, a scanned/image-only PDF)
  contains no text layer
- **THEN** the system does not fabricate extracted text and instead
  records the extraction as failed with a reason indicating no text
  layer was found

### Requirement: Extracted Text Persistence
The system SHALL persist a document's extracted text such that it can be
retrieved later using the document's identifier, independent of the
document's original format.

#### Scenario: Extracted text is retrievable after successful extraction
- **WHEN** text extraction for a document has succeeded
- **THEN** the extracted text can be retrieved using that document's
  identifier

### Requirement: Extraction Outcome Tracking
The system SHALL record, per document, whether text extraction succeeded
or failed, and SHALL record a human-readable reason when it failed. This
outcome SHALL be observable separately from the document's upload
("received") status.

#### Scenario: Successful extraction is recorded
- **WHEN** text extraction for a document completes successfully
- **THEN** the document's extraction outcome is recorded as succeeded

#### Scenario: Failed extraction is recorded with a reason
- **WHEN** text extraction for a document fails for any reason (for
  example, no text layer, or a corrupt/unreadable file)
- **THEN** the document's extraction outcome is recorded as failed, with
  a human-readable reason, and no partial or fabricated text is persisted
  as if it were complete

### Requirement: Extraction Failure Isolation
The system SHALL handle an extraction failure for one document without
affecting the accepted status or stored file of that document, and
without affecting extraction or upload processing for any other
document.

#### Scenario: One document's extraction failure does not affect others
- **WHEN** text extraction fails for one accepted document
- **THEN** that document's upload record and stored file remain intact,
  and extraction for other documents continues unaffected
