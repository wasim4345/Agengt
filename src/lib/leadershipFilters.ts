import type { ProgrammeStatus } from "@/types/domain";
import type { LeadershipFilters } from "@/selectors/leadership";

const STATUS: ProgrammeStatus[] = [
  "draft",
  "pending_approval",
  "active",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
];

export function filtersFromSearchParams(
  params: URLSearchParams,
): LeadershipFilters {
  const status = params.get("status");
  return {
    categoryId: params.get("category") || undefined,
    clientId: params.get("client") || undefined,
    managerId: params.get("manager") || undefined,
    officeId: params.get("office") || undefined,
    sponsorType: params.get("sponsorType") || undefined,
    status:
      status && (STATUS as string[]).includes(status)
        ? (status as ProgrammeStatus)
        : undefined,
    dateFrom: params.get("from") || undefined,
    dateTo: params.get("to") || undefined,
  };
}

export function searchParamsFromFilters(
  filters: LeadershipFilters,
): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.categoryId) p.set("category", filters.categoryId);
  if (filters.clientId) p.set("client", filters.clientId);
  if (filters.managerId) p.set("manager", filters.managerId);
  if (filters.officeId) p.set("office", filters.officeId);
  if (filters.sponsorType) p.set("sponsorType", filters.sponsorType);
  if (filters.status) p.set("status", filters.status);
  if (filters.dateFrom) p.set("from", filters.dateFrom);
  if (filters.dateTo) p.set("to", filters.dateTo);
  return p;
}

export function hasAnyFilter(filters: LeadershipFilters): boolean {
  return Boolean(
    filters.categoryId ||
      filters.clientId ||
      filters.managerId ||
      filters.officeId ||
      filters.sponsorType ||
      filters.status ||
      filters.dateFrom ||
      filters.dateTo,
  );
}
