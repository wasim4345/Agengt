"use client";

import { LIMITS } from "@/lib/limits";
import { useState } from "react";

export function Field({
  label,
  hint,
  value,
  onChange,
  maxLength = LIMITS.medium,
  rows = 4,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <label>
      {label}
      {hint ? <span className="hint">{hint}</span> : null}
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "warn" | "ok";
  children: React.ReactNode;
}) {
  return <div className={`notice ${kind}`}>{children}</div>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
