import { describe, expect, it } from "vitest";
import { classifyProgramme } from "@/lib/classifyProgramme";
import { fyContaining, parseFyLabel } from "@/lib/fy";

const fy2627 = parseFyLabel("2026-27")!;
const today = "2026-11-12";

describe("fy helpers", () => {
  it("defaults FY from demo clock", () => {
    expect(fyContaining("2026-11-12").label).toBe("2026-27");
    expect(fyContaining("2026-03-31").label).toBe("2025-26");
    expect(fyContaining("2026-04-01").label).toBe("2026-27");
  });
});

describe("classifyProgramme", () => {
  it("marks active overlapping programme as Ongoing", () => {
    expect(
      classifyProgramme(
        {
          status: "active",
          startDate: "2026-10-01",
          endDate: "2027-06-30",
        },
        fy2627,
        today,
      ),
    ).toBe("ongoing");
  });

  it("marks completed-in-FY as Completed", () => {
    expect(
      classifyProgramme(
        {
          status: "completed",
          startDate: "2025-04-01",
          endDate: "2026-09-30",
          completedAt: "2026-09-30",
        },
        fy2627,
        today,
      ),
    ).toBe("completed");
  });

  it("same completed programme is Ongoing in prior FY (overlapped, completion next FY)", () => {
    const fy2526 = parseFyLabel("2025-26")!;
    expect(
      classifyProgramme(
        {
          status: "completed",
          startDate: "2025-04-01",
          endDate: "2026-09-30",
          completedAt: "2026-09-30",
        },
        fy2526,
        today,
      ),
    ).toBe("ongoing");
  });

  it("upcoming pending programme starting in FY", () => {
    expect(
      classifyProgramme(
        {
          status: "pending_approval",
          startDate: "2027-01-10",
          endDate: "2027-06-30",
        },
        fy2627,
        today,
      ),
    ).toBe("upcoming");
  });

  it("cancelled is Other", () => {
    expect(
      classifyProgramme(
        {
          status: "cancelled",
          startDate: "2026-05-01",
          endDate: "2026-12-01",
        },
        fy2627,
        today,
      ),
    ).toBe("other");
  });

  it("on_hold overlapping is Ongoing", () => {
    expect(
      classifyProgramme(
        {
          status: "on_hold",
          startDate: "2026-04-01",
          endDate: "2027-03-31",
        },
        fy2627,
        today,
      ),
    ).toBe("ongoing");
  });

  it("boundary: completes on 31 Mar belongs to that FY", () => {
    const fy = parseFyLabel("2025-26")!;
    expect(
      classifyProgramme(
        {
          status: "completed",
          startDate: "2025-04-01",
          endDate: "2026-03-31",
          completedAt: "2026-03-31",
        },
        fy,
        "2026-11-12",
      ),
    ).toBe("completed");
  });

  it("boundary: starts 1 Apr is in new FY", () => {
    expect(
      classifyProgramme(
        {
          status: "draft",
          startDate: "2026-04-01",
          endDate: "2026-09-01",
        },
        fy2627,
        "2026-03-15",
      ),
    ).toBe("upcoming");
  });
});
