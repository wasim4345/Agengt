export function parseJsonObject(raw: string): Record<string, unknown> {
  const json = extractJsonObject(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Grok returned text that was not valid JSON. Try generating again.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Grok returned something that was not an object. Try generating again.");
  }
  return parsed as Record<string, unknown>;
}

export function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Grok left out ${field}. Try generating again.`);
  }
  return value.trim();
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Grok returned text that was not JSON. Try generating again.");
  }
  return candidate.slice(start, end + 1);
}
