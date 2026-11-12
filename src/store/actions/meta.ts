import type { AppState, ID, ISODate, Role } from "@/types/domain";
import { ok, type Result } from "@/types/result";

export function applySetDemoDate(
  draft: AppState,
  demoDate: ISODate,
): Result<ISODate> {
  draft.meta.demoDate = demoDate;
  return ok(demoDate);
}

export function applySetRole(draft: AppState, role: Role): Result<Role> {
  draft.meta.currentRole = role;
  return ok(role);
}

export function applySetUser(draft: AppState, userId: ID): Result<ID> {
  const user = draft.users[userId];
  if (!user) {
    return {
      ok: false,
      errors: [{ code: "USER_MISSING", message: "User not found", field: "userId" }],
    };
  }
  draft.meta.currentUserId = userId;
  draft.meta.currentRole = user.role;
  return ok(userId);
}

export function applySetAllowRuleBreaking(
  draft: AppState,
  allow: boolean,
): Result<boolean> {
  draft.meta.allowRuleBreaking = allow;
  return ok(allow);
}
