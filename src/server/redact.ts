const BEARER_PATTERN = /Bearer\s+\S+/gi;
const XAI_KEY_PATTERN = /xai-[A-Za-z0-9._\-]+/gi;

export function redactSecrets(value: string): string {
  let redacted = value.replace(BEARER_PATTERN, "Bearer [redacted]");
  redacted = redacted.replace(XAI_KEY_PATTERN, "[redacted]");

  const apiKey = process.env.XAI_API_KEY;
  if (apiKey && apiKey.length > 0) {
    redacted = redacted.split(apiKey).join("[redacted]");
  }

  return redacted;
}
