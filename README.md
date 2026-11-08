# Agengt

Server-side xAI (Grok) integration that generates one B2B content idea at a time.

The API key never ships to the browser. Server code reads `XAI_API_KEY` and `GROK_MODEL` from `.env.local` and does not log them.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `XAI_API_KEY` from the [xAI console](https://console.x.ai).
3. Set `GROK_MODEL` (for example `grok-4.7`).
4. Install and run:

```bash
npm install
npm test
npm run dev
```

`.env.local` is gitignored. Do not prefix these variables with `NEXT_PUBLIC_`.

## How it works

- `src/server/xai.ts` calls `https://api.x.ai/v1/chat/completions` with the key in an `Authorization` header.
- `src/server/generate-content-idea.ts` asks Grok for a single JSON content idea.
- `POST /api/content-ideas` is the only public surface. It accepts an optional `{ "topic": "..." }` body.

## Tests

`npm test` mocks xAI and asserts that one content idea is returned and that the API key is never written to logs or error messages.

If `.env.local` contains a real key, a live case also runs against xAI.
