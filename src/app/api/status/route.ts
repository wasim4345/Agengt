import { NextResponse } from "next/server";
import { isXaiConfigured } from "@/server/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ grokConfigured: isXaiConfigured() });
}
