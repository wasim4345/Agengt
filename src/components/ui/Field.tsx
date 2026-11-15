"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "children">;

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  id,
  ...inputProps
}: FieldProps) {
  const generatedId = useId();
  const fieldId = htmlFor ?? id ?? generatedId;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children ?? (
        <input
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm",
            "placeholder:text-muted",
            error && "border-danger",
          )}
          {...inputProps}
        />
      )}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
