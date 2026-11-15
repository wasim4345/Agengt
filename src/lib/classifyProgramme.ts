import type { ISODate, Programme, ProgrammeStatus } from "@/types/domain";
import { dateInFy, type FinancialYear } from "./fy";

export type ProgrammeClassification =
  | "completed"
  | "upcoming"
  | "ongoing"
  | "other";

/**
 * Mutually exclusive FY classification (Amendment 10 §3.2).
 * Order: Completed → Upcoming → Ongoing → Other.
 */
export function classifyProgramme(
  programme: Pick<
    Programme,
    "status" | "startDate" | "endDate" | "completedAt"
  >,
  fy: FinancialYear,
  today: ISODate,
): ProgrammeClassification {
  const status = programme.status as ProgrammeStatus;

  if (status === "cancelled") return "other";

  const completionDate =
    programme.completedAt ??
    (status === "completed" || status === "closed"
      ? programme.endDate
      : undefined);

  // 1. Completed — status completed/closed AND completion falls in FY
  if (
    (status === "completed" || status === "closed") &&
    completionDate &&
    dateInFy(completionDate, fy)
  ) {
    return "completed";
  }

  const notCommenced = programme.startDate > today;
  const startInFy = dateInFy(programme.startDate, fy);
  const upcomingStatus =
    status === "draft" ||
    status === "pending_approval" ||
    // approved/scheduled not in our union — treat draft/pending as upcoming path
    false;

  // 2. Upcoming — (draft/pending OR start > today) AND start in FY AND not commenced
  if (
    (upcomingStatus || notCommenced) &&
    startInFy &&
    notCommenced
  ) {
    // Exclude programmes already completed in this FY (handled above)
    if (status !== "completed" && status !== "closed") {
      return "upcoming";
    }
  }

  // 3. Ongoing — active/on_hold overlapping FY; OR completed later but overlapped this FY (D-3)
  const startedBy = today < fy.end ? today : fy.end;
  const overlapsWindow =
    programme.startDate <= fy.end && programme.endDate >= fy.start;
  const completedBeforeFy =
    completionDate != null && completionDate < fy.start;
  const completedAfterFyEnd =
    completionDate != null && completionDate > fy.end;

  if (status === "active" || status === "on_hold") {
    const overlaps =
      programme.startDate <= startedBy && programme.endDate >= fy.start;
    if (overlaps && !completedBeforeFy) {
      return "ongoing";
    }
  }

  if (
    (status === "completed" || status === "closed") &&
    overlapsWindow &&
    completedAfterFyEnd &&
    !completedBeforeFy
  ) {
    return "ongoing";
  }

  return "other";
}

export function completionDateFor(
  programme: Pick<Programme, "completedAt" | "endDate" | "status">,
  lastActivityActualEnd?: ISODate,
): ISODate | undefined {
  if (programme.completedAt) return programme.completedAt;
  if (programme.status === "completed" || programme.status === "closed") {
    return lastActivityActualEnd ?? programme.endDate;
  }
  return undefined;
}
