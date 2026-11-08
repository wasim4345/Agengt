import { NextResponse } from "next/server";
import { isXaiConfigured } from "@/server/env";
import { generateContentIdea } from "@/server/generate-content-idea";
import { redactSecrets } from "@/server/redact";

export const runtime = "nodejs";

const TOPIC_MAX_LENGTH = 200;

export async function POST(request: Request) {
  if (!isXaiConfigured()) {
    return NextResponse.json(
      { error: "Content generation is not configured on the server." },
      { status: 503 },
    );
  }

  let topic: string | undefined;
  try {
    const body = (await request.json()) as { topic?: unknown };
    if (typeof body.topic === "string" && body.topic.trim()) {
      topic = body.topic.trim().slice(0, TOPIC_MAX_LENGTH);
    }
  } catch {
    topic = undefined;
  }

  try {
    const idea = await generateContentIdea(topic);
    return NextResponse.json({ idea });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Content idea generation failed";
    return NextResponse.json(
      { error: redactSecrets(message) },
      { status: 502 },
    );
  }
}
