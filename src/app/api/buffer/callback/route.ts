import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/server/buffer/oauth";
import {
  clearOauthCookie,
  readOauthPending,
  setSessionCookie,
} from "@/server/buffer/session";
import { redactSecrets } from "@/server/redact";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = readOauthPending(request);

  if (errorParam) {
    return finish(request, "denied");
  }
  if (!code || !state || !pending || pending.state !== state) {
    return finish(request, "error");
  }

  try {
    const tokens = await exchangeAuthorizationCode(
      request,
      code,
      pending.verifier,
    );
    const response = finish(request, "connected");
    clearOauthCookie(response, request);
    setSessionCookie(response, request, tokens);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    redactSecrets(message);
    return finish(request, "error");
  }
}

function finish(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/?buffer=${status}`, request.url));
}
