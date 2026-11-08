# DTW founder-led content

Write one LinkedIn piece at a time, approve every stage, then **send it to Buffer**. Buffer is the destination. Nothing is posted until you press a send button, and even then queue means “next free slot in Buffer”, not “post this second”.

Work is saved in **this browser on this device**. That is not a shared database.

## What you will do

1. Write down the business, offer, buyer, real experiences, and tone.
2. Positioning → edit → approve.
3. Ideas → pick one → approve.
4. Strategy brief → edit → approve.
5. LinkedIn draft → review → approve.
6. **Send to Buffer:** save as a Buffer Idea, and/or add the LinkedIn draft to your LinkedIn queue. Optionally make X copy and queue that too.

Each writing role uses a different prompt. There is one Grok connection on the server. Buffer uses a separate Connect Buffer button.

## First-time setup (no coding)

### 1. Install and open the app

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000

### 2. Try it without keys

Click **Load labelled sample answers**, walk the stages, approve the draft, then on **Buffer** click **Save idea to Buffer**. The result is marked `[SAMPLE]`. Nothing is sent to a real Buffer account yet.

### 3. Connect Buffer (this is the main setup)

Do this in Buffer, in your browser:

1. Log in to Buffer.
2. Open **Settings → API → App Clients**.
3. Create a new client. Name it **DTW**.
4. Add this exact return address (copy it from the Buffer page in the app; it looks like `http://127.0.0.1:3000/api/buffer/callback` on your computer).
5. Turn on permission to read the account, read/write ideas, and read/write posts.
6. Copy the **client ID**. If Buffer also shows a **client secret**, copy that too. Do not paste either into chat.

Then in the project folder:

1. Copy `.env.example` to a new file named `.env.local`.
2. Put the client ID in `BUFFER_CLIENT_ID`.
3. Put the secret in `BUFFER_CLIENT_SECRET` if you have one. If not, you can leave it.
4. Put any long made-up sentence in `SESSION_SECRET`.
5. Restart `npm run dev`.
6. Click **Connect Buffer** and approve the app.

### 4. Optional: connect Grok for real writing

In the same `.env.local` file, add `XAI_API_KEY` and keep `GROK_MODEL=grok-4.7`. Restart the app. Until then, writing steps stay labelled sample.

The keys stay on the server. `.env.local` is ignored by git.

## Rules the writers follow

- No invented stories, quotes, customers, or results.
- No statistics.
- If a fact is missing, the app asks or leaves it out.
- No live web search.
- The customer is the hero. The founder is the guide.
- DTW restriction, editable in the profile: do not mention IIMCIP in marketing content.

## Before a public website

This version limits request size and how often you can generate or send. That is not enough for the open internet. Add stronger server limits before a public launch. Do not publish keys.
