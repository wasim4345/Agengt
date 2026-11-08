export function getBufferClientId(): string | null {
  return process.env.BUFFER_CLIENT_ID?.trim() || null;
}

export function getBufferClientSecret(): string | null {
  return process.env.BUFFER_CLIENT_SECRET?.trim() || null;
}

export function getSessionSecret(): string | null {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.BUFFER_CLIENT_ID?.trim() ||
    null
  );
}

export function isBufferOAuthConfigured(): boolean {
  return Boolean(getBufferClientId() && getSessionSecret());
}

export function redirectUriFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/buffer/callback`;
}
