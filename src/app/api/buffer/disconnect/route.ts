import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/buffer/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, request);
  return response;
}
