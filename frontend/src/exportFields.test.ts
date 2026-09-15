import { describe, expect, it } from "vitest";
import { fieldsToCsv } from "./exportFields";
import type { FieldResultOut } from "./api/documents";

describe("fieldsToCsv", () => {
  it("produces a header row and one row per field", () => {
    const fields: FieldResultOut[] = [
      {
        field_name: "total",
        field_value: "$42",
        confidence: 0.9,
        needs_review: false,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        field_name: "status",
        field_value: "unclear",
        confidence: 0.2,
        needs_review: true,
        created_at: "2026-01-01T00:00:01Z",
      },
    ];

    const csv = fieldsToCsv(fields);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("field_name,field_value,confidence,needs_review");
    expect(lines[1]).toBe("total,$42,0.9,false");
    expect(lines[2]).toBe("status,unclear,0.2,true");
  });

  it("escapes a value containing a comma or a quote", () => {
    const fields: FieldResultOut[] = [
      {
        field_name: "vendor",
        field_value: 'Acme, "Best" Supplies',
        confidence: 0.8,
        needs_review: false,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const csv = fieldsToCsv(fields);
    const [, row] = csv.split("\n");

    expect(row).toBe('vendor,"Acme, ""Best"" Supplies",0.8,false');
  });
});
