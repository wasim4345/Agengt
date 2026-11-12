"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Drawer,
  Field,
  MoneyInput,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";
import { ActivityBuilder } from "./ActivityBuilder";
import { AllocationGrid } from "./AllocationGrid";
import { DependencyEditor } from "./DependencyEditor";
import { MilestoneEditor } from "./MilestoneEditor";
import { ValidationPanel } from "./ValidationPanel";

const STEPS = [
  "Master info",
  "Template",
  "Activities",
  "Dependencies & milestones",
  "Budget",
  "Team & client",
  "Review",
] as const;

export function ProgrammeWizard({
  programmeId,
}: {
  programmeId: ID;
}) {
  const router = useRouter();
  const state = useOsStore((s) => s.state);
  const {
    updateProgramme,
    setWizardStep,
    applyTemplate,
    submitProgramme,
    activateDemo,
  } = useOsStore();
  const { push } = useToast();
  const programme = state.programmes[programmeId];
  const [previewTpl, setPreviewTpl] = useState<ID | null>(null);
  const [ackUnallocated, setAckUnallocated] = useState(false);

  const step = programme?.wizardDraft?.step ?? 1;

  useEffect(() => {
    if (!programme) {
      push({ title: "Programme not found", tone: "danger" });
      router.push("/programmes/new/");
    }
  }, [programme, push, router]);

  const templates = useMemo(
    () => Object.values(state.templates),
    [state.templates],
  );

  if (!programme) return null;

  function go(next: number) {
    setWizardStep(programmeId, next);
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(n)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  active
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {n}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Master information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.name}
                onChange={(e) =>
                  updateProgramme(programmeId, { name: e.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.categoryId}
                onChange={(e) =>
                  updateProgramme(programmeId, { categoryId: e.target.value })
                }
              >
                {Object.values(state.categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start">
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.startDate}
                onChange={(e) =>
                  updateProgramme(programmeId, { startDate: e.target.value })
                }
              />
            </Field>
            <Field label="End">
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.endDate}
                onChange={(e) =>
                  updateProgramme(programmeId, { endDate: e.target.value })
                }
              />
            </Field>
            <MoneyInput
              label="Total budget"
              value={programme.totalBudget}
              onChange={(v) => {
                if (v == null) return;
                const r = updateProgramme(programmeId, {
                  totalBudget: v,
                  originalBudget: v,
                });
                if (!r.ok) {
                  push({
                    title: r.errors[0]?.message ?? "Budget rejected",
                    tone: "danger",
                  });
                }
              }}
            />
            <Field label="Code">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={programme.code}
                readOnly
              />
            </Field>
            <Field label="Objectives" className="md:col-span-2">
              <textarea
                className="h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.objectives}
                onChange={(e) =>
                  updateProgramme(programmeId, { objectives: e.target.value })
                }
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card
            className={
              !programme.createdFromTemplateId
                ? "ring-2 ring-primary"
                : undefined
            }
          >
            <CardHeader>
              <CardTitle className="text-base">Start blank</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted">
                Empty activity list — build from scratch.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  applyTemplate(programmeId, null);
                  push({ title: "Blank programme", tone: "success" });
                }}
              >
                Use blank
              </Button>
            </CardContent>
          </Card>
          {templates.map((t) => (
            <Card
              key={t.id}
              className={
                programme.createdFromTemplateId === t.id
                  ? "ring-2 ring-primary"
                  : undefined
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge tone={t.builtIn ? "neutral" : "accent"}>
                    {t.builtIn ? "Built-in" : "Custom"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm text-muted">{t.description}</p>
                <p className="text-xs text-muted">
                  {t.activities.length} blocks · {t.milestones.length} milestones
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewTpl(t.id)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const r = applyTemplate(programmeId, t.id);
                      if (r.ok) {
                        push({
                          title: `Applied ${t.name} (${r.data.activityCount} blocks)`,
                          tone: "success",
                        });
                      } else {
                        push({
                          title: r.errors[0]?.message ?? "Apply failed",
                          tone: "danger",
                        });
                      }
                    }}
                  >
                    Use template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {step === 3 ? <ActivityBuilder programmeId={programmeId} /> : null}

      {step === 4 ? (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Dependencies</h3>
            <DependencyEditor programmeId={programmeId} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Milestones</h3>
            <MilestoneEditor programmeId={programmeId} />
          </div>
        </div>
      ) : null}

      {step === 5 ? <AllocationGrid programmeId={programmeId} /> : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team & client</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Client">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.clientId}
                onChange={(e) =>
                  updateProgramme(programmeId, { clientId: e.target.value })
                }
              >
                {Object.values(state.clients).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manager">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={programme.managerId}
                onChange={(e) =>
                  updateProgramme(programmeId, {
                    managerId: e.target.value,
                    teamIds: Array.from(
                      new Set([e.target.value, ...programme.teamIds]),
                    ),
                  })
                }
              >
                {Object.values(state.users)
                  .filter((u) => u.role === "programme_manager")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Team members" className="md:col-span-2">
              <div className="flex flex-col gap-1">
                {Object.values(state.users)
                  .filter((u) => u.active)
                  .map((u) => {
                    const checked = programme.teamIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const teamIds = e.target.checked
                              ? [...programme.teamIds, u.id]
                              : programme.teamIds.filter((id) => id !== u.id);
                            updateProgramme(programmeId, { teamIds });
                          }}
                        />
                        {u.name} ({u.role})
                      </label>
                    );
                  })}
              </div>
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {step === 7 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>{programme.code}</strong> · {programme.name}
              </p>
              <p className="text-muted">
                {programme.startDate} → {programme.endDate} ·{" "}
                {formatINR(programme.totalBudget)}
              </p>
              <p className="text-muted">
                {
                  Object.values(state.activities).filter(
                    (a) => a.programmeId === programmeId,
                  ).length
                }{" "}
                activities ·{" "}
                {
                  Object.values(state.dependencies).filter(
                    (d) => d.programmeId === programmeId,
                  ).length
                }{" "}
                dependencies ·{" "}
                {
                  Object.values(state.milestones).filter(
                    (m) => m.programmeId === programmeId,
                  ).length
                }{" "}
                milestones
              </p>
              <label className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ackUnallocated}
                  onChange={(e) => setAckUnallocated(e.target.checked)}
                />
                Acknowledge unallocated budget (W2)
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const r = submitProgramme(programmeId, {
                      acknowledgeUnallocated: ackUnallocated,
                    });
                    if (!r.ok) {
                      push({
                        title: r.errors[0]?.message ?? "Submit blocked",
                        tone: "danger",
                      });
                      return;
                    }
                    push({
                      title: "Submitted for Leadership approval",
                      tone: "success",
                    });
                    router.push("/approvals/");
                  }}
                >
                  Submit for approval
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const r = activateDemo(programmeId, {
                      acknowledgeUnallocated: ackUnallocated,
                    });
                    if (!r.ok) {
                      push({
                        title: r.errors[0]?.message ?? "Activate blocked",
                        tone: "danger",
                      });
                      return;
                    }
                    push({
                      title: "Activated (demo) — programme Active",
                      tone: "success",
                    });
                    router.push(`/programmes/view/?id=${programmeId}`);
                  }}
                >
                  Activate (demo)
                </Button>
              </div>
            </CardContent>
          </Card>
          <ValidationPanel
            programmeId={programmeId}
            acknowledgeUnallocated={ackUnallocated}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="secondary"
          disabled={step <= 1}
          onClick={() => go(step - 1)}
        >
          Back
        </Button>
        <p className="text-xs text-muted">Draft autosaved to store</p>
        <Button disabled={step >= 7} onClick={() => go(step + 1)}>
          Next
        </Button>
      </div>

      <Drawer
        open={!!previewTpl}
        onClose={() => setPreviewTpl(null)}
        title={
          previewTpl
            ? state.templates[previewTpl]?.name ?? "Template"
            : "Preview"
        }
      >
        {previewTpl && state.templates[previewTpl] ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted">
              {state.templates[previewTpl]!.description}
            </p>
            <ul className="flex flex-col gap-1">
              {state.templates[previewTpl]!.activities.map((a) => (
                <li
                  key={a.key}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    +{a.startOffsetDays}d · {a.durationDays}d · {a.budgetPct}%
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                applyTemplate(programmeId, previewTpl);
                setPreviewTpl(null);
                push({ title: "Template applied", tone: "success" });
              }}
            >
              Use this template
            </Button>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
