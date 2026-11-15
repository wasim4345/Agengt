import type { Role } from "@/types/domain";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** Presenter-only chrome (Data Manager). */
  presenter?: boolean;
};

export const ROLE_HOME: Record<Role, string> = {
  leadership: "/leadership/",
  programme_lead: "/lead/",
  programme_manager: "/manager/",
  marcom: "/marcom/",
};

export const ROLE_LABELS: Record<Role, string> = {
  leadership: "Leadership – CEO & Board",
  programme_lead: "Programme Lead",
  programme_manager: "Programme Manager",
  marcom: "Marketing & Communications",
};

const SETTINGS: NavItem = {
  id: "settings",
  label: "Settings",
  href: "/data/",
  presenter: true,
};

const BY_ROLE: Record<Role, NavItem[]> = {
  leadership: [
    { id: "overview", label: "Overview", href: "/leadership/" },
    { id: "programmes", label: "Programmes", href: "/programmes/" },
    { id: "tracker", label: "Activity Tracker", href: "/timeline/" },
    { id: "financials", label: "Financials", href: "/finance/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    {
      id: "institutional",
      label: "Institutional Intelligence",
      href: "/institutional/",
    },
    { id: "approvals", label: "Approvals", href: "/approvals/" },
    { id: "startups", label: "Startups", href: "/startups/" },
    { id: "log", label: "Activity log", href: "/log/" },
    SETTINGS,
  ],
  programme_lead: [
    { id: "overview", label: "Overview", href: "/lead/" },
    { id: "programmes", label: "Programmes", href: "/programmes/" },
    { id: "tracker", label: "Activity Tracker", href: "/timeline/" },
    { id: "financials", label: "Financials", href: "/finance/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    { id: "approvals", label: "Approvals", href: "/approvals/" },
    { id: "startups", label: "Startups", href: "/startups/" },
    SETTINGS,
  ],
  programme_manager: [
    { id: "overview", label: "Overview", href: "/manager/" },
    { id: "programmes", label: "Programmes", href: "/programmes/" },
    { id: "builder", label: "Programme Builder", href: "/programmes/new/" },
    { id: "templates", label: "Templates", href: "/templates/" },
    { id: "tracker", label: "Activity Tracker", href: "/timeline/" },
    { id: "financials", label: "Financials", href: "/finance/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    { id: "startups", label: "Startups", href: "/startups/" },
    SETTINGS,
  ],
  marcom: [
    { id: "overview", label: "Overview", href: "/marcom/" },
    { id: "events", label: "Events", href: "/marcom/events/" },
    { id: "startups", label: "Startups", href: "/startups/" },
    { id: "media", label: "Reports / Media", href: "/marcom/media/" },
    SETTINGS,
  ],
};

/** Sidebar items for a role (includes presenter Settings / Data Manager). */
export function navForRole(role: Role): NavItem[] {
  return BY_ROLE[role];
}

/** Normalise path for comparisons (trailing slash, no query/hash). */
export function normalisePath(path: string): string {
  const bare = path.split("?")[0]?.split("#")[0] ?? "/";
  if (bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

/**
 * Route permission check used by RoleGate and role-switch redirects.
 * Hidden things must be absent — callers should not render gated content.
 */
export function isPathAllowed(role: Role, path: string): boolean {
  const p = normalisePath(path);

  if (p === "/" || p === ROLE_HOME[role]) return true;

  // Shared presenter tools
  if (p.startsWith("/data/")) return true;

  // Programme workspace — not MarCom
  if (p.startsWith("/programmes/")) {
    return (
      role === "leadership" ||
      role === "programme_lead" ||
      role === "programme_manager"
    );
  }

  // Institutional Intelligence — Leadership only
  if (p.startsWith("/institutional/")) {
    return role === "leadership";
  }

  // Finance screens — Lead, Leadership, Manager (read/request)
  if (p.startsWith("/finance/")) {
    return (
      role === "leadership" ||
      role === "programme_lead" ||
      role === "programme_manager"
    );
  }

  const allowed = new Set(
    navForRole(role).map((item) => normalisePath(item.href)),
  );

  for (const href of allowed) {
    if (p === href || p.startsWith(href)) return true;
  }

  if (Object.values(ROLE_HOME).some((home) => p === normalisePath(home))) {
    return normalisePath(ROLE_HOME[role]) === p;
  }

  return false;
}

export function defaultPersonaId(
  role: Role,
  users: { id: string; role: Role; active: boolean }[],
): string | undefined {
  const preferred: Record<Role, string> = {
    leadership: "usr_meera",
    programme_lead: "usr_sunita",
    programme_manager: "usr_arjun",
    marcom: "usr_priya",
  };
  const preferredId = preferred[role];
  if (users.some((u) => u.id === preferredId && u.active)) return preferredId;
  return users.find((u) => u.role === role && u.active)?.id;
}
