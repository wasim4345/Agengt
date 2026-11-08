import type { ContentIdea } from "@/lib/content-idea";
import { createChatCompletion } from "./xai";

export type { ContentIdea };

const SYSTEM_PROMPT =
  "You generate concise B2B content ideas. Reply with a single JSON object only. No markdown.";

export async function generateContentIdea(topic?: string): Promise<ContentIdea> {
  const focus = topic?.trim() || "AI-first B2B marketing";
  const userPrompt = [
    `Generate exactly one content idea about: ${focus}.`,
    "Return JSON with keys: title, hook, format, whyItWorks.",
    "title: a specific, non-generic headline.",
    "hook: the opening line a reader would see.",
    "format: e.g. LinkedIn post, email, thread, or landing page.",
    "whyItWorks: one sentence on why this idea would land with a B2B buyer.",
  ].join(" ");

  const raw = await createChatCompletion([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  return parseContentIdea(raw);
}

export function parseContentIdea(raw: string): ContentIdea {
  const json = extractJsonObject(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("xAI returned a content idea that was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("xAI returned a content idea that was not an object");
  }

  const record = parsed as Record<string, unknown>;
  const title = asNonEmptyString(record.title, "title");
  const hook = asNonEmptyString(record.hook, "hook");
  const format = asNonEmptyString(record.format, "format");
  const whyItWorks = asNonEmptyString(record.whyItWorks, "whyItWorks");

  return { title, hook, format, whyItWorks };
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`xAI content idea was missing ${field}`);
  }
  return value.trim();
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("xAI returned a content idea that was not JSON");
  }
  return candidate.slice(start, end + 1);
}
