export type RuleError = {
  code: string;
  message: string;
  field?: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: RuleError[] };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(
  errors: RuleError | RuleError[],
): Result<T> {
  return { ok: false, errors: Array.isArray(errors) ? errors : [errors] };
}
