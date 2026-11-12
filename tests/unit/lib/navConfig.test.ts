import { describe, expect, it } from "vitest";
import {
  isPathAllowed,
  navForRole,
  ROLE_HOME,
  defaultPersonaId,
} from "@/lib/navConfig";
import { buildUsers } from "@/seed/users";

describe("navConfig", () => {
  it("returns role-specific sidebar items including Data Manager", () => {
    const leadership = navForRole("leadership").map((i) => i.href);
    expect(leadership).toContain("/leadership/");
    expect(leadership).toContain("/log/");
    expect(leadership).toContain("/data/");

    const client = navForRole("client").map((i) => i.label);
    expect(client).toEqual([
      "Programme overview",
      "Milestones",
      "Reports",
      "Gallery",
      "Data Manager",
    ]);

    const pm = navForRole("programme_manager").map((i) => i.href);
    expect(pm).toContain("/programmes/new/");
    expect(pm).toContain("/templates/");
  });

  it("maps each role to a home path", () => {
    expect(ROLE_HOME.leadership).toBe("/leadership/");
    expect(ROLE_HOME.client).toBe("/client/");
    expect(ROLE_HOME.finance).toBe("/finance/");
  });

  it("allows nav routes for the owning role and denies foreign homes", () => {
    expect(isPathAllowed("leadership", "/approvals/")).toBe(true);
    expect(isPathAllowed("client", "/approvals/")).toBe(false);
    expect(isPathAllowed("client", "/leadership/")).toBe(false);
    expect(isPathAllowed("client", "/client/gallery/")).toBe(true);
    expect(isPathAllowed("programme_manager", "/programmes/new/")).toBe(true);
    expect(isPathAllowed("marcom", "/finance/queue/")).toBe(false);
    expect(isPathAllowed("finance", "/data/")).toBe(true);
  });

  it("picks the documented default persona per role", () => {
    const users = Object.values(buildUsers());
    expect(defaultPersonaId("leadership", users)).toBe("usr_meera");
    expect(defaultPersonaId("programme_manager", users)).toBe("usr_arjun");
    expect(defaultPersonaId("client", users)).toBe("usr_rahul");
    expect(defaultPersonaId("marcom", users)).toBe("usr_priya");
    expect(defaultPersonaId("finance", users)).toBe("usr_sunita");
  });
});
