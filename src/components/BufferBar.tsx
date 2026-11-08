"use client";

export type BufferStatus = {
  configured: boolean;
  connected: boolean;
  sample: boolean;
  redirectUri?: string;
  accountName?: string;
  error?: string;
  channels?: Array<{ id: string; name: string; service: string }>;
};

export function BufferBar({
  status,
}: {
  status: BufferStatus | null;
}) {
  if (!status) {
    return <p className="hint">Checking Buffer…</p>;
  }
  if (status.connected) {
    return (
      <div className="buffer-bar">
        <span>Buffer connected{status.accountName ? ` · ${status.accountName}` : ""}</span>
        <form action="/api/buffer/disconnect" method="post" onSubmit={(event) => {
          event.preventDefault();
          void fetch("/api/buffer/disconnect", { method: "POST" }).then(() => {
            window.location.reload();
          });
        }}>
          <button type="submit" className="ghost">
            Disconnect Buffer
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="buffer-bar">
      <span>
        {status.configured
          ? "Buffer is ready. Connect your account to send approved drafts."
          : "Buffer is the destination for approved drafts. You can still try a labelled sample send."}
      </span>
      <a className="primary" href="/api/buffer/connect">
        Connect Buffer
      </a>
    </div>
  );
}
