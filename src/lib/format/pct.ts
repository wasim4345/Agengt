/** Format a 0–1 or 0–100 ratio as a percentage string. */
export function formatPct(
  value: number,
  options: { asRatio?: boolean; digits?: number } = {},
): string {
  if (!Number.isFinite(value)) return "—";
  const digits = options.digits ?? 0;
  const pct = options.asRatio ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}
