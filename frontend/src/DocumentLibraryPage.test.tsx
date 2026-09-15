import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentLibraryPage } from "./DocumentLibraryPage";
import * as documentsApi from "./api/documents";
import type { DocumentOut, PaginatedResponse } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getDocuments: vi.fn(),
  };
});

const mockedGetDocuments = documentsApi.getDocuments as ReturnType<typeof vi.fn>;

function makeDocument(overrides: Partial<DocumentOut> = {}): DocumentOut {
  return {
    id: "doc-1",
    status: "received",
    original_filename: "sample.txt",
    format: "txt",
    size_bytes: 1234,
    created_at: "2026-01-01T00:00:00Z",
    extraction_status: "succeeded",
    extraction_failure_reason: null,
    duplicate_of_id: null,
    ...overrides,
  };
}

function makePage(
  items: DocumentOut[],
  overrides: Partial<PaginatedResponse<DocumentOut>> = {},
): PaginatedResponse<DocumentOut> {
  return { items, limit: 10, offset: 0, total: items.length, ...overrides };
}

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <DocumentLibraryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedGetDocuments.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentLibraryPage", () => {
  it("renders fetched documents with the expected columns (task 3.2)", async () => {
    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: makePage([
        makeDocument({
          id: "doc-1",
          original_filename: "invoice.pdf",
          format: "pdf",
          size_bytes: 2048,
          status: "received",
          extraction_status: "succeeded",
          duplicate_of_id: null,
        }),
      ]),
    });

    renderLibrary();

    expect(await screen.findByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText("pdf")).toBeInTheDocument();
    expect(screen.getByText("2048")).toBeInTheDocument();
    expect(screen.getByText("received")).toBeInTheDocument();
    expect(screen.getByText("succeeded")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("shows an explicit message when no documents have been uploaded", async () => {
    mockedGetDocuments.mockResolvedValue({ ok: true, page: makePage([]) });

    renderLibrary();

    expect(
      await screen.findByText("No documents have been uploaded yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("wires Next to fetch the next page with the correct offset (task 3.3)", async () => {
    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument()], { limit: 10, offset: 0, total: 11 }),
    });

    renderLibrary();
    await screen.findByText("sample.txt");

    expect(mockedGetDocuments).toHaveBeenCalledWith(10, 0);

    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument({ original_filename: "second-page.txt" })], {
        limit: 10,
        offset: 10,
        total: 11,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(mockedGetDocuments).toHaveBeenCalledWith(10, 10));
    expect(await screen.findByText("second-page.txt")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next when there is no further page", async () => {
    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument()], { limit: 10, offset: 0, total: 1 }),
    });

    renderLibrary();
    await screen.findByText("sample.txt");

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("links each row to /documents/{id} (task 3.4)", async () => {
    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument({ id: "doc-42", original_filename: "report.docx" })]),
    });

    renderLibrary();

    const link = await screen.findByRole("link", { name: "report.docx" });
    expect(link).toHaveAttribute("href", "/documents/doc-42");
  });
});
