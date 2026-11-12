import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format/dates";

describe("formatDate", () => {
  it("formats as dd MMM yyyy", () => {
    expect(formatDate("2026-11-12")).toBe("12 Nov 2026");
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
  });

  it("returns em dash for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});
