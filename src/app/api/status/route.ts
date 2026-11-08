import { NextResponse } from "next/server";
import { isBufferOAuthConfigured } from "@/server/buffer/config";
import { isXaiConfigured } from "@/server/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    grokConfigured: isXaiConfigured(),
    bufferConfigured: isBufferOAuthConfigured(),
  });
}
