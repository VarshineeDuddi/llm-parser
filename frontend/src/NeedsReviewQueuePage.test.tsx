import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeedsReviewQueuePage } from "./NeedsReviewQueuePage";
import * as documentsApi from "./api/documents";
import type { FieldResultWithDocumentOut, PaginatedResponse } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getNeedsReviewQueue: vi.fn(),
  };
});

const mockedGetNeedsReviewQueue = documentsApi.getNeedsReviewQueue as ReturnType<typeof vi.fn>;

function makeResult(overrides: Partial<FieldResultWithDocumentOut> = {}): FieldResultWithDocumentOut {
  return {
    field_name: "total",
    field_value: "$42",
    confidence: 0.2,
    needs_review: true,
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
    <MemoryRouter initialEntries={["/needs-review"]}>
      <NeedsReviewQueuePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedGetNeedsReviewQueue.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NeedsReviewQueuePage", () => {
  it("renders flagged fields for a mocked response (task 2.2)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({
      ok: true,
      page: makePage([
        makeResult({ document_id: "doc-1", field_name: "total", field_value: "$42" }),
        makeResult({ document_id: "doc-2", field_name: "vendor", field_value: "Acme" }),
      ]),
    });

    renderPage();

    expect(mockedGetNeedsReviewQueue).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    expect(await screen.findByText("$42")).toBeInTheDocument();
    expect(screen.getByText("vendor")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("shows an explicit message when nothing needs review (task 2.3)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();

    expect(await screen.findByText("Nothing needs review right now.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("wires pagination to fetch the next page with the correct offset (task 2.4)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-1" })], { limit: 10, offset: 0, total: 11 }),
    });

    renderPage();
    await screen.findByText("$42");

    mockedGetNeedsReviewQueue.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-2", field_value: "second-page" })], {
        limit: 10,
        offset: 10,
        total: 11,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockedGetNeedsReviewQueue).toHaveBeenCalledWith({ limit: 10, offset: 10 }),
    );
    expect(await screen.findByText("second-page")).toBeInTheDocument();
  });

  it("links each row to its document detail route (task 2.5)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ document_id: "doc-42" })]),
    });

    renderPage();

    const link = await screen.findByRole("link", { name: "doc-42" });
    expect(link).toHaveAttribute("href", "/documents/doc-42");
  });

  it("renders a formatted flagged date, not the raw timestamp (task 4.3)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({
      ok: true,
      page: makePage([makeResult({ created_at: "2026-01-01T00:00:00Z" })]),
    });

    renderPage();

    await screen.findByText("$42");
    expect(screen.queryByText("2026-01-01T00:00:00Z")).not.toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("shows a loading skeleton before data resolves, then removes it (task 5.1)", async () => {
    let resolveFetch!: (value: unknown) => void;
    mockedGetNeedsReviewQueue.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderPage();

    expect(screen.getByLabelText("Loading needs-review queue")).toBeInTheDocument();

    resolveFetch({ ok: true, page: makePage([]) });

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading needs-review queue")).not.toBeInTheDocument(),
    );
  });

  it("still shows the empty-state message once the loading skeleton is removed (task 5.2)", async () => {
    mockedGetNeedsReviewQueue.mockResolvedValue({ ok: true, page: makePage([]) });

    renderPage();

    await waitFor(() =>
      expect(screen.queryByLabelText("Loading needs-review queue")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Nothing needs review right now.")).toBeInTheDocument();
  });
});
