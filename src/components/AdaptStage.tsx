"use client";

import type { Status, XContent } from "@/lib/types";
import { CopyButton, Notice } from "./ui";

export function AdaptStage({
  xContent,
  status,
  generating,
  onGenerate,
}: {
  xContent: XContent | null;
  status: Status;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="panel">
      <h2>Optional X post and thread</h2>
      <p className="hint">
        This uses only the approved LinkedIn draft. It will not add new stories
        or facts. There is no publishing connection — copy the text yourself.
      </p>
      {status === "stale" ? (
        <Notice kind="warn">
          The LinkedIn draft changed. Generate the X copy again if you still want
          it.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Adapting…" : "Make X copy from the approved draft"}
        </button>
      </div>
      {xContent ? (
        <div className="grid" style={{ marginTop: 16 }}>
          <div>
            <h3>Standalone post</h3>
            <p className="draft-view">{xContent.xPost}</p>
            <div className="actions">
              <CopyButton text={xContent.xPost} label="Copy post" />
            </div>
          </div>
          <div>
            <h3>Thread</h3>
            <ol className="thread">
              {xContent.xThread.map((item, index) => (
                <li key={`${index}-${item.slice(0, 12)}`}>
                  <p>{item}</p>
                  <CopyButton text={item} label={`Copy ${index + 1}`} />
                </li>
              ))}
            </ol>
            <div className="actions">
              <CopyButton
                text={xContent.xThread.join("\n\n")}
                label="Copy whole thread"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
