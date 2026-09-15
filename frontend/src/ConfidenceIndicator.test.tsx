import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

describe("ConfidenceIndicator (task 3.4)", () => {
  it("renders 0% for zero confidence", () => {
    render(<ConfidenceIndicator confidence={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("renders a mid-range percentage", () => {
    render(<ConfidenceIndicator confidence={0.42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders 100% for full confidence", () => {
    render(<ConfidenceIndicator confidence={1} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
