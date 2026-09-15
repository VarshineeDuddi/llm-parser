import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentTypeBrowserPage } from "./DocumentTypeBrowserPage";
import * as documentsApi from "./api/documents";
import type { DocumentOut, PaginatedResponse } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getDocumentsByType: vi.fn(),
  };
});

const mockedGetDocumentsByType = documentsApi.getDocumentsByType as ReturnType<typeof vi.fn>;

function makeDocument(overrides: Partial<DocumentOut> = {}): DocumentOut {
  return {
    id: "doc-1",
    status: "received",
    original_filename: "invoice-1.txt",
    format: "txt",
    size_bytes: 100,
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/document-types"]}>
      <DocumentTypeBrowserPage />
    </MemoryRouter>,
  );
}

async function search(type: string) {
  await userEvent.type(screen.getByLabelText(/document type/i), type);
  await userEvent.click(screen.getByRole("button", { name: /search/i }));
}

beforeEach(() => {
  mockedGetDocumentsByType.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentTypeBrowserPage", () => {
  it("renders matching documents for a mocked filter (task 2.1)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({
      ok: true,
      page: makePage([
        makeDocument({ id: "doc-1", original_filename: "invoice-1.txt" }),
        makeDocument({ id: "doc-2", original_filename: "invoice-2.txt" }),
      ]),
    });

    renderPage();
    await search("invoice");

    expect(mockedGetDocumentsByType).toHaveBeenCalledWith("invoice", { limit: 10, offset: 0 });
    expect(await screen.findByText("invoice-1.txt")).toBeInTheDocument();
    expect(screen.getByText("invoice-2.txt")).toBeInTheDocument();
  });

  it("shows an explicit no-results message for an unused type (task 2.2)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();
    await search("unused_type");

    expect(
      await screen.findByText("No documents were found with this type."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("wires pagination to fetch the next page with the correct offset (task 2.3)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument({ id: "doc-1" })], { limit: 10, offset: 0, total: 11 }),
    });

    renderPage();
    await search("invoice");
    await screen.findByText("invoice-1.txt");

    mockedGetDocumentsByType.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument({ id: "doc-2", original_filename: "second-page.txt" })], {
        limit: 10,
        offset: 10,
        total: 11,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockedGetDocumentsByType).toHaveBeenCalledWith("invoice", { limit: 10, offset: 10 }),
    );
    expect(await screen.findByText("second-page.txt")).toBeInTheDocument();
  });

  it("links each row to its document detail route (task 2.4)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({
      ok: true,
      page: makePage([makeDocument({ id: "doc-42", original_filename: "report.docx" })]),
    });

    renderPage();
    await search("report");

    const link = await screen.findByRole("link", { name: "report.docx" });
    expect(link).toHaveAttribute("href", "/documents/doc-42");
  });

  it("renders formatted file size and status chips, not raw values (task 4.1)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({
      ok: true,
      page: makePage([
        makeDocument({ size_bytes: 2048, status: "received", extraction_status: "succeeded" }),
      ]),
    });

    renderPage();
    await search("invoice");

    expect(await screen.findByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("Succeeded")).toBeInTheDocument();
  });

  it("shows a loading skeleton while a search is in flight, then removes it (task 5.1)", async () => {
    let resolveFetch!: (value: unknown) => void;
    mockedGetDocumentsByType.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderPage();
    await search("invoice");

    expect(screen.getByLabelText("Loading document type results")).toBeInTheDocument();

    resolveFetch({ ok: true, page: makePage([]) });

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading document type results")).not.toBeInTheDocument(),
    );
  });

  it("still shows the empty-state message once the loading skeleton is removed (task 5.2)", async () => {
    mockedGetDocumentsByType.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();
    await search("unused_type");

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading document type results")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("No documents were found with this type.")).toBeInTheDocument();
  });
});
