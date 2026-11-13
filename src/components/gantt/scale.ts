import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { ISODate } from "@/types/domain";

export type GanttZoom = "week" | "month" | "quarter";

export const DAY_WIDTH: Record<GanttZoom, number> = {
  week: 28,
  month: 10,
  quarter: 4,
};

export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 44;
export const MILESTONE_ROW_HEIGHT = 28;
export const LEFT_WIDTH = 340;

export function dayIndex(rangeStart: ISODate, date: ISODate): number {
  return differenceInCalendarDays(parseISO(date), parseISO(rangeStart));
}

export function dateFromIndex(rangeStart: ISODate, index: number): ISODate {
  return format(addDays(parseISO(rangeStart), index), "yyyy-MM-dd");
}

export function snapDaysDelta(px: number, zoom: GanttZoom): number {
  const w = DAY_WIDTH[zoom];
  return Math.round(px / w);
}

export function buildTicks(
  rangeStart: ISODate,
  rangeEnd: ISODate,
  zoom: GanttZoom,
): { date: ISODate; label: string; major: boolean }[] {
  const start = parseISO(rangeStart);
  const end = parseISO(rangeEnd);
  const total = Math.max(1, differenceInCalendarDays(end, start));
  const step = zoom === "week" ? 7 : zoom === "month" ? 14 : 30;
  const ticks: { date: ISODate; label: string; major: boolean }[] = [];
  for (let i = 0; i <= total; i += step) {
    const d = addDays(start, i);
    ticks.push({
      date: format(d, "yyyy-MM-dd"),
      label:
        zoom === "week"
          ? format(d, "dd MMM")
          : zoom === "month"
            ? format(d, "MMM yy")
            : format(d, "QQQ yyyy"),
      major: true,
    });
  }
  return ticks;
}

export function statusBarClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-status-on-track";
    case "in_progress":
      return "bg-status-in-progress";
    case "delayed":
      return "bg-status-delayed";
    case "partially_completed":
      return "bg-status-at-risk";
    case "on_hold":
      return "bg-muted";
    case "cancelled":
      return "bg-border";
    default:
      return "bg-slate-400";
  }
}
