import type { ISODate } from "@/types/domain";

/** Indian financial year: 1 Apr – 31 Mar. Label `2026-27`. */
export type FinancialYear = {
  /** e.g. "2026-27" */
  label: string;
  /** April 1 of start calendar year */
  start: ISODate;
  /** March 31 of end calendar year */
  end: ISODate;
};

export function parseFyLabel(label: string): FinancialYear | null {
  const m = /^(\d{4})-(\d{2})$/.exec(label.trim());
  if (!m) return null;
  const startYear = Number(m[1]);
  const endShort = Number(m[2]);
  if (endShort !== (startYear + 1) % 100) return null;
  return {
    label,
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
  };
}

/** FY containing an ISO date (demo clock). */
export function fyContaining(date: ISODate): FinancialYear {
  const [ys, ms] = date.split("-");
  const y = Number(ys);
  const month = Number(ms);
  const startYear = month >= 4 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return {
    label: `${startYear}-${endShort}`,
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
  };
}

export function listFinancialYears(
  earliestStart: ISODate,
  latestEnd: ISODate,
  extraFuture = 1,
): FinancialYear[] {
  const first = fyContaining(earliestStart);
  const last = fyContaining(latestEnd);
  const startY = Number(first.label.slice(0, 4));
  const endY = Number(last.label.slice(0, 4)) + extraFuture;
  const out: FinancialYear[] = [];
  for (let y = startY; y <= endY; y += 1) {
    const endShort = String((y + 1) % 100).padStart(2, "0");
    out.push({
      label: `${y}-${endShort}`,
      start: `${y}-04-01`,
      end: `${y + 1}-03-31`,
    });
  }
  return out;
}

export function dateInFy(date: ISODate, fy: FinancialYear): boolean {
  return date >= fy.start && date <= fy.end;
}
