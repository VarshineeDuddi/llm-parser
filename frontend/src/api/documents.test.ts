import { afterEach, describe, expect, it, vi } from "vitest";
import { getDocumentFields } from "./documents";

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
