import type { RuleError } from "@/types/result";

export type Severity = "E" | "W";

export type ValidationIssue = RuleError & {
  severity: Severity;
};

export type ValidationResult = {
  ok: boolean; // true when no blocking (E) issues
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export function issue(
  severity: Severity,
  code: string,
  message: string,
  field?: string,
): ValidationIssue {
  return { severity, code, message, field };
}

export function splitIssues(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter((i) => i.severity === "E");
  const warnings = issues.filter((i) => i.severity === "W");
  return { ok: errors.length === 0, errors, warnings };
}
