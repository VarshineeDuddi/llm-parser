import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentDetailPage } from "./DocumentDetailPage";
import * as documentsApi from "./api/documents";
import type { DocumentOut, ExtractionOut, FieldResultOut } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getDocument: vi.fn(),
    getExtraction: vi.fn(),
    getDocumentFields: vi.fn(),
  };
});

const mockedGetDocument = documentsApi.getDocument as ReturnType<typeof vi.fn>;
const mockedGetExtraction = documentsApi.getExtraction as ReturnType<typeof vi.fn>;
const mockedGetDocumentFields = documentsApi.getDocumentFields as ReturnType<typeof vi.fn>;

function makeDocument(overrides: Partial<DocumentOut> = {}): DocumentOut {
  return {
    id: "doc-1",
    status: "received",
    original_filename: "sample.txt",
    format: "txt",
    size_bytes: 10,
    created_at: "2026-01-01T00:00:00Z",
    extraction_status: "succeeded",
    extraction_failure_reason: null,
    duplicate_of_id: null,
    ...overrides,
  };
}

function makeExtraction(overrides: Partial<ExtractionOut> = {}): ExtractionOut {
  return {
    document_id: "doc-1",
    status: "succeeded",
    extracted_text: "hello world",
    failure_reason: null,
    extracted_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderDetail(documentId = "doc-1") {
  return render(
    <MemoryRouter initialEntries={[`/documents/${documentId}`]}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedGetDocument.mockReset();
  mockedGetExtraction.mockReset();
  mockedGetDocumentFields.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentDetailPage", () => {
  it("renders given mocked responses for all three endpoints (task 2.1)", async () => {
    mockedGetDocument.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetExtraction.mockResolvedValue({ ok: true, extraction: makeExtraction() });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    expect(await screen.findByText("sample.txt")).toBeInTheDocument();
    expect(mockedGetDocument).toHaveBeenCalledWith("doc-1");
    expect(mockedGetExtraction).toHaveBeenCalledWith("doc-1");
    expect(mockedGetDocumentFields).toHaveBeenCalledWith("doc-1");
  });

  // --- Task 2.2: raw extracted text ---

  it("shows the raw extracted text when extraction succeeded", async () => {
    mockedGetDocument.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetExtraction.mockResolvedValue({
      ok: true,
      extraction: makeExtraction({ extracted_text: "the quick brown fox" }),
    });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    expect(await screen.findByText("the quick brown fox")).toBeInTheDocument();
  });

  it("shows an explicit no-text message when extraction failed", async () => {
    mockedGetDocument.mockResolvedValue({
      ok: true,
      document: makeDocument({ extraction_status: "failed" }),
    });
    mockedGetExtraction.mockResolvedValue({
      ok: true,
      extraction: makeExtraction({
        status: "failed",
        extracted_text: null,
        failure_reason: "No text layer was found in the document.",
      }),
    });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    expect(
      await screen.findByText(
        "No extracted text is available: No text layer was found in the document.",
      ),
    ).toBeInTheDocument();
  });

  // --- Task 2.3: fields with confidence/review status ---

  it("shows the fields table with confidence and needs-review indicators", async () => {
    mockedGetDocument.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetExtraction.mockResolvedValue({ ok: true, extraction: makeExtraction() });
    mockedGetDocumentFields.mockResolvedValue({
      ok: true,
      fields: [
        {
          field_name: "confident_field",
          field_value: "yes",
          confidence: 0.9,
          needs_review: false,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          field_name: "unsure_field",
          field_value: "maybe",
          confidence: 0.2,
          needs_review: true,
          created_at: "2026-01-01T00:00:00Z",
        },
      ] satisfies FieldResultOut[],
    });

    renderDetail();

    expect(await screen.findByText("confident_field")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("unsure_field")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("shows an explicit no-fields message when there are none", async () => {
    mockedGetDocument.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetExtraction.mockResolvedValue({ ok: true, extraction: makeExtraction() });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    expect(
      await screen.findByText("No fields were extracted from this document."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // --- Task 2.4: duplicate-of link ---

  it("shows a duplicate-of link when duplicate_of_id is set", async () => {
    mockedGetDocument.mockResolvedValue({
      ok: true,
      document: makeDocument({ duplicate_of_id: "original-doc-id" }),
    });
    mockedGetExtraction.mockResolvedValue({ ok: true, extraction: makeExtraction() });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    const link = await screen.findByRole("link", { name: /document original-doc-id/i });
    expect(link).toHaveAttribute("href", "/documents/original-doc-id");
  });

  it("shows nothing duplicate-related when duplicate_of_id is not set", async () => {
    mockedGetDocument.mockResolvedValue({ ok: true, document: makeDocument({ duplicate_of_id: null }) });
    mockedGetExtraction.mockResolvedValue({ ok: true, extraction: makeExtraction() });
    mockedGetDocumentFields.mockResolvedValue({ ok: true, fields: [] });

    renderDetail();

    await screen.findByText("sample.txt");
    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });
});
