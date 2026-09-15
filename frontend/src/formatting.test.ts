import { describe, expect, it } from "vitest";
import { formatDate, formatFileSize, formatStatusLabel, statusChipColor } from "./formatting";

describe("formatFileSize (task 3.1)", () => {
  it("formats a byte count under 1 KB as bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats a byte count in the KB range", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats a byte count in the MB range", () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("formatDate (task 3.2)", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  it("formats a recent timestamp as relative", () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 3_600_000).toISOString();
    expect(formatDate(twoHoursAgo, now)).toBe("2 hours ago");
  });

  it("formats an older timestamp as a short absolute date", () => {
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    expect(formatDate(twoWeeksAgo, now)).not.toMatch(/ago/);
  });
});

describe("statusChipColor and formatStatusLabel (task 3.3)", () => {
  it("maps each known status to an expected color", () => {
    expect(statusChipColor("received")).toBe("info");
    expect(statusChipColor("duplicate")).toBe("warning");
    expect(statusChipColor("succeeded")).toBe("success");
    expect(statusChipColor("failed")).toBe("error");
  });

  it("falls back to default for an unknown status", () => {
    expect(statusChipColor("something_else")).toBe("default");
  });

  it("capitalizes the status label", () => {
    expect(formatStatusLabel("received")).toBe("Received");
    expect(formatStatusLabel("failed")).toBe("Failed");
  });
});
