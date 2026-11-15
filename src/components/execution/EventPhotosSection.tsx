"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import { Button, Field, useToast } from "@/components/ui";
import {
  EVENT_PHOTO_ACCEPT,
  isEventCategoryName,
  processEventPhoto,
} from "@/lib/eventPhotos";
import { deleteFileBlob, putFileBlob } from "@/store/files";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventPhotosSection({
  programmeId,
  activityId,
  reportId,
  isEvent,
  onIsEventChange,
  readOnly,
}: {
  programmeId: ID;
  activityId: ID;
  reportId: ID;
  isEvent: boolean;
  onIsEventChange: (v: boolean) => void;
  readOnly: boolean;
}) {
  const state = useOsStore((s) => s.state);
  const addEvidenceMeta = useOsStore((s) => s.addEvidenceMeta);
  const updateEvidence = useOsStore((s) => s.updateEvidence);
  const removeUnsubmittedEvidence = useOsStore(
    (s) => s.removeUnsubmittedEvidence,
  );
  const softDeleteEvidence = useOsStore((s) => s.softDeleteEvidence);
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activity = state.activities[activityId];
  const catName = activity?.categoryId
    ? state.activityCategories[activity.categoryId]?.name
    : undefined;
  const autoEvent = isEventCategoryName(catName);
  const showFull = isEvent || autoEvent || expanded;

  const photos = useMemo(() => {
    return Object.values(state.evidence)
      .filter(
        (e) =>
          e.reportId === reportId &&
          e.type === "photograph" &&
          !e.deleted,
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [state.evidence, reportId]);

  const totalSize = photos.reduce((s, p) => s + p.size, 0);

  async function ingest(files: FileList | null) {
    if (!files?.length || readOnly) return;
    setBusy(true);
    try {
      let orderBase =
        photos.reduce((m, p) => Math.max(m, p.order ?? 0), 0) + 1;
      for (const file of Array.from(files)) {
        try {
          const processed = await processEventPhoto(file);
          const blobKey = `blob:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
          await putFileBlob(blobKey, processed.blob, {
            fileName: processed.fileName,
            mime: processed.mime,
          });
          const r = addEvidenceMeta({
            programmeId,
            activityId,
            reportId,
            type: "photograph",
            fileName: processed.fileName,
            mime: processed.mime,
            size: processed.size,
            blobKey,
            thumb: processed.thumb,
            order: orderBase,
          });
          orderBase += 1;
          if (!r.ok) {
            await deleteFileBlob(blobKey);
            push({
              title: r.errors[0]?.message ?? "Could not attach photo",
              tone: "danger",
            });
          }
        } catch (error) {
          push({
            title:
              error instanceof Error ? error.message : "Photo processing failed",
            tone: "danger",
          });
        }
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  if (!showFull) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          onClick={() => setExpanded(true)}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          + Add event photos
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4"
      data-testid="event-photos"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Event photos</p>
          <p className="text-xs text-muted">
            {photos.length} photos · {formatBytes(totalSize)} · Photos stay in
            this browser (prototype storage)
          </p>
        </div>
        {!autoEvent ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isEvent}
              disabled={readOnly}
              onChange={(e) => onIsEventChange(e.target.checked)}
            />
            This was an event
          </label>
        ) : (
          <span className="text-xs text-muted">Event activity</span>
        )}
      </div>

      {!readOnly ? (
        <div
          className="mt-3 flex flex-wrap gap-2 rounded-lg border border-dashed border-border bg-background/50 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void ingest(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={EVENT_PHOTO_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => void ingest(e.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => void ingest(e.target.files)}
          />
          <Button
            size="sm"
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="mr-1 h-4 w-4" aria-hidden />
            Add photos
            {photos.length > 0 ? (
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                {photos.length}
              </span>
            ) : null}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-1 h-4 w-4" aria-hidden />
            Take photo
          </Button>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-border p-2"
          >
            <button
              type="button"
              className="block w-full overflow-hidden rounded-md bg-border/40"
              onClick={() => setLightbox(p.thumb ?? null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt={p.caption || p.fileName}
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
            <Field label="Caption" className="mt-2">
              <input
                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs"
                disabled={readOnly}
                value={p.caption ?? ""}
                onChange={(e) => {
                  updateEvidence(p.id, { caption: e.target.value });
                }}
              />
            </Field>
            <p className="mt-1 text-[10px] text-muted">{formatBytes(p.size)}</p>
            {!readOnly ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  const report = state.reports[reportId];
                  if (
                    report &&
                    (report.status === "draft" || report.status === "returned")
                  ) {
                    const r = removeUnsubmittedEvidence(p.id);
                    if (r.ok && r.data.blobKey) {
                      void deleteFileBlob(r.data.blobKey);
                    }
                    push({
                      title: r.ok
                        ? "Photo removed"
                        : (r.errors[0]?.message ?? "Remove failed"),
                      tone: r.ok ? "success" : "danger",
                    });
                  } else {
                    const reason = window.prompt("Reason for soft-delete?");
                    if (!reason?.trim()) return;
                    const r = softDeleteEvidence(p.id, reason.trim());
                    push({
                      title: r.ok
                        ? "Photo soft-deleted"
                        : (r.errors[0]?.message ?? "Delete failed"),
                      tone: r.ok ? "success" : "danger",
                    });
                  }
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Event photo preview"
            className="max-h-[90vh] max-w-full rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}
