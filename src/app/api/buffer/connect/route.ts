import { NextResponse } from "next/server";
import { isBufferOAuthConfigured } from "@/server/buffer/config";
import { authorizationUrl, createPkce } from "@/server/buffer/oauth";
import { setOauthCookie } from "@/server/buffer/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isBufferOAuthConfigured()) {
    return NextResponse.redirect(new URL("/?buffer=setup", request.url));
  }
  const pkce = createPkce();
  const response = NextResponse.redirect(
    authorizationUrl(request, pkce.challenge, pkce.state),
  );
  setOauthCookie(response, request, {
    state: pkce.state,
    verifier: pkce.verifier,
  });
  return response;
}
