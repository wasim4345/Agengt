import { addDays, format, parseISO } from "date-fns";
import type { ISODate, ISODateTime } from "@/types/domain";

/** Offset demo date by N days → YYYY-MM-DD. */
export function d(demoDate: ISODate, offsetDays: number): ISODate {
  return format(addDays(parseISO(demoDate), offsetDays), "yyyy-MM-dd");
}

/** Demo-clock timestamp at noon UTC for stable seeds. */
export function ts(demoDate: ISODate, offsetDays = 0): ISODateTime {
  return `${d(demoDate, offsetDays)}T12:00:00.000Z`;
}
