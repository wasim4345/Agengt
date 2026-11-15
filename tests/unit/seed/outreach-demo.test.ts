import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { DEFAULT_DEMO_DATE } from "@/types/domain";
import { activityFinancials } from "@/selectors/finance";
import { IDS } from "@/seed/ids";

describe("Outreach activity demo pack (P5 A01)", () => {
  const state = buildDefaultSeed(DEFAULT_DEMO_DATE);
  const activityId = "act_p5_a01";

  it("keeps financials at ₹5L budget / ₹4.8L verified", () => {
    const fin = activityFinancials(state, activityId);
    expect(fin.revised).toBe(5_00_000);
    expect(fin.verified).toBe(4_80_000);
    expect(fin.pending).toBe(0);
    expect(fin.surplus).toBe(20_000);
  });

  it("ships locations, sessions, stakeholders and detail", () => {
    const activity = state.activities[activityId]!;
    expect(activity.name).toBe("Outreach");
    expect(activity.reportingTemplate).toBe("outreach");
    expect(activity.plannedStart).toBe("2026-04-26");
    expect(activity.plannedEnd).toBe("2026-06-15");
    expect(activity.ownerId).toBe(IDS.users.rohit);

    const detail = state.activityDetails[activityId]!;
    expect(detail.demoIllustrative).toBe(true);
    expect(detail.participation.totalParticipants).toBe(342);
    expect(detail.participation.startupsReached).toBe(126);
    expect(detail.outcomes.applicationsGenerated).toBe(48);
    expect(detail.qualitative.keyAchievements?.length).toBeGreaterThan(0);

    const locations = Object.values(state.activityLocations).filter(
      (l) => l.activityId === activityId,
    );
    expect(locations).toHaveLength(4);
    expect(locations.reduce((s, l) => s + (l.participants ?? 0), 0)).toBe(342);

    const sessions = Object.values(state.activitySessions).filter(
      (s) => s.activityId === activityId,
    );
    expect(sessions).toHaveLength(8);

    const stakeholders = Object.values(state.activityStakeholders).filter(
      (s) => s.activityId === activityId,
    );
    expect(stakeholders.length).toBeGreaterThanOrEqual(3);
  });

  it("uses schema v4 collections", () => {
    expect(state.schemaVersion).toBe(4);
    expect(state.meta.seedVersion).toBe("2.3.0");
  });
});
