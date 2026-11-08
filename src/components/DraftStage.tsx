"use client";

import { LIMITS } from "@/lib/limits";
import type { DraftBundle, Status } from "@/lib/types";
import { CopyButton, Field, Notice } from "./ui";

export function DraftStage({
  draft,
  status,
  generating,
  onGenerate,
  onChange,
  onApprove,
}: {
  draft: DraftBundle | null;
  status: Status;
  generating: boolean;
  onGenerate: () => void;
  onChange: (text: string) => void;
  onApprove: () => void;
}) {
  return (
    <section className="panel">
      <h2>LinkedIn draft</h2>
      <p className="hint">
        Approval gate 3. The writer drafts. The content manager reviews. Routine
        fixes go back to the writer automatically, at most twice. If something
        cannot be checked, it is flagged for you. Nothing is published.
      </p>
      {status === "stale" ? (
        <Notice kind="warn">
          The brief changed. Generate the draft again, then approve it.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Writing and reviewing…" : "Write and review draft"}
        </button>
      </div>
      {draft ? (
        <>
          <p className="hint" style={{ marginTop: 14 }}>
            Editor: {draft.managerVerdict} · automatic revision rounds:{" "}
            {draft.revisionRounds}
          </p>
          {draft.managerSummary ? <Notice>{draft.managerSummary}</Notice> : null}
          {draft.issuesForUser.length > 0 ? (
            <Notice kind="warn">
              Flagged for you (not invented): {draft.issuesForUser.join(" ")}
            </Notice>
          ) : null}
          {draft.questionsForUser.length > 0 ? (
            <Notice kind="info">
              Questions: {draft.questionsForUser.join(" ")}
            </Notice>
          ) : null}
          <Field
            label="Draft (edit freely)"
            value={draft.linkedinDraft}
            onChange={onChange}
            maxLength={LIMITS.draft}
            rows={16}
          />
          <div className="actions">
            <CopyButton text={draft.linkedinDraft} label="Copy draft" />
            <button
              type="button"
              className="secondary"
              disabled={status === "stale" || generating}
              onClick={onApprove}
            >
              Approve final draft
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
