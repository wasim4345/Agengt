import { describe, expect, it } from "vitest";
import {
  formatINR,
  formatINRCompact,
  groupIndian,
} from "@/lib/format/inr";

describe("groupIndian", () => {
  it("groups with Indian numbering", () => {
    expect(groupIndian("2500000")).toBe("25,00,000");
    expect(groupIndian("100000")).toBe("1,00,000");
    expect(groupIndian("12345678")).toBe("1,23,45,678");
    expect(groupIndian("999")).toBe("999");
  });
});

describe("formatINR", () => {
  it("formats the blueprint example ₹25,00,000", () => {
    expect(formatINR(2_500_000)).toBe("₹25,00,000");
  });

  it("formats other common seed amounts", () => {
    expect(formatINR(40_00_000)).toBe("₹40,00,000");
    expect(formatINR(1_00_000)).toBe("₹1,00,000");
    expect(formatINR(50_000)).toBe("₹50,000");
  });

  it("handles zero and negatives", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-2_500_000)).toBe("-₹25,00,000");
  });
});

describe("formatINRCompact", () => {
  it("formats the blueprint example ₹25.0 L", () => {
    expect(formatINRCompact(2_500_000)).toBe("₹25.0 L");
  });

  it("formats crores as ₹1.2 Cr", () => {
    expect(formatINRCompact(12_000_000)).toBe("₹1.2 Cr");
  });

  it("falls back to full format below one lakh", () => {
    expect(formatINRCompact(50_000)).toBe("₹50,000");
  });
});
