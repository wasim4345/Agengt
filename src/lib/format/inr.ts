/**
 * Indian Rupee formatters.
 * Full: ₹25,00,000 (Indian grouping)
 * Compact: ₹25.0 L / ₹1.2 Cr for KPI tiles
 */

const CRORE = 10_000_000;
const LAKH = 100_000;

/** Group an integer string with Indian numbering (last 3, then pairs of 2). */
export function groupIndian(integerDigits: string): string {
  const digits = integerDigits.replace(/^0+(?=\d)/, "") || "0";
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const pairs: string[] = [];
  let remaining = rest;
  while (remaining.length > 2) {
    pairs.unshift(remaining.slice(-2));
    remaining = remaining.slice(0, -2);
  }
  if (remaining) pairs.unshift(remaining);
  return `${pairs.join(",")},${last3}`;
}

/** Format paise-free rupee amount as ₹25,00,000 (rounds to nearest rupee). */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return "₹—";
  const negative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const grouped = groupIndian(String(abs));
  return `${negative ? "-" : ""}₹${grouped}`;
}

export type CompactINROptions = {
  /** Decimal places for L/Cr compact form. Default 1. */
  digits?: number;
};

/**
 * Compact KPI form: below 1 Lakh → full INR; else ₹X.X L / ₹X.X Cr.
 * Examples: ₹25.0 L, ₹1.2 Cr
 */
export function formatINRCompact(
  amount: number,
  options: CompactINROptions = {},
): string {
  if (!Number.isFinite(amount)) return "₹—";
  const digits = options.digits ?? 1;
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const sign = negative ? "-" : "";

  if (abs >= CRORE) {
    const value = abs / CRORE;
    return `${sign}₹${value.toFixed(digits)} Cr`;
  }
  if (abs >= LAKH) {
    const value = abs / LAKH;
    return `${sign}₹${value.toFixed(digits)} L`;
  }
  return formatINR(amount);
}
