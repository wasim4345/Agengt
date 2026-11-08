"use client";

import type { Positioning, Status } from "@/lib/types";
import { Field, Notice } from "./ui";

export function PositioningStage({
  positioning,
  status,
  generating,
  onGenerate,
  onChange,
  onApprove,
}: {
  positioning: Positioning | null;
  status: Status;
  generating: boolean;
  onGenerate: () => void;
  onChange: (positioning: Positioning) => void;
  onApprove: () => void;
}) {
  return (
    <section className="panel">
      <h2>Positioning</h2>
      <p className="hint">
        This turns your notes into a statement, a buyer picture, pain points and
        a messaging direction. Edit anything that is wrong. Nothing later starts
        until you approve this.
      </p>
      {status === "stale" ? (
        <Notice kind="warn">
          An earlier answer changed. Write positioning again, then approve it.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Writing…" : "Write positioning from my notes"}
        </button>
      </div>
      {positioning ? (
        <>
          <div className="grid" style={{ marginTop: 16 }}>
            <Field
              label="Positioning statement"
              value={positioning.positioningStatement}
              onChange={(value) =>
                onChange({ ...positioning, positioningStatement: value })
              }
            />
            <Field
              label="Buyer profile"
              value={positioning.buyerProfile}
              onChange={(value) =>
                onChange({ ...positioning, buyerProfile: value })
              }
            />
            <Field
              label="Key pain points (one per line)"
              value={positioning.keyPainPoints.join("\n")}
              onChange={(value) =>
                onChange({
                  ...positioning,
                  keyPainPoints: value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
            />
            <Field
              label="Messaging direction"
              value={positioning.messagingDirection}
              onChange={(value) =>
                onChange({ ...positioning, messagingDirection: value })
              }
            />
          </div>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={status === "stale" || generating}
              onClick={onApprove}
            >
              Approve this foundation
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
