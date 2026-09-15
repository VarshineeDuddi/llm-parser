import type { FieldResultOut } from "./api/documents";

const CSV_HEADER = ["field_name", "field_value", "confidence", "needs_review"];

function escapeCsvValue(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function fieldsToCsv(fields: FieldResultOut[]): string {
  const rows = fields.map((field) =>
    [
      escapeCsvValue(field.field_name),
      escapeCsvValue(field.field_value),
      String(field.confidence),
      String(field.needs_review),
    ].join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\n");
}

export function downloadFieldsAsCsv(fields: FieldResultOut[], filename: string): void {
  const csv = fieldsToCsv(fields);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
