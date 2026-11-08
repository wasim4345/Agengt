"use client";

import type { Status, StrategyBrief } from "@/lib/types";
import { Field, Notice } from "./ui";

export function StrategyStage({
  strategy,
  status,
  generating,
  onGenerate,
  onChange,
  onApprove,
}: {
  strategy: StrategyBrief | null;
  status: Status;
  generating: boolean;
  onGenerate: () => void;
  onChange: (strategy: StrategyBrief) => void;
  onApprove: () => void;
}) {
  return (
    <section className="panel">
      <h2>Strategy brief</h2>
      <p className="hint">
        Approval gate 2. Edit the brief if you need to. The draft will wait until
        you approve this.
      </p>
      {status === "stale" ? (
        <Notice kind="warn">
          The idea or positioning changed. Generate this brief again.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Writing the brief…" : "Develop this idea"}
        </button>
      </div>
      {strategy ? (
        <>
          {strategy.missingInformation.length > 0 ? (
            <Notice kind="warn">
              Missing information (nothing was invented):{" "}
              {strategy.missingInformation.join(" ")}
            </Notice>
          ) : null}
          <div className="grid" style={{ marginTop: 16 }}>
            <Field
              label="Core insight"
              value={strategy.coreInsight}
              onChange={(value) => onChange({ ...strategy, coreInsight: value })}
            />
            <Field
              label="Hook direction"
              value={strategy.hookDirection}
              onChange={(value) => onChange({ ...strategy, hookDirection: value })}
            />
            <Field
              label="Argument"
              value={strategy.argument}
              onChange={(value) => onChange({ ...strategy, argument: value })}
            />
            <Field
              label="Supporting material"
              hint="Only what you already provided."
              value={strategy.supportingMaterial}
              onChange={(value) =>
                onChange({ ...strategy, supportingMaterial: value })
              }
            />
            <Field
              label="Structure"
              value={strategy.structure}
              onChange={(value) => onChange({ ...strategy, structure: value })}
            />
            <Field
              label="Closing question or call to action"
              value={strategy.closingQuestionOrCta}
              onChange={(value) =>
                onChange({ ...strategy, closingQuestionOrCta: value })
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
              Approve this brief
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
