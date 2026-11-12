"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Modal,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import * as client from "@/selectors/client";
import { useOsStore } from "@/store/store";

export function ClientDashboard() {
  const state = useOsStore((s) => s.state);
  const overview = client.overview(state);
  const milestones = client.milestones(state);
  const reports = client.releasedReports(state);
  const photos = client.photos(state);
  const outputs = client.keyOutputs(state);
  const completed = client.completedActivities(state);
  const upcoming = client.upcoming(state);
  const [lightbox, setLightbox] = useState<(typeof photos)[0] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Programme overview"
        description={`Client-visible programmes · Data as of ${formatDate(state.meta.demoDate)}. Money and internal remarks are omitted unless shared.`}
      />

      {overview.length === 0 ? (
        <EmptyState
          title="No programmes"
          description="No client programmes are linked to this persona."
        />
      ) : (
        <div className="mb-4 flex flex-col gap-4">
          {overview.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {p.code} · {p.name}
                  </CardTitle>
                  <Badge tone="on-track">{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="text-muted">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)} ·{" "}
                  {Math.round(p.progress)}% complete
                </p>
                <p>{p.objectives}</p>
                <ul className="list-disc pl-5 text-muted">
                  {p.keyDeliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                {"budgetSummary" in p && p.budgetSummary ? (
                  <p className="text-xs text-muted">
                    Shared budget summary: utilisation{" "}
                    {p.budgetSummary.reportedUtilisation == null
                      ? "n/a"
                      : `${Math.round(p.budgetSummary.reportedUtilisation * 100)}%`}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {milestones.length === 0 ? (
              <EmptyState
                title="No milestones"
                description="Client-visible milestones will appear here."
              />
            ) : (
              milestones.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    <span className="mr-2 text-xs text-muted">{i + 1}.</span>
                    {m.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {formatDate(m.targetDate)}
                    </span>
                    <Badge
                      tone={
                        m.health === "achieved" ? "on-track" : "neutral"
                      }
                    >
                      {m.health}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approved reports</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {reports.length === 0 ? (
              <EmptyState
                title="No released reports"
                description="Only Leadership-released reports are visible."
              />
            ) : (
              reports.map((r) => (
                <div key={r.id} className="border-b border-border py-2 last:border-0">
                  <button
                    type="button"
                    className="w-full text-left text-sm font-medium"
                    onClick={() =>
                      setExpanded(expanded === r.id ? null : r.id)
                    }
                  >
                    {state.activities[r.activityId]?.name ?? r.activityId} ·{" "}
                    {r.type}
                  </button>
                  <p className="text-xs text-muted">
                    {r.releasedAt
                      ? formatDate(r.releasedAt.slice(0, 10))
                      : ""}
                  </p>
                  <p className="text-sm text-muted">{r.clientSummary}</p>
                  {expanded === r.id ? (
                    <p className="mt-1 text-sm">{r.keyOutcomes}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completed activities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {completed.length === 0 ? (
              <EmptyState
                title="None completed yet"
                description="Completed activities will list here."
              />
            ) : (
              completed.slice(0, 10).map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(a.plannedEnd)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <EmptyState
                title="Nothing upcoming"
                description="Upcoming activities will list here."
              />
            ) : (
              upcoming.slice(0, 10).map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(a.plannedStart)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Key outputs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {outputs.length === 0 ? (
            <EmptyState
              title="No key outputs"
              description="Outcomes from released reports appear here."
            />
          ) : (
            outputs.map((o) => (
              <p key={o.reportId} className="text-sm">
                {o.keyOutcomes}
                {o.participants != null
                  ? ` · ${o.participants} participants`
                  : ""}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Approved photo gallery ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <EmptyState
              title="No approved photos"
              description="Client-approved photographs will appear here."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border bg-background text-left"
                  onClick={() => setLightbox(p)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      p.thumb ||
                      "data:image/svg+xml," +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect fill="#e5e7eb" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-size="12">Photo</text></svg>`,
                        )
                    }
                    alt={p.caption || p.fileName}
                    className="h-28 w-full object-cover"
                  />
                  <p className="truncate px-2 py-1 text-xs text-muted">
                    {p.caption || p.fileName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        title={lightbox?.caption || lightbox?.fileName || "Photo"}
      >
        {lightbox ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              lightbox.thumb ||
              "data:image/svg+xml," +
                encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect fill="#e5e7eb" width="100%" height="100%"/></svg>`,
                )
            }
            alt={lightbox.caption || lightbox.fileName}
            className="max-h-[70vh] w-full object-contain"
          />
        ) : null}
      </Modal>
    </>
  );
}
