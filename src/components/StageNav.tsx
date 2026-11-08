"use client";

import { statusLabel } from "@/lib/workflow";
import type { AppState, StageId, Status } from "@/lib/types";
import { canOpenStage } from "@/lib/workflow";

const STAGES: Array<{ id: StageId; label: string; status: (state: AppState) => Status | "saved" | "locked" }> = [
  { id: "foundation", label: "1. Business", status: (state) => (state.profileSaved ? "saved" : "empty") },
  { id: "positioning", label: "2. Positioning", status: (state) => state.positioningStatus },
  { id: "ideas", label: "3. Ideas", status: (state) => state.ideasStatus },
  { id: "strategy", label: "4. Strategy", status: (state) => state.strategyStatus },
  { id: "draft", label: "5. Draft", status: (state) => state.draftStatus },
  { id: "buffer", label: "6. Buffer", status: (state) => state.bufferStatus },
  { id: "adapt", label: "7. X copy", status: (state) => state.xStatus },
];

export function StageNav({
  state,
  onSelect,
}: {
  state: AppState;
  onSelect: (stage: StageId) => void;
}) {
  return (
    <div className="stage-nav" role="tablist" aria-label="Content stages">
      {STAGES.map((stage) => {
        const open = canOpenStage(state, stage.id);
        const status = stage.status(state);
        const statusText =
          status === "saved" ? "Saved" : status === "locked" ? "" : statusLabel(status);
        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            data-active={state.currentStage === stage.id}
            disabled={!open}
            onClick={() => onSelect(stage.id)}
          >
            {stage.label}
            {statusText ? ` · ${statusText}` : ""}
          </button>
        );
      })}
    </div>
  );
}
