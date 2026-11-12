"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOsStore } from "@/store/store";

export default function ClientGalleryPage() {
  const state = useOsStore((s) => s.state);
  const clientId = state.users[state.meta.currentUserId]?.clientId;
  const programmeIds = new Set(
    Object.values(state.programmes)
      .filter((p) => p.clientId === clientId)
      .map((p) => p.id),
  );
  const photos = Object.values(state.evidence).filter(
    (e) =>
      e.type === "photograph" &&
      e.clientApproved &&
      !e.deleted &&
      programmeIds.has(e.programmeId),
  );

  return (
    <RoleGate allow={["client"]}>
      <PageHeader
        title="Gallery"
        description="Approved photographs for your programmes."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {photos.map((p) => (
          <figure
            key={p.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumb}
              alt={p.caption ?? p.fileName}
              className="h-28 w-full object-cover"
            />
            <figcaption className="px-2 py-1.5 text-xs text-muted">
              {p.caption ?? p.fileName}
            </figcaption>
          </figure>
        ))}
      </div>
    </RoleGate>
  );
}
