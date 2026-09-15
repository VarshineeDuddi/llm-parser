import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoredApiKey, setStoredApiKey } from "../apiKey";
import {
  getDocument,
  getDocumentFields,
  getDocuments,
  getExtraction,
  registerUser,
  uploadDocument,
} from "./documents";

describe("getDocumentFields", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful response into typed field records", async () => {
    const body = [
      {
        field_name: "total",
        field_value: "$42",
        confidence: 0.9,
        needs_review: false,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => body,
      }),
    );

    const result = await getDocumentFields("doc-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields).toEqual(body);
    }
  });

  it("returns an error detail on a failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Document not found." }),
      }),
    );

    const result = await getDocumentFields("missing-doc");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toBe("Document not found.");
    }
  });
});

describe("registerUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the issued user, including the raw api key, on success", async () => {
    const body = { id: "user-1", name: "Alice", api_key: "raw-key-abc" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
    );

    const result = await registerUser("Alice");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual(body);
    }
  });
});

describe("uploadDocument", () => {
  beforeEach(() => {
    clearStoredApiKey();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearStoredApiKey();
  });

  function makeDocumentResponse() {
    return {
      ok: true,
      json: async () => ({
        id: "doc-1",
        status: "received",
        original_filename: "a.txt",
        format: "txt",
        size_bytes: 5,
        created_at: "2026-01-01T00:00:00Z",
        extraction_status: "succeeded",
        extraction_failure_reason: null,
        duplicate_of_id: null,
      }),
    };
  }

  it("attaches the stored API key via the Authorization header (task 6.2)", async () => {
    setStoredApiKey("stored-key-123");
    const fetchMock = vi.fn().mockResolvedValue(makeDocumentResponse());
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    await uploadDocument(file);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toEqual({ Authorization: "Bearer stored-key-123" });
  });

  it("sends no Authorization header when no key is stored", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeDocumentResponse());
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    await uploadDocument(file);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toEqual({});
  });

  it("marks a 401 response as unauthorized rather than a generic failure (task 6.3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Missing or invalid API key." }),
      }),
    );

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const result = await uploadDocument(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.unauthorized).toBe(true);
    }
  });
});

describe("getDocument", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful response into a typed document record (task 1.1)", async () => {
    const body = {
      id: "doc-1",
      status: "received",
      original_filename: "a.txt",
      format: "txt",
      size_bytes: 5,
      created_at: "2026-01-01T00:00:00Z",
      extraction_status: "succeeded",
      extraction_failure_reason: null,
      duplicate_of_id: null,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));

    const result = await getDocument("doc-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document).toEqual(body);
    }
  });

  it("returns an error detail on a failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: "Document not found." }) }),
    );

    const result = await getDocument("missing-doc");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toBe("Document not found.");
    }
  });
});

describe("getExtraction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful response into a typed extraction record (task 1.1)", async () => {
    const body = {
      document_id: "doc-1",
      status: "succeeded",
      extracted_text: "hello world",
      failure_reason: null,
      extracted_at: "2026-01-01T00:00:00Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));

    const result = await getExtraction("doc-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.extraction).toEqual(body);
    }
  });

  it("returns an error detail on a failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "No extraction found for this document." }),
      }),
    );

    const result = await getExtraction("missing-doc");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toBe("No extraction found for this document.");
    }
  });
});

describe("getDocuments", () => {
  beforeEach(() => {
    setStoredApiKey("stored-key-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearStoredApiKey();
  });

  it("attaches the stored API key and parses a paginated response (task 3.1)", async () => {
    const page = {
      items: [
        {
          id: "doc-1",
          status: "received",
          original_filename: "a.txt",
          format: "txt",
          size_bytes: 5,
          created_at: "2026-01-01T00:00:00Z",
          extraction_status: "succeeded",
          extraction_failure_reason: null,
          duplicate_of_id: null,
        },
      ],
      limit: 10,
      offset: 0,
      total: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => page });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getDocuments(10, 0);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page).toEqual(page);
    }
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toEqual({ Authorization: "Bearer stored-key-123" });
  });

  it("returns an error detail on a failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Missing or invalid API key." }),
      }),
    );

    const result = await getDocuments(10, 0);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toBe("Missing or invalid API key.");
    }
  });
});
