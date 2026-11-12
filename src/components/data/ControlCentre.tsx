"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, addMonths, format, parseISO } from "date-fns";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  useToast,
} from "@/components/ui";
import { useOsStore } from "@/store/store";
import { IntegrityPanel } from "./IntegrityPanel";
import type { Role, ScenarioName } from "@/types/domain";

const SCENARIOS: { name: ScenarioName; label: string }[] = [
  { name: "default", label: "Default seed" },
  { name: "healthy", label: "Healthy portfolio" },
  { name: "troubled", label: "Troubled portfolio" },
  { name: "empty", label: "Empty" },
];

const QUICK = [
  { name: "make_delayed" as const, label: "Make activity delayed" },
  { name: "add_overspend" as const, label: "Add overspend" },
  { name: "add_pending_x5" as const, label: "Add pending ×5" },
  { name: "complete_next" as const, label: "Complete next activity" },
  { name: "release_latest" as const, label: "Release latest report" },
  { name: "add_startup_win" as const, label: "Add startup win" },
];

const ROLES: Role[] = [
  "leadership",
  "programme_manager",
  "finance",
  "marcom",
  "client",
];

export function ControlCentre() {
  const state = useOsStore((s) => s.state);
  const snapshots = useOsStore((s) => s.snapshots);
  const quotaError = useOsStore((s) => s.quotaError);
  const {
    resetToSeed,
    loadScenario,
    clearAll,
    saveSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    exportJSON,
    importJSON,
    setDemoDate,
    setRole,
    setUser,
    setAllowRuleBreaking,
    updateSettings,
    runQuickScenario,
  } = useOsStore();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [snapshotName, setSnapshotName] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [importText, setImportText] = useState("");

  const users = useMemo(
    () => Object.values(state.users).filter((u) => u.active),
    [state.users],
  );

  let storageLabel = "Storage unavailable";
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem("iimcip-os:v1:state")
        : null;
    const bytes = raw ? new Blob([raw]).size : 0;
    storageLabel = `${(bytes / 1024).toFixed(1)} KB localStorage · ${Object.keys(state.programmes).length} programmes`;
  } catch {
    storageLabel = "Storage unavailable";
  }

  function toastResult(ok: boolean, title: string, detail?: string) {
    push({
      title: ok ? title : detail ?? `${title} failed`,
      tone: ok ? "success" : "danger",
    });
  }

  function shiftDemo(days: number) {
    const next = format(addDays(parseISO(state.meta.demoDate), days), "yyyy-MM-dd");
    const r = setDemoDate(next);
    toastResult(r.ok, `Demo date → ${next}`, r.ok ? undefined : r.errors[0]?.message);
  }

  function shiftDemoMonths(months: number) {
    const next = format(
      addMonths(parseISO(state.meta.demoDate), months),
      "yyyy-MM-dd",
    );
    const r = setDemoDate(next);
    toastResult(r.ok, `Demo date → ${next}`, r.ok ? undefined : r.errors[0]?.message);
  }

  function doExport() {
    const r = exportJSON();
    if (!r.ok) {
      toastResult(false, "Export", r.errors[0]?.message);
      return;
    }
    const blob = new Blob([r.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iimcip-os-export-${state.meta.demoDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push({ title: "Exported JSON", tone: "success" });
  }

  function doImport(json: string) {
    const r = importJSON(json);
    toastResult(r.ok, "Imported JSON", r.ok ? undefined : r.errors[0]?.message);
    if (r.ok) setImportText("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demo clock</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Today">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={state.meta.demoDate}
              onChange={(e) => {
                const r = setDemoDate(e.target.value);
                toastResult(r.ok, "Demo date updated", r.ok ? undefined : r.errors[0]?.message);
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => shiftDemo(-7)}>
              −1 week
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftDemo(7)}>
              +1 week
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftDemoMonths(-1)}>
              −1 month
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftDemoMonths(1)}>
              +1 month
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Role / persona</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Role">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={state.meta.currentRole}
              onChange={(e) => {
                const r = setRole(e.target.value as Role);
                toastResult(r.ok, "Role updated", r.ok ? undefined : r.errors[0]?.message);
              }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="User">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={state.meta.currentUserId}
              onChange={(e) => {
                const r = setUser(e.target.value);
                toastResult(r.ok, "User updated", r.ok ? undefined : r.errors[0]?.message);
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.meta.allowRuleBreaking}
              onChange={(e) => {
                const r = setAllowRuleBreaking(e.target.checked);
                toastResult(
                  r.ok,
                  e.target.checked ? "Rule-breaking ON" : "Rule-breaking OFF",
                  r.ok ? undefined : r.errors[0]?.message,
                );
              }}
            />
            Allow rule-breaking (demo)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <Button
                key={s.name}
                size="sm"
                variant="secondary"
                onClick={() => {
                  const r = loadScenario(s.name);
                  toastResult(r.ok, `Loaded ${s.label}`, r.ok ? undefined : r.errors[0]?.message);
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <Button
                key={q.name}
                size="sm"
                variant="ghost"
                onClick={() => {
                  const r = runQuickScenario(q.name);
                  toastResult(
                    r.ok,
                    r.ok ? r.data : q.label,
                    r.ok ? undefined : r.errors[0]?.message,
                  );
                }}
              >
                {q.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Snapshots</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Snapshot name"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                const name = snapshotName.trim() || `Snap ${snapshots.length + 1}`;
                const r = saveSnapshot(name);
                toastResult(r.ok, `Saved “${name}”`, r.ok ? undefined : r.errors[0]?.message);
                if (r.ok) setSnapshotName("");
              }}
            >
              Save
            </Button>
          </div>
          {snapshots.length === 0 ? (
            <p className="text-xs text-muted">No snapshots yet (max 10).</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {snapshots.map((snap) => (
                <li
                  key={snap.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate">{snap.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const r = restoreSnapshot(snap.id);
                        toastResult(
                          r.ok,
                          `Restored “${snap.name}”`,
                          r.ok ? undefined : r.errors[0]?.message,
                        );
                      }}
                    >
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        deleteSnapshot(snap.id);
                        push({ title: "Snapshot deleted", tone: "success" });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reset / clear</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label='Type RESET to confirm reset'>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={resetConfirm !== "RESET"}
              onClick={() => {
                const r = resetToSeed();
                toastResult(r.ok, "Reset to seed", r.ok ? undefined : r.errors[0]?.message);
                setResetConfirm("");
              }}
            >
              Reset demo data
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!window.confirm("Clear all business data?")) return;
                const r = clearAll();
                toastResult(r.ok, "Cleared all", r.ok ? undefined : r.errors[0]?.message);
              }}
            >
              Clear all
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Export / import</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={doExport}>
              Export JSON
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              Import file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                doImport(text);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            className="h-28 w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
            placeholder="Paste JSON to import…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!importText.trim()}
            onClick={() => doImport(importText)}
          >
            Import pasted JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {(
            [
              ["warnPct", "Warn %"],
              ["reallocLeadershipPct", "Realloc %"],
              ["reallocLeadershipAmount", "Realloc ₹"],
              ["upcomingDays", "Upcoming days"],
              ["staleReportDays", "Stale report days"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={state.meta.settings[key]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (Number.isNaN(num)) return;
                  const r = updateSettings({ [key]: num });
                  if (!r.ok) {
                    push({
                      title: r.errors[0]?.message ?? "Settings update failed",
                      tone: "danger",
                    });
                  }
                }}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      <IntegrityPanel />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="neutral">{storageLabel}</Badge>
        {quotaError ? <Badge tone="delayed">Quota error</Badge> : null}
        <span>
          Seed {state.meta.seedVersion} · schema v{state.schemaVersion}
        </span>
      </div>
    </div>
  );
}
