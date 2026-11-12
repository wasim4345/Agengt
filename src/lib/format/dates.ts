import { format, isValid, parseISO } from "date-fns";

/** Canonical display format: dd MMM yyyy (e.g. 12 Nov 2026). */
export const DISPLAY_DATE_FORMAT = "dd MMM yyyy";

function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

/** Format a date as `dd MMM yyyy`. Returns "—" for invalid values. */
export function formatDate(value: Date | string | number): string {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, DISPLAY_DATE_FORMAT);
}
