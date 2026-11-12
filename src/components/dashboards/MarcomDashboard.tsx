"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { CHART } from "@/components/charts/colors";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import * as marcom from "@/selectors/marcom";
import { useOsStore } from "@/store/store";

export function MarcomDashboard() {
  const state = useOsStore((s) => s.state);
  const [programmeId, setProgrammeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const upcoming = marcom.upcoming(state);
  const conducted = marcom.eventsConducted(state);
  const startups = marcom.startups(state);
  const achievements = marcom.achievements(state);
  const media = marcom.media(state);
  const milestones = marcom.milestones(state, programmeId || undefined);

  const bootcamps = Object.values(state.activities).filter(
    (a) =>
      a.name.toLowerCase().includes("bootcamp") && a.status === "completed",
  );

  const filteredUpcoming = useMemo(
    () =>
      upcoming.filter((a) => {
        if (programmeId && a.programmeId !== programmeId) return false;
        if (from && a.plannedStart < from) return false;
        if (to && a.plannedEnd > to) return false;
        return true;
      }),
    [upcoming, programmeId, from, to],
  );

  const filteredMedia = useMemo(
    () =>
      media.filter((m) => !programmeId || m.programmeId === programmeId),
    [media, programmeId],
  );

  const startupChart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of startups) {
      counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [startups]);

  return (
    <>
      <PageHeader
        title="MarCom dashboard"
        description={`Approved media, events, and startup wins · Data as of ${formatDate(state.meta.demoDate)}`}
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <Field label="Programme" className="min-w-[12rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
            >
              <option value="">All programmes</option>
              {Object.values(state.programmes).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From" className="min-w-[9rem]">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To" className="min-w-[9rem]">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted">Upcoming events</p>
            <CardTitle className="text-lg">{filteredUpcoming.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted">Events conducted</p>
            <CardTitle className="text-lg">{conducted.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted">Bootcamps completed</p>
            <CardTitle className="text-lg">{bootcamps.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted">Visible startups</p>
            <CardTitle className="text-lg">{startups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Startup participation"
          empty={startupChart.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={startupChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART.info} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming activities / events</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {filteredUpcoming.length === 0 ? (
              <EmptyState
                title="No upcoming events"
                description="Adjust filters or wait for scheduled outreach/events."
              />
            ) : (
              filteredUpcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between gap-2 text-sm"
                >
                  <span>{a.name}</span>
                  <Badge tone="neutral">{a.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Startup wins</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {achievements.length === 0 ? (
              <EmptyState
                title="No approved achievements"
                description="MarCom-approved wins will feed here."
              />
            ) : (
              achievements.map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    {a.startupName} · {formatDate(a.date)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {milestones.length === 0 ? (
              <EmptyState
                title="No milestones"
                description="Select a programme or clear filters."
              />
            ) : (
              milestones.slice(0, 10).map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between gap-2 text-sm"
                >
                  <span>{m.name}</span>
                  <span className="text-xs text-muted">
                    {formatDate(m.targetDate)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Approved photos & media ({filteredMedia.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMedia.length === 0 ? (
            <EmptyState
              title="No approved media"
              description="Assets approved for MarCom appear here."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredMedia.map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {m.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumb}
                      alt={m.caption || m.fileName}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-background text-xs text-muted">
                      {m.type}
                    </div>
                  )}
                  <p className="truncate px-2 py-1 text-xs">
                    {m.caption || m.fileName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
