"use client";

import { useMemo, useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { Achievement, ProgrammeStartup } from "@/types/domain";

const STATUSES: ProgrammeStartup["status"][] = [
  "applied",
  "shortlisted",
  "selected",
  "onboarded",
  "graduated",
  "rejected",
  "withdrawn",
];

const ACH_TYPES: Achievement["type"][] = [
  "funding",
  "award",
  "pilot",
  "customer",
  "media",
  "other",
];

export default function StartupsPage() {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const upsertStartup = useOsStore((s) => s.upsertStartup);
  const setProgrammeStartup = useOsStore((s) => s.setProgrammeStartup);
  const upsertAchievement = useOsStore((s) => s.upsertAchievement);
  const setAchievementApproval = useOsStore((s) => s.setAchievementApproval);
  const deleteAchievement = useOsStore((s) => s.deleteAchievement);
  const { push } = useToast();

  const canEdit = role === "leadership" || role === "programme_manager";
  const marcomRead = role === "marcom";

  const myProgrammeIds = useMemo(() => {
    if (role !== "programme_manager") return null;
    return new Set(
      Object.values(state.programmes)
        .filter((p) => p.managerId === state.meta.currentUserId)
        .map((p) => p.id),
    );
  }, [role, state.programmes, state.meta.currentUserId]);

  const rows = state.programmeStartups
    .filter((ps) => {
      if (marcomRead) {
        return ["selected", "onboarded", "graduated"].includes(ps.status);
      }
      if (myProgrammeIds) return myProgrammeIds.has(ps.programmeId);
      return true;
    })
    .map((ps) => ({
      ...ps,
      startup: state.startups[ps.startupId],
      programme: state.programmes[ps.programmeId],
    }));

  const achievements = Object.values(state.achievements).filter((a) => {
    if (marcomRead) return a.marcomApproved;
    if (myProgrammeIds) return myProgrammeIds.has(a.programmeId);
    return true;
  });

  const [startupForm, setStartupForm] = useState({
    name: "",
    sector: "",
  });
  const [link, setLink] = useState({
    programmeId: Object.keys(state.programmes)[0] ?? "",
    startupId: Object.keys(state.startups)[0] ?? "",
    status: "selected" as ProgrammeStartup["status"],
  });
  const [achForm, setAchForm] = useState({
    title: "",
    description: "",
    startupId: Object.keys(state.startups)[0] ?? "",
    programmeId: Object.keys(state.programmes)[0] ?? "",
    type: "award" as Achievement["type"],
    date: state.meta.demoDate,
  });

  return (
    <RoleGate allow={["marcom", "leadership", "programme_manager"]}>
      <PageHeader
        title="Startups & achievements"
        description="Participation and wins. MarCom sees selected-or-later and approved achievements only."
      />

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Participation</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title="No startups"
              description="No participation rows for this role."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Startup</TH>
                  <TH>Sector</TH>
                  <TH>Programme</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={`${row.programmeId}-${row.startupId}`}>
                    <TD>{row.startup?.name ?? row.startupId}</TD>
                    <TD className="text-xs text-muted">
                      {row.startup?.sector}
                    </TD>
                    <TD className="text-xs">{row.programme?.code}</TD>
                    <TD>
                      {canEdit ? (
                        <select
                          className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                          value={row.status}
                          onChange={(e) => {
                            const r = setProgrammeStartup({
                              programmeId: row.programmeId,
                              startupId: row.startupId,
                              status: e.target
                                .value as ProgrammeStartup["status"],
                            });
                            push({
                              title: r.ok
                                ? "Status updated"
                                : (r.errors[0]?.message ?? "Failed"),
                              tone: r.ok ? "success" : "danger",
                            });
                          }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone="neutral">{row.status}</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add startup</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Field label="Name">
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={startupForm.name}
                  onChange={(e) =>
                    setStartupForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Sector">
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={startupForm.sector}
                  onChange={(e) =>
                    setStartupForm((f) => ({ ...f, sector: e.target.value }))
                  }
                />
              </Field>
              <Button
                size="sm"
                onClick={() => {
                  const r = upsertStartup(startupForm);
                  push({
                    title: r.ok
                      ? "Startup added"
                      : (r.errors[0]?.message ?? "Failed"),
                    tone: r.ok ? "success" : "danger",
                  });
                  if (r.ok) {
                    setLink((l) => ({ ...l, startupId: r.data.startupId }));
                    setStartupForm({ name: "", sector: "" });
                  }
                }}
              >
                Save startup
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Link to programme</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Field label="Programme">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={link.programmeId}
                  onChange={(e) =>
                    setLink((l) => ({ ...l, programmeId: e.target.value }))
                  }
                >
                  {Object.values(state.programmes).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Startup">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={link.startupId}
                  onChange={(e) =>
                    setLink((l) => ({ ...l, startupId: e.target.value }))
                  }
                >
                  {Object.values(state.startups).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={link.status}
                  onChange={(e) =>
                    setLink((l) => ({
                      ...l,
                      status: e.target.value as ProgrammeStartup["status"],
                    }))
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                size="sm"
                onClick={() => {
                  const r = setProgrammeStartup(link);
                  push({
                    title: r.ok
                      ? "Participation saved"
                      : (r.errors[0]?.message ?? "Failed"),
                    tone: r.ok ? "success" : "danger",
                  });
                }}
              >
                Save link
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Achievements ({achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {achievements.length === 0 ? (
            <EmptyState
              title="No achievements"
              description="Approved wins will appear for MarCom."
            />
          ) : (
            achievements.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-border py-2 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    {state.startups[a.startupId]?.name} ·{" "}
                    {state.programmes[a.programmeId]?.code} ·{" "}
                    {formatDate(a.date)} · {a.type}
                  </p>
                  <p className="text-sm text-muted">{a.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={a.marcomApproved ? "on-track" : "neutral"}>
                    MarCom {a.marcomApproved ? "on" : "off"}
                  </Badge>
                  <Badge tone={a.clientApproved ? "on-track" : "neutral"}>
                    Client {a.clientApproved ? "on" : "off"}
                  </Badge>
                  {canEdit ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAchievementApproval(
                            a.id,
                            "marcom",
                            !a.marcomApproved,
                          )
                        }
                      >
                        Toggle MarCom
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAchievementApproval(
                            a.id,
                            "client",
                            !a.clientApproved,
                          )
                        }
                      >
                        Toggle Client
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteAchievement(a.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add achievement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={achForm.title}
                onChange={(e) =>
                  setAchForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </Field>
            <Field label="Type">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={achForm.type}
                onChange={(e) =>
                  setAchForm((f) => ({
                    ...f,
                    type: e.target.value as Achievement["type"],
                  }))
                }
              >
                {ACH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Startup">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={achForm.startupId}
                onChange={(e) =>
                  setAchForm((f) => ({ ...f, startupId: e.target.value }))
                }
              >
                {Object.values(state.startups).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Programme">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={achForm.programmeId}
                onChange={(e) =>
                  setAchForm((f) => ({ ...f, programmeId: e.target.value }))
                }
              >
                {Object.values(state.programmes).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={achForm.date}
                onChange={(e) =>
                  setAchForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={2}
                value={achForm.description}
                onChange={(e) =>
                  setAchForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </Field>
            <Button
              size="sm"
              onClick={() => {
                const r = upsertAchievement(achForm);
                push({
                  title: r.ok
                    ? "Achievement saved"
                    : (r.errors[0]?.message ?? "Failed"),
                  tone: r.ok ? "success" : "danger",
                });
                if (r.ok) setAchForm((f) => ({ ...f, title: "", description: "" }));
              }}
            >
              Save achievement
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </RoleGate>
  );
}
