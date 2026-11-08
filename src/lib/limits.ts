export const LIMITS = {
  short: 200,
  medium: 1500,
  long: 4000,
  draft: 8000,
  ideas: 5,
  revisionRounds: 2,
  bodyBytes: 50_000,
  maxCompletionTokens: 2500,
  rateLimitMax: 20,
  rateLimitWindowMs: 15 * 60 * 1000,
} as const;

export const STORAGE_KEY = "dtw-founder-content-v1";
