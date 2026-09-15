import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadPage } from "./UploadPage";
import * as documentsApi from "./api/documents";
import type { DocumentOut } from "./api/documents";

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    uploadDocument: vi.fn(),
    getDocumentFields: vi.fn(),
  };
});

const mockedUpload = documentsApi.uploadDocument as ReturnType<typeof vi.fn>;
const mockedGetFields = documentsApi.getDocumentFields as ReturnType<typeof vi.fn>;

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

async function chooseAndUpload() {
  const file = new File(["hello"], "sample.txt", { type: "text/plain" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input, file);
  await userEvent.click(screen.getByRole("button", { name: /upload/i }));
}

function renderUploadPage(onUnauthorized: () => void = vi.fn()) {
  return render(<UploadPage onUnauthorized={onUnauthorized} />);
}

beforeEach(() => {
  mockedUpload.mockReset();
  mockedGetFields.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadPage fields display", () => {
  it("renders fields after a successful upload and fetch (task 2.1)", async () => {
    mockedUpload.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetFields.mockResolvedValue({
      ok: true,
      fields: [
        {
          field_name: "total",
          field_value: "$42",
          confidence: 0.9,
          needs_review: false,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    renderUploadPage();
    await chooseAndUpload();

    expect(await screen.findByText("total")).toBeInTheDocument();
    expect(screen.getByText("$42")).toBeInTheDocument();
  });

  it("visually distinguishes a needs_review row from a confirmed one (task 2.2)", async () => {
    mockedUpload.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetFields.mockResolvedValue({
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
      ],
    });

    renderUploadPage();
    await chooseAndUpload();

    expect(await screen.findByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows an explicit message (not an empty table) when extraction succeeded with zero fields (task 2.3)", async () => {
    mockedUpload.mockResolvedValue({
      ok: true,
      document: makeDocument({ extraction_status: "succeeded" }),
    });
    mockedGetFields.mockResolvedValue({ ok: true, fields: [] });

    renderUploadPage();
    await chooseAndUpload();

    expect(
      await screen.findByText("No fields were extracted from this document."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a failure-specific message when text extraction itself failed (task 2.3)", async () => {
    mockedUpload.mockResolvedValue({
      ok: true,
      document: makeDocument({
        extraction_status: "failed",
        extraction_failure_reason: "No text layer was found in the document.",
      }),
    });
    mockedGetFields.mockResolvedValue({ ok: true, fields: [] });

    renderUploadPage();
    await chooseAndUpload();

    expect(
      await screen.findByText("No fields are available because text extraction failed."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the Export button when fields exist, and hides it in the no-fields state (task 3.2)", async () => {
    mockedUpload.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetFields.mockResolvedValue({
      ok: true,
      fields: [
        {
          field_name: "total",
          field_value: "$42",
          confidence: 0.9,
          needs_review: false,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    renderUploadPage();
    await chooseAndUpload();

    expect(await screen.findByRole("button", { name: /export as csv/i })).toBeInTheDocument();
  });

  it("hides the Export button when there are no fields to export (task 3.2)", async () => {
    mockedUpload.mockResolvedValue({ ok: true, document: makeDocument() });
    mockedGetFields.mockResolvedValue({ ok: true, fields: [] });

    renderUploadPage();
    await chooseAndUpload();

    await screen.findByText("No fields were extracted from this document.");
    expect(screen.queryByRole("button", { name: /export as csv/i })).not.toBeInTheDocument();
  });

  it("calls onUnauthorized on a 401 response instead of failing silently (task 6.3)", async () => {
    mockedUpload.mockResolvedValue({
      ok: false,
      detail: "Missing or invalid API key.",
      unauthorized: true,
    });
    const onUnauthorized = vi.fn();

    renderUploadPage(onUnauthorized);
    await chooseAndUpload();

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
    expect(mockedGetFields).not.toHaveBeenCalled();
  });

  // --- Task 1.1: drag-and-drop ---

  it("selects a file dropped onto the upload area", () => {
    renderUploadPage();

    const file = new File(["hello"], "dropped.txt", { type: "text/plain" });
    const dropZone = screen.getByText("Choose file or drag it here");

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText("dropped.txt")).toBeInTheDocument();
  });

  // --- Task 2.1: progress indicator ---

  it("shows a progress indicator while submitting and hides it once resolved", async () => {
    let resolveUpload!: (value: unknown) => void;
    mockedUpload.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    renderUploadPage();
    await chooseAndUpload();

    expect(await screen.findByRole("progressbar")).toBeInTheDocument();

    mockedGetFields.mockResolvedValue({ ok: true, fields: [] });
    resolveUpload({ ok: true, document: makeDocument() });

    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });

  // --- Task 3.1: ordered result feed ---

  it("renders an ordered result feed for a successful response", async () => {
    mockedUpload.mockResolvedValue({
      ok: true,
      document: makeDocument({ duplicate_of_id: "original-doc-id" }),
    });
    mockedGetFields.mockResolvedValue({
      ok: true,
      fields: [
        {
          field_name: "a",
          field_value: "1",
          confidence: 0.9,
          needs_review: false,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          field_name: "b",
          field_value: "2",
          confidence: 0.2,
          needs_review: true,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    renderUploadPage();
    await chooseAndUpload();

    const feed = await screen.findByRole("list", { name: /upload result feed/i });
    const items = within(feed)
      .getAllByRole("listitem")
      .map((item) => item.textContent);

    expect(items[0]).toMatch(/uploaded successfully/i);
    expect(items[1]).toMatch(/text extraction succeeded/i);
    expect(items[2]).toMatch(/duplicate of document original-doc-id/i);
    expect(items[3]).toMatch(/2 fields extracted, 1 needing review/i);
  });

  // --- Task 3.2: failure cases render as a clear, ordered explanation ---

  it("shows an explanation instead of a bare error when upload is rejected", async () => {
    mockedUpload.mockResolvedValue({
      ok: false,
      detail: "The uploaded file is empty.",
      unauthorized: false,
    });

    renderUploadPage();
    await chooseAndUpload();

    expect(await screen.findByText("The uploaded file is empty.")).toBeInTheDocument();
  });

  it("shows extraction failure as an ordered feed step, not a bare error", async () => {
    mockedUpload.mockResolvedValue({
      ok: true,
      document: makeDocument({
        extraction_status: "failed",
        extraction_failure_reason: "No text layer was found in the document.",
      }),
    });
    mockedGetFields.mockResolvedValue({ ok: true, fields: [] });

    renderUploadPage();
    await chooseAndUpload();

    const feed = await screen.findByRole("list", { name: /upload result feed/i });
    const items = within(feed)
      .getAllByRole("listitem")
      .map((item) => item.textContent);

    expect(items[0]).toMatch(/uploaded successfully/i);
    expect(items[1]).toMatch(/text extraction failed: no text layer was found in the document\./i);
    expect(items[2]).toMatch(/no fields are available because text extraction failed/i);
  });
});
