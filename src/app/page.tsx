"use client";

import { AdaptStage } from "@/components/AdaptStage";
import { BufferBar, type BufferStatus } from "@/components/BufferBar";
import { BufferStage } from "@/components/BufferStage";
import { DraftStage } from "@/components/DraftStage";
import { Foundation } from "@/components/Foundation";
import { IdeasStage } from "@/components/IdeasStage";
import { PositioningStage } from "@/components/PositioningStage";
import { StageNav } from "@/components/StageNav";
import { StrategyStage } from "@/components/StrategyStage";
import { Notice } from "@/components/ui";
import { SAMPLE_PROFILE } from "@/lib/sample-profile";
import { LOADING_COPY, payloadFor } from "@/lib/payloads";
import { loadState, saveState } from "@/lib/storage";
import type { AgentRole, DraftBundle, IdeaCard, Positioning, StrategyBrief, XContent } from "@/lib/types";
import { emptyState, reducer, selectedIdea } from "@/lib/workflow";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";

export default function HomePage() {
  const [state, dispatch] = useReducer(reducer, emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [generating, setGenerating] = useState<AgentRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grok, setGrok] = useState(false);
  const [buffer, setBuffer] = useState<BufferStatus | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [bufferNotice, setBufferNotice] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState(state.profile);

  useEffect(() => {
    const loaded = loadState();
    dispatch({ type: "hydrate", state: loaded });
    setProfileDraft(loaded.profile);
    setHydrated(true);
    fetch("/api/status")
      .then((response) => response.json())
      .then((payload: { grokConfigured?: boolean }) => {
        setGrok(Boolean(payload.grokConfigured));
      })
      .catch(() => setGrok(false));
    fetch("/api/buffer/status")
      .then((response) => response.json())
      .then((payload: BufferStatus) => setBuffer(payload))
      .catch(() =>
        setBuffer({ configured: false, connected: false, sample: true }),
      );
    const params = new URLSearchParams(window.location.search);
    const bufferFlag = params.get("buffer");
    if (bufferFlag === "connected") setBufferNotice("Buffer is connected.");
    if (bufferFlag === "setup") {
      setBufferNotice(
        "Buffer is not set up on this computer yet. You can still try a labelled sample send.",
      );
    }
    if (bufferFlag === "denied") setBufferNotice("Buffer sign-in was cancelled.");
    if (bufferFlag === "error") setBufferNotice("Buffer sign-in did not finish. Try Connect Buffer again.");
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [hydrated, state]);

  async function generate(role: AgentRole) {
    if (generating) return;
    setGenerating(role);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          profile: state.profile,
          payload: payloadFor(role, state),
        }),
      });
      const payload = (await response.json()) as {
        result?: unknown;
        sample?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.result) {
        setError(payload.error || "Could not generate. Your notes are still saved in this browser.");
        return;
      }
      applyResult(role, payload.result, Boolean(payload.sample));
    } catch {
      setError("Could not reach the server. Your notes are still saved in this browser.");
    } finally {
      setGenerating(null);
    }
  }

  function applyResult(role: AgentRole, result: unknown, sample: boolean) {
    if (role === "positioning") {
      dispatch({
        type: "set-positioning",
        positioning: result as Positioning,
        sample,
      });
      return;
    }
    if (role === "ideator") {
      const ideas = (result as { ideas: IdeaCard[] }).ideas;
      dispatch({ type: "set-ideas", ideas, sample });
      return;
    }
    if (role === "strategist") {
      dispatch({
        type: "set-strategy",
        strategy: result as StrategyBrief,
        sample,
      });
      return;
    }
    if (role === "draft") {
      dispatch({ type: "set-draft", draft: result as DraftBundle, sample });
      return;
    }
    dispatch({ type: "set-x", xContent: result as XContent, sample });
  }

  async function sendToBuffer(
    action: "idea" | "queue-linkedin" | "queue-x",
    channelId?: string,
  ) {
    if (sending || state.draftStatus !== "approved" || !state.draft) return;
    setSending(action);
    setError(null);
    const idea = selectedIdea(state);
    const text =
      action === "queue-x"
        ? state.xContent?.xPost || ""
        : action === "idea"
          ? `${idea?.title || "Idea"}\n\n${idea?.angle || ""}\n\n${state.draft.linkedinDraft}`
          : state.draft.linkedinDraft;
    try {
      const response = await fetch("/api/buffer/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          channelId,
          title: idea?.title,
          text,
        }),
      });
      const payload = (await response.json()) as {
        id?: string;
        sample?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        setError(payload.error || "Could not send to Buffer.");
        return;
      }
      const sends =
        action === "idea"
          ? { ideaId: payload.id }
          : action === "queue-linkedin"
            ? { linkedInPostId: payload.id }
            : { xPostId: payload.id };
      dispatch({
        type: "record-buffer-send",
        sends,
        sample: Boolean(payload.sample),
      });
      setBufferNotice(payload.message || "Sent to Buffer.");
    } catch {
      setError("Could not reach Buffer. Your draft is still saved in this browser.");
    } finally {
      setSending(null);
    }
  }

  if (!hydrated) {
    return (
      <div className="app-shell">
        <p className="hint">Loading your saved work…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="kicker">DTW · founder-led content</p>
        <nav>
          <Link href="/">Workflow</Link>
          <Link href="/library">Saved posts</Link>
        </nav>
      </header>
      <h1>Write one piece at a time, with you in charge of every gate.</h1>
      <p className="lede">
        Write here, approve each stage, then send the finished piece to Buffer.
        Notes stay on this device and this browser. They are not a shared
        database.
      </p>
      <BufferBar status={buffer} />
      <p className="storage-note">
        {grok
          ? "Grok is connected on the server. Generated text still needs your approval before anything goes to Buffer."
          : "Grok is not connected yet, so writing steps use labelled [SAMPLE] text. Buffer sends are also sample until you add a Buffer client ID."}
      </p>
      {bufferNotice ? <Notice kind="ok">{bufferNotice}</Notice> : null}

      <StageNav
        state={state}
        onSelect={(stage) => dispatch({ type: "set-stage", stage })}
      />

      {state.lastSample ? (
        <Notice kind="info">
          The last generate step used labelled sample text, not live Grok.
        </Notice>
      ) : null}
      {generating ? <Notice>{LOADING_COPY[generating]}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {state.currentStage === "foundation" ? (
        <Foundation
          profile={profileDraft}
          onChange={setProfileDraft}
          onSave={() =>
            dispatch({ type: "save-profile", profile: profileDraft })
          }
          onLoadSample={() => setProfileDraft(SAMPLE_PROFILE)}
        />
      ) : null}

      {state.currentStage === "positioning" ? (
        <PositioningStage
          positioning={state.positioning}
          status={state.positioningStatus}
          generating={generating === "positioning"}
          onGenerate={() => generate("positioning")}
          onChange={(positioning) =>
            dispatch({ type: "edit-positioning", positioning })
          }
          onApprove={() => dispatch({ type: "approve-positioning" })}
        />
      ) : null}

      {state.currentStage === "ideas" ? (
        <IdeasStage
          ideas={state.ideas}
          status={state.ideasStatus}
          selectedId={state.selectedIdeaId}
          ideaApproved={state.ideaApproved}
          generating={generating === "ideator"}
          onGenerate={() => generate("ideator")}
          onSelect={(id) => dispatch({ type: "select-idea", id })}
          onApprove={() => dispatch({ type: "approve-idea" })}
        />
      ) : null}

      {state.currentStage === "strategy" ? (
        <StrategyStage
          strategy={state.strategy}
          status={state.strategyStatus}
          generating={generating === "strategist"}
          onGenerate={() => generate("strategist")}
          onChange={(strategy) => dispatch({ type: "edit-strategy", strategy })}
          onApprove={() => dispatch({ type: "approve-strategy" })}
        />
      ) : null}

      {state.currentStage === "draft" ? (
        <DraftStage
          draft={state.draft}
          status={state.draftStatus}
          generating={generating === "draft"}
          onGenerate={() => generate("draft")}
          onChange={(linkedinDraft) =>
            dispatch({ type: "edit-draft", linkedinDraft })
          }
          onApprove={() => dispatch({ type: "approve-draft" })}
        />
      ) : null}

      {state.currentStage === "buffer" ? (
        <BufferStage
          status={buffer}
          sends={state.bufferSends}
          sending={sending}
          linkedinDraft={state.draft?.linkedinDraft || ""}
          xPost={state.xContent?.xPost}
          ideaTitle={selectedIdea(state)?.title || "Approved draft"}
          onSend={sendToBuffer}
        />
      ) : null}

      {state.currentStage === "adapt" ? (
        <AdaptStage
          xContent={state.xContent}
          status={state.xStatus}
          generating={generating === "x-adapt"}
          onGenerate={() => generate("x-adapt")}
        />
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={() => dispatch({ type: "new-piece" })}
        >
          Start a new piece (keep business notes)
        </button>
      </div>
    </div>
  );
}
