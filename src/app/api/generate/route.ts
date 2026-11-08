import { NextResponse } from "next/server";
import { runGenerate } from "@/server/agents/run";
import { assertBodySize, parseGenerateRequest } from "@/server/agents/validate";
import { allowRequest, clientIp } from "@/server/rate-limit";
import { redactSecrets } from "@/server/redact";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json(
      {
        error:
          "Too many generate requests in a short time. Wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  let raw = "";
  try {
    raw = await request.text();
    assertBodySize(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request was too large.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json(
      { error: "The request could not be read. Try again." },
      { status: 400 },
    );
  }

  try {
    const parsed = parseGenerateRequest(parsedBody);
    const { result, sample } = await runGenerate(parsed);
    return NextResponse.json({ result, sample });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    const safe = redactSecrets(message);
    const status = safe.includes("Missing XAI_API_KEY") ? 503 : 400;
    return NextResponse.json({ error: safe }, { status });
  }
}
