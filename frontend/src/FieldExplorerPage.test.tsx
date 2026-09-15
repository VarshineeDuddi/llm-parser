import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldExplorerPage } from "./FieldExplorerPage";
import * as documentsApi from "./api/documents";
import type { FieldResultWithDocumentOut, PaginatedResponse } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getFieldOccurrences: vi.fn(),
  };
});

const mockedGetFieldOccurrences = documentsApi.getFieldOccurrences as ReturnType<typeof vi.fn>;

function makeResult(overrides: Partial<FieldResultWithDocumentOut> = {}): FieldResultWithDocumentOut {
  return {
    field_name: "total",
    field_value: "$42",
    confidence: 0.9,
    needs_review: false,
    created_at: "2026-01-01T00:00:00Z",
    document_id: "doc-1",
    ...overrides,
  };
}

function makePage(
  items: FieldResultWithDocumentOut[],
  overrides: Partial<PaginatedResponse<FieldResultWithDocumentOut>> = {},
): PaginatedResponse<FieldResultWithDocumentOut> {
  return { items, limit: 10, offset: 0, total: items.length, ...overrides };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/fields"]}>
      <FieldExplorerPage />
    </MemoryRouter>,
  );
}

async function search(fieldName: string) {
  await userEvent.type(screen.getByLabelText(/field name/i), fieldName);
  await userEvent.click(screen.getByRole("button", { name: /search/i }));
}

beforeEach(() => {
  mockedGetFieldOccurrences.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FieldExplorerPage", () => {
  it("renders matching documents and values for a mocked search (task 2.1)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([
        makeResult({ document_id: "doc-1", field_value: "$42" }),
        makeResult({ document_id: "doc-2", field_value: "$99" }),
      ]),
    });

    renderPage();
    await search("total");

    expect(mockedGetFieldOccurrences).toHaveBeenCalledWith("total", { limit: 10, offset: 0 });
    expect(await screen.findByText("$42")).toBeInTheDocument();
    expect(screen.getByText("$99")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "doc-1" })).toHaveAttribute("href", "/documents/doc-1");
  });

  it("shows an explicit no-results message for zero matches (task 2.2)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();
    await search("unused_field");

    expect(
      await screen.findByText("No documents were found with this field."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("wires pagination to fetch the next page with the correct offset (task 2.3)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-1" })], { limit: 10, offset: 0, total: 11 }),
    });

    renderPage();
    await search("total");
    await screen.findByText("$42");

    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-2", field_value: "second-page" })], {
        limit: 10,
        offset: 10,
        total: 11,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockedGetFieldOccurrences).toHaveBeenCalledWith("total", { limit: 10, offset: 10 }),
    );
    expect(await screen.findByText("second-page")).toBeInTheDocument();
  });

  it("reorders displayed rows when a sort option is selected (task 2.4)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([
        makeResult({ document_id: "doc-b", field_value: "b-value", confidence: 0.9 }),
        makeResult({ document_id: "doc-a", field_value: "a-value", confidence: 0.2 }),
      ]),
    });

    renderPage();
    await search("total");
    await screen.findByText("b-value");

    const rowsInDom = () => screen.getAllByRole("row").slice(1).map((row) => row.textContent ?? "");

    // Unsorted: fetch order (b-value first).
    expect(rowsInDom()[0]).toContain("b-value");

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Value" }));

    await waitFor(() => expect(rowsInDom()[0]).toContain("a-value"));
  });

  it("links each row's document identifier to its detail route (task 2.5)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-42" })]),
    });

    renderPage();
    await search("total");

    const link = await screen.findByRole("link", { name: "doc-42" });
    expect(link).toHaveAttribute("href", "/documents/doc-42");
  });

  it("shows a confidence indicator alongside the needs-review chip per result (task 4.2)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ confidence: 0.9, needs_review: false })]),
    });

    renderPage();
    await search("total");

    const row = (await screen.findByText("$42")).closest("tr")!;
    expect(within(row).getByText("90%")).toBeInTheDocument();
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows a loading skeleton while a search is in flight, then removes it (task 5.1)", async () => {
    let resolveFetch!: (value: unknown) => void;
    mockedGetFieldOccurrences.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderPage();
    await search("total");

    expect(screen.getByLabelText("Loading field explorer results")).toBeInTheDocument();

    resolveFetch({ ok: true, page: makePage([]) });

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading field explorer results")).not.toBeInTheDocument(),
    );
  });

  it("still shows the no-results message once the loading skeleton is removed (task 5.2)", async () => {
    mockedGetFieldOccurrences.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();
    await search("unused_field");

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading field explorer results")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("No documents were found with this field.")).toBeInTheDocument();
  });
});
