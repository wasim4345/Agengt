"use client";

import { useRef, useState } from "react";
import {
  Badge,
  Button,
  Field,
  useToast,
} from "@/components/ui";
import { FILE_SIZE_CAP_BYTES, putFileBlob } from "@/store/files";
import { useOsStore } from "@/store/store";
import type { EvidenceType, ID } from "@/types/domain";
import { StorageBanner } from "./StorageBanner";

const TYPES: EvidenceType[] = [
  "photograph",
  "attendance_sheet",
  "report",
  "event_documentation",
  "supporting_document",
  "invoice",
];

async function makeThumb(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 120;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        resolve(data.length > 30_000 ? data.slice(0, 30_000) : data);
      };
      img.onerror = () => resolve(undefined);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function EvidenceGrid({
  programmeId,
  activityId,
  reportId,
}: {
  programmeId: ID;
  activityId: ID;
  reportId?: ID;
}) {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const addEvidenceMeta = useOsStore((s) => s.addEvidenceMeta);
  const approveEvidence = useOsStore((s) => s.approveEvidence);
  const softDeleteEvidence = useOsStore((s) => s.softDeleteEvidence);
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<EvidenceType>("photograph");
  const [filter, setFilter] = useState<EvidenceType | "all">("all");
  const [preview, setPreview] = useState<string | null>(null);

  const items = Object.values(state.evidence).filter(
    (e) =>
      e.activityId === activityId &&
      !e.deleted &&
      (filter === "all" || e.type === filter),
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > FILE_SIZE_CAP_BYTES) {
        push({
          title: `“${file.name}” exceeds 5 MB cap`,
          tone: "danger",
        });
        continue;
      }
      const blobKey = `blob:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        await putFileBlob(blobKey, file, {
          fileName: file.name,
          mime: file.type || "application/octet-stream",
        });
      } catch (error) {
        push({
          title: error instanceof Error ? error.message : "Upload failed",
          tone: "danger",
        });
        continue;
      }
      const thumb = await makeThumb(file);
      const r = addEvidenceMeta({
        programmeId,
        activityId,
        reportId,
        type,
        fileName: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        blobKey,
        thumb,
      });
      push({
        title: r.ok ? `Uploaded ${file.name}` : (r.errors[0]?.message ?? "Failed"),
        tone: r.ok ? "success" : "danger",
      });
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <StorageBanner />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Type">
          <select
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as EvidenceType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filter">
          <select
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as EvidenceType | "all")
            }
          >
            <option value="all">all</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          Upload files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>

      <div
        className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        Drop files here (max 5 MB each)
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <div
            key={e.id}
            className="rounded-xl border border-border bg-surface p-3"
          >
            {e.thumb ? (
              <button
                type="button"
                className="mb-2 block w-full overflow-hidden rounded-md"
                onClick={() => setPreview(e.thumb!)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.thumb}
                  alt={e.fileName}
                  className="h-28 w-full object-cover"
                />
              </button>
            ) : (
              <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-background text-xs text-muted">
                {e.mime}
              </div>
            )}
            <p className="truncate text-sm font-medium">{e.fileName}</p>
            <p className="text-xs text-muted">
              {e.type} · {(e.size / 1024).toFixed(1)} KB
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={e.clientApproved ? "on-track" : "neutral"}>
                Client {e.clientApproved ? "✓" : "—"}
              </Badge>
              <Badge tone={e.marcomApproved ? "on-track" : "neutral"}>
                MarCom {e.marcomApproved ? "✓" : "—"}
              </Badge>
            </div>
            {role === "leadership" ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    approveEvidence(e.id, "client", !e.clientApproved)
                  }
                >
                  Toggle client
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    approveEvidence(e.id, "marcom", !e.marcomApproved)
                  }
                >
                  Toggle MarCom
                </Button>
              </div>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="mt-1"
              onClick={() => {
                softDeleteEvidence(e.id, "Removed from workspace");
                push({ title: "Evidence removed", tone: "success" });
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-h-[80vh] max-w-full rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}
