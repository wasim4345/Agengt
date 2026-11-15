import { describe, expect, it } from "vitest";
import {
  isPathAllowed,
  navForRole,
  ROLE_HOME,
  defaultPersonaId,
} from "@/lib/navConfig";
import { buildUsers } from "@/seed/users";

describe("navConfig", () => {
  it("returns role-specific sidebar items including Settings", () => {
    const leadership = navForRole("leadership").map((i) => i.href);
    expect(leadership).toContain("/leadership/");
    expect(leadership).toContain("/institutional/");
    expect(leadership).toContain("/log/");
    expect(leadership).toContain("/data/");

    const lead = navForRole("programme_lead").map((i) => i.href);
    expect(lead).toContain("/lead/");
    expect(lead).toContain("/finance/");
    expect(lead).not.toContain("/institutional/");

    const pm = navForRole("programme_manager").map((i) => i.href);
    expect(pm).toContain("/programmes/new/");
    expect(pm).toContain("/templates/");
  });

  it("maps each role to a home path", () => {
    expect(ROLE_HOME.leadership).toBe("/leadership/");
    expect(ROLE_HOME.programme_lead).toBe("/lead/");
    expect(ROLE_HOME.programme_manager).toBe("/manager/");
    expect(ROLE_HOME.marcom).toBe("/marcom/");
  });

  it("allows nav routes for the owning role and denies foreign homes", () => {
    expect(isPathAllowed("leadership", "/approvals/")).toBe(true);
    expect(isPathAllowed("leadership", "/institutional/")).toBe(true);
    expect(isPathAllowed("programme_lead", "/institutional/")).toBe(false);
    expect(isPathAllowed("marcom", "/leadership/")).toBe(false);
    expect(isPathAllowed("marcom", "/programmes/view/")).toBe(false);
    expect(isPathAllowed("programme_manager", "/programmes/new/")).toBe(true);
    expect(isPathAllowed("marcom", "/finance/queue/")).toBe(false);
    expect(isPathAllowed("programme_lead", "/data/")).toBe(true);
  });

  it("picks the documented default persona per role", () => {
    const users = Object.values(buildUsers());
    expect(defaultPersonaId("leadership", users)).toBe("usr_meera");
    expect(defaultPersonaId("programme_manager", users)).toBe("usr_arjun");
    expect(defaultPersonaId("programme_lead", users)).toBe("usr_sunita");
    expect(defaultPersonaId("marcom", users)).toBe("usr_priya");
  });
});
