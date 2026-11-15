"use client";

import { useId, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { formatINR, groupIndian } from "@/lib/format/inr";

export type MoneyInputProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  name?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
};

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function MoneyInput({
  label,
  value,
  onChange,
  name,
  required,
  error,
  hint,
  className,
  disabled,
}: MoneyInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const display =
    focused
      ? draft
      : value === null || value === undefined
        ? ""
        : groupIndian(String(Math.round(Math.abs(value))));

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = digitsOnly(event.target.value);
    setDraft(digits ? groupIndian(digits) : "");
    if (!digits) {
      onChange(null);
      return;
    }
    onChange(Number(digits));
  };

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted"
          aria-hidden
        >
          ₹
        </span>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface pl-7 pr-3 text-sm",
            error && "border-danger",
            disabled && "opacity-50",
          )}
          value={display}
          onFocus={() => {
            setFocused(true);
            setDraft(
              value === null || value === undefined
                ? ""
                : groupIndian(String(Math.round(Math.abs(value)))),
            );
          }}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint ??
            (value !== null && value !== undefined
              ? `Formatted: ${formatINR(value)}`
              : "Enter amount in rupees")}
        </p>
      )}
    </div>
  );
}
