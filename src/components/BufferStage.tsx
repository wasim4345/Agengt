"use client";

import type { BufferSends } from "@/lib/types";
import type { BufferStatus } from "./BufferBar";
import { Notice } from "./ui";

export function BufferStage({
  status,
  sends,
  sending,
  linkedinDraft,
  xPost,
  ideaTitle,
  onSend,
}: {
  status: BufferStatus | null;
  sends: BufferSends;
  sending: string | null;
  linkedinDraft: string;
  xPost?: string;
  ideaTitle: string;
  onSend: (action: "idea" | "queue-linkedin" | "queue-x", channelId?: string) => void;
}) {
  const channels = status?.channels ?? [];
  const linkedIn = channels.find((channel) => channel.service.toLowerCase() === "linkedin");
  const twitter = channels.find(
    (channel) =>
      channel.service.toLowerCase() === "twitter" ||
      channel.service.toLowerCase() === "x",
  );

  return (
    <section className="panel">
      <h2>Send to Buffer</h2>
      <p className="hint">
        This is the main hand-off. Nothing goes to Buffer until you press a
        button below. Ideas land on your Buffer Ideas board. Queue adds the
        copy to the next free slot — it does not post immediately.
      </p>
      {!status?.configured ? (
        <Notice kind="info">
          Buffer is not connected on this computer yet, so sends are labelled
          sample. To send for real: in Buffer open Settings → API → App Clients,
          create a client, and add this exact return address:{" "}
          <code>{status?.redirectUri || `${typeof window !== "undefined" ? window.location.origin : ""}/api/buffer/callback`}</code>
          . Then put the client ID in <code>.env.local</code> as BUFFER_CLIENT_ID
          and restart the app. Do not paste the ID into chat.
        </Notice>
      ) : null}
      {status?.configured && !status.connected ? (
        <Notice kind="warn">
          Buffer is set up, but this browser is not signed in. Use Connect Buffer
          first.
        </Notice>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={Boolean(sending)}
          onClick={() => onSend("idea")}
        >
          {sending === "idea"
            ? "Saving idea…"
            : sends.ideaId
              ? "Saved to Buffer Ideas"
              : "Save idea to Buffer"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={Boolean(sending) || !linkedinDraft}
          onClick={() => onSend("queue-linkedin", linkedIn?.id)}
        >
          {sending === "queue-linkedin"
            ? "Adding to queue…"
            : sends.linkedInPostId
              ? "LinkedIn is in the Buffer queue"
              : "Add LinkedIn draft to Buffer queue"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={Boolean(sending) || !xPost}
          onClick={() => onSend("queue-x", twitter?.id)}
        >
          {sending === "queue-x"
            ? "Adding to queue…"
            : sends.xPostId
              ? "X is in the Buffer queue"
              : "Add X post to Buffer queue"}
        </button>
      </div>
      {!xPost ? (
        <p className="hint" style={{ marginTop: 12 }}>
          X queue needs the optional X copy step first. LinkedIn and Ideas do
          not.
        </p>
      ) : null}
      <p className="hint" style={{ marginTop: 12 }}>
        Sending: {ideaTitle}
      </p>
    </section>
  );
}
