import type { AppState, ID } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";

/** Leadership canApprove default true; false hides approve/release. */
export function currentUserCanApprove(state: AppState): boolean {
  if (state.meta.currentRole !== "leadership") return true;
  const user = state.users[state.meta.currentUserId];
  if (!user) return false;
  return user.canApprove !== false;
}

/**
 * Self-approval rule (doc 08 §5b): same Leadership persona cannot approve
 * a request they raised; the other Leadership persona can.
 */
export function canSelfApprove(
  state: AppState,
  requestedBy: ID,
): Result<true> {
  if (state.meta.allowRuleBreaking) return ok(true);
  if (state.meta.currentRole !== "leadership") return ok(true);
  if (requestedBy === state.meta.currentUserId) {
    return err({
      code: "APR_SELF",
      message:
        "You raised this request. Switch to the other Leadership persona to approve.",
    });
  }
  if (!currentUserCanApprove(state)) {
    return err({
      code: "APR_VIEW_ONLY",
      message: "This Leadership persona is view-only (canApprove is off).",
    });
  }
  return ok(true);
}
