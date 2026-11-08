import { NextResponse } from "next/server";
import { getSessionSecret } from "./config";
import { openSealed, seal } from "../seal";

export const OAUTH_COOKIE = "agengt_oauth";
export const SESSION_COOKIE = "agengt_buffer";

export type OauthPending = {
  state: string;
  verifier: string;
};

export type BufferSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

function cookieBase(request: Request) {
  const url = new URL(request.url);
  return {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return raw ? decodeURIComponent(raw) : null;
}

export function readOauthPending(request: Request): OauthPending | null {
  const secret = getSessionSecret();
  const raw = readCookie(request, OAUTH_COOKIE);
  if (!secret || !raw) return null;
  return openSealed<OauthPending>(raw, secret);
}

export function readBufferSession(request: Request): BufferSession | null {
  const secret = getSessionSecret();
  const raw = readCookie(request, SESSION_COOKIE);
  if (!secret || !raw) return null;
  const session = openSealed<BufferSession>(raw, secret);
  if (!session?.accessToken) return null;
  return session;
}

export function setOauthCookie(
  response: NextResponse,
  request: Request,
  pending: OauthPending,
) {
  const secret = getSessionSecret();
  if (!secret) return;
  response.cookies.set(OAUTH_COOKIE, seal(pending, secret), {
    ...cookieBase(request),
    maxAge: 10 * 60,
  });
}

export function clearOauthCookie(response: NextResponse, request: Request) {
  response.cookies.set(OAUTH_COOKIE, "", { ...cookieBase(request), maxAge: 0 });
}

export function setSessionCookie(
  response: NextResponse,
  request: Request,
  session: BufferSession,
) {
  const secret = getSessionSecret();
  if (!secret) return;
  response.cookies.set(SESSION_COOKIE, seal(session, secret), {
    ...cookieBase(request),
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse, request: Request) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieBase(request),
    maxAge: 0,
  });
}
