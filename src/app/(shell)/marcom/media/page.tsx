"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { useOsStore } from "@/store/store";

export default function MarcomMediaPage() {
  const media = useOsStore((s) =>
    Object.values(s.state.evidence).filter(
      (e) => e.marcomApproved && !e.deleted,
    ),
  );

  return (
    <RoleGate allow={["marcom"]}>
      <PageHeader
        title="Media library"
        description="MarCom-approved evidence assets stored locally in this browser."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {media.map((m) => (
          <figure
            key={m.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {m.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.thumb}
                alt={m.caption ?? m.fileName}
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center bg-background text-xs text-muted">
                {m.mime}
              </div>
            )}
            <figcaption className="px-2 py-1.5 text-xs text-muted">
              {m.fileName}
            </figcaption>
          </figure>
        ))}
      </div>
    </RoleGate>
  );
}
