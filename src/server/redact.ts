const BEARER_PATTERN = /Bearer\s+\S+/gi;
const XAI_KEY_PATTERN = /xai-[A-Za-z0-9._\-]+/gi;

export function redactSecrets(value: string): string {
  let redacted = value.replace(BEARER_PATTERN, "Bearer [redacted]");
  redacted = redacted.replace(XAI_KEY_PATTERN, "[redacted]");

  const secrets = [
    process.env.XAI_API_KEY,
    process.env.BUFFER_CLIENT_SECRET,
    process.env.SESSION_SECRET,
    process.env.BUFFER_CLIENT_ID,
  ];
  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      redacted = redacted.split(secret).join("[redacted]");
    }
  }

  return redacted;
}
