import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isValid,
} from "date-fns";
import type { ISODate } from "@/types/domain";

export function parseDate(iso: ISODate): Date {
  const d = parseISO(iso);
  if (!isValid(d)) throw new Error(`Invalid ISO date: ${iso}`);
  return d;
}

export function toISO(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

export function addCalendarDays(iso: ISODate, days: number): ISODate {
  return toISO(addDays(parseDate(iso), days));
}

/** Calendar-day delta: b - a (positive if b is after a). */
export function dayDiff(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseDate(b), parseDate(a));
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return dayDiff(a, b) > 0;
}

export function isAfter(a: ISODate, b: ISODate): boolean {
  return dayDiff(a, b) < 0;
}

export function maxDate(...dates: ISODate[]): ISODate {
  return dates.reduce((best, cur) => (dayDiff(best, cur) > 0 ? cur : best));
}

export function minDate(...dates: ISODate[]): ISODate {
  return dates.reduce((best, cur) => (dayDiff(best, cur) < 0 ? cur : best));
}

export function compareDates(a: ISODate, b: ISODate): number {
  return dayDiff(a, b);
}
