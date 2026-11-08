"use client";

import { CopyButton, Notice } from "@/components/ui";
import { loadState } from "@/lib/storage";
import type { SavedPost } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LibraryPage() {
  const [posts, setPosts] = useState<SavedPost[] | null>(null);

  useEffect(() => {
    setPosts(loadState().library);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="kicker">DTW · saved posts</p>
        <nav>
          <Link href="/">Workflow</Link>
          <Link href="/library">Saved posts</Link>
        </nav>
      </header>
      <h1>Approved drafts live here.</h1>
      <p className="storage-note">
        This list is stored in this browser only. It is not a shared library.
        Nothing here was published for you.
      </p>
      {posts === null ? <p className="hint">Loading…</p> : null}
      {posts && posts.length === 0 ? (
        <Notice>
          No approved drafts yet. Finish a LinkedIn draft in the workflow and
          click Approve final draft.
        </Notice>
      ) : null}
      {posts?.map((post) => (
        <article key={post.id} className="library-item">
          <p className="pill">{post.sample ? "Sample" : "Approved"}</p>
          <h2>{post.title}</h2>
          <p className="hint">{new Date(post.savedAt).toLocaleString()}</p>
          <p className="draft-view">{post.linkedinDraft}</p>
          {post.buffer?.ideaId ? (
            <p className="hint">
              Buffer: idea {post.buffer.sample ? "(sample) " : ""}
              {post.buffer.ideaId}
              {post.buffer.linkedInPostId ? " · LinkedIn queued" : ""}
              {post.buffer.xPostId ? " · X queued" : ""}
            </p>
          ) : (
            <p className="hint">Not sent to Buffer yet.</p>
          )}
          <div className="actions">
            <CopyButton text={post.linkedinDraft} label="Copy LinkedIn" />
            {post.xPost ? <CopyButton text={post.xPost} label="Copy X post" /> : null}
            {post.xThread ? (
              <CopyButton
                text={post.xThread.join("\n\n")}
                label="Copy X thread"
              />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
