import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as apiKeyModule from "./apiKey";
import * as documentsApi from "./api/documents";

vi.mock("./apiKey", async () => {
  const actual = await vi.importActual<typeof import("./apiKey")>("./apiKey");
  return {
    ...actual,
    getStoredApiKey: vi.fn(),
  };
});

vi.mock("./api/documents", async () => {
  const actual = await vi.importActual<typeof import("./api/documents")>("./api/documents");
  return {
    ...actual,
    getDocuments: vi.fn(),
  };
});

const mockedGetStoredApiKey = apiKeyModule.getStoredApiKey as ReturnType<typeof vi.fn>;
const mockedGetDocuments = documentsApi.getDocuments as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedGetStoredApiKey.mockReset();
  mockedGetDocuments.mockReset();
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App routing", () => {
  it("renders the document library at / with the upload page reachable from it (task 2.2)", async () => {
    mockedGetStoredApiKey.mockReturnValue("stored-key");
    mockedGetDocuments.mockResolvedValue({
      ok: true,
      page: { items: [], limit: 10, offset: 0, total: 0 },
    });

    render(<App />);

    expect(await screen.findByText("Document Library")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Upload" }));

    expect(await screen.findByText("Upload a document")).toBeInTheDocument();
    // Task 2.2: the shared nav persists on a page that had none of its own before.
    expect(screen.getByRole("link", { name: "Needs Review" })).toBeInTheDocument();
  });

  it("shows the registration form when no key is stored, regardless of route", () => {
    mockedGetStoredApiKey.mockReturnValue(null);

    render(<App />);

    expect(screen.getByText("Register to get started")).toBeInTheDocument();
    expect(mockedGetDocuments).not.toHaveBeenCalled();
  });
});
