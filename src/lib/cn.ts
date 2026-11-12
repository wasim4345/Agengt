import { clsx, type ClassValue } from "clsx";

/** Lightweight className joiner for UI primitives. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
