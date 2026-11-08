export type XaiConfig = {
  apiKey: string;
  model: string;
};

export function isXaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim() && process.env.GROK_MODEL?.trim());
}

export function getXaiConfig(): XaiConfig {
  const apiKey = process.env.XAI_API_KEY?.trim();
  const model = process.env.GROK_MODEL?.trim();

  if (!apiKey) {
    throw new Error("Missing XAI_API_KEY. Set it in .env.local.");
  }

  if (!model) {
    throw new Error("Missing GROK_MODEL. Set it in .env.local.");
  }

  return { apiKey, model };
}
