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
  programme_manager: "/manager/",
  client: "/client/",
  marcom: "/marcom/",
  finance: "/finance/",
};

export const ROLE_LABELS: Record<Role, string> = {
  leadership: "Leadership",
  programme_manager: "Programme Manager",
  client: "Client",
  marcom: "MarCom",
  finance: "Finance",
};

const DATA_MANAGER: NavItem = {
  id: "data",
  label: "Data Manager",
  href: "/data/",
  presenter: true,
};

const BY_ROLE: Record<Role, NavItem[]> = {
  leadership: [
    { id: "dash", label: "Dashboard", href: "/leadership/" },
    { id: "programmes", label: "Programmes", href: "/programmes/" },
    { id: "timeline", label: "Timeline", href: "/timeline/" },
    { id: "approvals", label: "Approvals", href: "/approvals/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    { id: "log", label: "Activity log", href: "/log/" },
    DATA_MANAGER,
  ],
  programme_manager: [
    { id: "dash", label: "My dashboard", href: "/manager/" },
    { id: "programmes", label: "My programmes", href: "/programmes/" },
    { id: "timeline", label: "Timeline", href: "/timeline/" },
    { id: "new", label: "New programme", href: "/programmes/new/" },
    { id: "templates", label: "Templates", href: "/templates/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    DATA_MANAGER,
  ],
  client: [
    { id: "overview", label: "Programme overview", href: "/client/" },
    { id: "milestones", label: "Milestones", href: "/client/milestones/" },
    { id: "reports", label: "Reports", href: "/client/reports/" },
    { id: "gallery", label: "Gallery", href: "/client/gallery/" },
    DATA_MANAGER,
  ],
  marcom: [
    { id: "dash", label: "Dashboard", href: "/marcom/" },
    { id: "events", label: "Events", href: "/marcom/events/" },
    { id: "startups", label: "Startups", href: "/startups/" },
    { id: "media", label: "Media library", href: "/marcom/media/" },
    DATA_MANAGER,
  ],
  finance: [
    { id: "dash", label: "Dashboard", href: "/finance/" },
    { id: "queue", label: "Approval queue", href: "/finance/queue/" },
    { id: "budgets", label: "Budgets", href: "/finance/budgets/" },
    { id: "reports", label: "Reports", href: "/reports/" },
    DATA_MANAGER,
  ],
};

/** Sidebar items for a role (includes presenter Data Manager). */
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

  // Programme detail (not client — client uses /client screens)
  if (p.startsWith("/programmes/")) {
    return (
      role === "leadership" ||
      role === "programme_manager" ||
      role === "finance"
    );
  }

  const allowed = new Set(
    navForRole(role).map((item) => normalisePath(item.href)),
  );

  // Prefix match for nested routes under an allowed nav href
  for (const href of allowed) {
    if (p === href || p.startsWith(href)) return true;
  }

  // Role homes explicitly
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
    programme_manager: "usr_arjun",
    client: "usr_rahul",
    marcom: "usr_priya",
    finance: "usr_sunita",
  };
  const preferredId = preferred[role];
  if (users.some((u) => u.id === preferredId && u.active)) return preferredId;
  return users.find((u) => u.role === role && u.active)?.id;
}
