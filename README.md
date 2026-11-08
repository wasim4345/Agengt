# DTW founder-led content

A simple writing desk for one LinkedIn piece at a time. You stay in charge. Nothing is posted for you.

Work is saved in **this browser on this device**. It is not a shared database. A new phone, a different browser, or clearing site data will not keep the drafts.

## What you will do

1. Write down the business, the offer, the buyer, real experiences, and how you like to sound.
2. Let the app turn that into positioning. Edit it. Approve it.
3. Get ideas. Pick one. Approve it.
4. Get a strategy brief. Edit it. Approve it.
5. Get a LinkedIn draft. The app reviews it and may tidy it twice. You still approve the final text.
6. Optionally turn that approved draft into an X post and thread. Copy the text. There is no publishing connection.

Each writing role uses a different prompt. There is still only one Grok connection, on the server.

## First-time setup (no coding)

### 1. Install the app tools

In the project folder, run:

```bash
npm install
```

### 2. Try it without an API key

```bash
npm run dev
```

Open http://127.0.0.1:3000

Use **Load labelled sample answers**, then walk the stages. Sample text is marked `[SAMPLE]`. This is how you learn the buttons before Grok is connected.

### 3. Connect Grok when you are ready

1. Copy `.env.example` to a new file named `.env.local`.
2. Put your xAI key in `XAI_API_KEY`.
3. Leave `GROK_MODEL` as `grok-4.7` unless you were told to change it.
4. Restart `npm run dev`.

The key stays on the server. It is never shown in the page. `.env.local` is ignored by git.

If you do not have a key yet, keep using the labelled sample path. The workflow is the same.

### 4. Checks

```bash
npm test
```

## Rules the writers follow

- No invented stories, quotes, customers, or results.
- No statistics.
- If a fact is missing, the app asks or leaves it out.
- No live web search. You may paste notes; they are not treated as verified news.
- The customer is the hero. The founder is the guide.
- DTW restriction, editable in the profile: do not mention IIMCIP in marketing content.

## Before putting this on a public website

This version limits request size, output length, and revision rounds on the server. Browser limits are not enough on their own. Before a public launch, add stronger server usage controls (accounts or a stricter cap). Do not publish the API key.

The old one-idea helper still lives under `src/server/generate-content-idea.ts` and is covered by tests.
