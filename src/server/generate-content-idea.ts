import type { ContentIdea } from "@/lib/content-idea";
import { createChatCompletion } from "./xai";
import { asNonEmptyString, parseJsonObject } from "./json";

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
  const record = parseJsonObject(raw);
  return {
    title: asNonEmptyString(record.title, "title"),
    hook: asNonEmptyString(record.hook, "hook"),
    format: asNonEmptyString(record.format, "format"),
    whyItWorks: asNonEmptyString(record.whyItWorks, "whyItWorks"),
  };
}
