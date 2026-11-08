"use client";

import type { IdeaCard, Status } from "@/lib/types";
import { Notice } from "./ui";

export function IdeasStage({
  ideas,
  status,
  selectedId,
  ideaApproved,
  generating,
  onGenerate,
  onSelect,
  onApprove,
}: {
  ideas: IdeaCard[] | null;
  status: Status;
  selectedId: string | null;
  ideaApproved: boolean;
  generating: boolean;
  onGenerate: () => void;
  onSelect: (id: string) => void;
  onApprove: () => void;
}) {
  return (
    <section className="panel">
      <h2>Ideas</h2>
      <p className="hint">
        Approval gate 1. Pick one idea. The next step will not start until you
        approve it.
      </p>
      {status === "stale" ? (
        <Notice kind="warn">
          Positioning changed. Generate ideas again and approve one.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Writing ideas…" : "Propose ideas"}
        </button>
      </div>
      {ideas ? (
        <div className="idea-list">
          {ideas.map((idea) => (
            <button
              key={idea.id}
              type="button"
              className="idea-card"
              data-selected={selectedId === idea.id}
              onClick={() => onSelect(idea.id)}
            >
              <h3>{idea.title}</h3>
              <p>
                <strong>Angle. </strong>
                {idea.angle}
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>Why it matters to the buyer. </strong>
                {idea.whyItMattersToBuyer}
              </p>
            </button>
          ))}
        </div>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={!selectedId || status === "stale" || generating}
          onClick={onApprove}
        >
          {ideaApproved ? "Idea approved" : "Approve this idea"}
        </button>
      </div>
    </section>
  );
}
