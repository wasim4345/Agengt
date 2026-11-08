import { createHash, randomBytes } from "node:crypto";
import { redactSecrets } from "../redact";
import {
  getBufferClientId,
  getBufferClientSecret,
  redirectUriFromRequest,
} from "./config";

const AUTH_URL = "https://auth.buffer.com/auth";
const TOKEN_URL = "https://auth.buffer.com/token";
const SCOPES = [
  "account:read",
  "ideas:read",
  "ideas:write",
  "posts:read",
  "posts:write",
  "offline_access",
].join(" ");

export function createPkce(): {
  verifier: string;
  challenge: string;
  state: string;
} {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");
  return { verifier, challenge, state };
}

export function authorizationUrl(
  request: Request,
  challenge: string,
  state: string,
): string {
  const clientId = getBufferClientId();
  if (!clientId) throw new Error("Missing BUFFER_CLIENT_ID.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFromRequest(request),
    response_type: "code",
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function exchangeAuthorizationCode(
  request: Request,
  code: string,
  verifier: string,
): Promise<TokenSet> {
  return requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUriFromRequest(request),
    code_verifier: verifier,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  return requestTokens({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function requestTokens(fields: Record<string, string>): Promise<TokenSet> {
  const clientId = getBufferClientId();
  if (!clientId) throw new Error("Missing BUFFER_CLIENT_ID.");

  const body = new URLSearchParams({ client_id: clientId, ...fields });
  const clientSecret = getBufferClientSecret();
  if (clientSecret) body.set("client_secret", clientSecret);

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new Error(`Buffer sign-in failed: ${redactSecrets(message)}`);
  }

  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    const detail = redactSecrets(
      data.error_description || data.error || `status ${response.status}`,
    );
    throw new Error(`Buffer sign-in failed: ${detail}`);
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };
}
