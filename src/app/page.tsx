"use client";

import { FormEvent, useState } from "react";
import type { ContentIdea } from "@/lib/content-idea";

export default function HomePage() {
  const [topic, setTopic] = useState("AI-first B2B marketing");
  const [idea, setIdea] = useState<ContentIdea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const payload = (await response.json()) as {
        idea?: ContentIdea;
        error?: string;
      };
      if (!response.ok || !payload.idea) {
        setIdea(null);
        setError(payload.error || "Could not generate a content idea.");
        return;
      }
      setIdea(payload.idea);
    } catch {
      setIdea(null);
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <p className="kicker">Agengt · Grok, server-side</p>
      <h1>One content idea, generated on the server.</h1>
      <p className="lede">
        The xAI key stays in <code>.env.local</code>. This page only sends a
        topic; Grok writes a single B2B idea on the server and returns the
        result.
      </p>

      <form onSubmit={onSubmit}>
        <label htmlFor="topic">Topic</label>
        <input
          id="topic"
          type="text"
          value={topic}
          maxLength={200}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. pipeline reviews for mid-market SaaS"
        />
        <button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate one idea"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {idea ? (
        <article>
          <p className="meta">{idea.format}</p>
          <h2>{idea.title}</h2>
          <p className="hook">{idea.hook}</p>
          <p className="why">{idea.whyItWorks}</p>
        </article>
      ) : null}
    </main>
  );
}
