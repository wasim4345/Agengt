"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function LifecyclePanel({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const programme = state.programmes[programmeId];
  const requestHold = useOsStore((s) => s.requestHold);
  const requestResume = useOsStore((s) => s.requestResume);
  const requestExtension = useOsStore((s) => s.requestExtension);
  const requestCancellation = useOsStore((s) => s.requestCancellation);
  const requestClosure = useOsStore((s) => s.requestClosure);
  const replaceManager = useOsStore((s) => s.replaceManager);
  const markCompleted = useOsStore((s) => s.markProgrammeCompletedIfReady);
  const checkClosure = useOsStore((s) => s.checkClosure);
  const { push } = useToast();

  const [reason, setReason] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [managerId, setManagerId] = useState("");

  if (!programme) return null;

  const managers = Object.values(state.users).filter(
    (u) => u.role === "programme_manager",
  );

  function toastResult(ok: boolean, success: string, errors?: { message: string }[]) {
    push({
      title: ok ? success : (errors?.[0]?.message ?? "Failed"),
      tone: ok ? "success" : "danger",
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lifecycle & settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Status: <strong>{programme.status}</strong>
          {programme.baselineEndDate
            ? ` · Baseline end ${formatDate(programme.baselineEndDate)}`
            : ""}
          {programme.statusReason ? ` · ${programme.statusReason}` : ""}
        </p>

        <Field label="Reason / remarks">
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required for hold / cancel / extension"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {programme.status === "active" &&
          (role === "programme_manager" || role === "leadership") ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const r = requestHold(programmeId, reason);
                toastResult(r.ok, "Hold requested", r.ok ? undefined : r.errors);
              }}
            >
              Request hold
            </Button>
          ) : null}

          {programme.status === "on_hold" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const r = requestResume(programmeId, reason || "Resume");
                toastResult(r.ok, "Resume requested", r.ok ? undefined : r.errors);
              }}
            >
              Request resume
            </Button>
          ) : null}

          {(programme.status === "active" || programme.status === "on_hold") && (
            <>
              <Field label="New end date" className="min-w-[10rem]">
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </Field>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const r = requestExtension(programmeId, newEnd, reason);
                  toastResult(
                    r.ok,
                    "Extension requested",
                    r.ok ? undefined : r.errors,
                  );
                }}
              >
                Request extension
              </Button>
            </>
          )}

          {(role === "leadership" || role === "programme_manager") &&
          ["draft", "pending_approval", "active", "on_hold"].includes(
            programme.status,
          ) ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                const r = requestCancellation(programmeId, reason);
                toastResult(
                  r.ok,
                  role === "leadership" ? "Programme cancelled" : "Cancellation requested",
                  r.ok ? undefined : r.errors,
                );
              }}
            >
              Cancel programme
            </Button>
          ) : null}

          {(programme.status === "active" || programme.status === "completed") &&
          (role === "programme_manager" || role === "leadership") ? (
            <Button
              size="sm"
              onClick={() => {
                const ready = checkClosure(programmeId);
                if (ready.ok && !ready.data.ready) {
                  push({
                    title: `Closure blocked: ${ready.data.issues.join("; ")}`,
                    tone: "danger",
                  });
                  return;
                }
                const r = requestClosure(programmeId, reason || undefined);
                toastResult(
                  r.ok,
                  "Closure requested",
                  r.ok ? undefined : r.errors,
                );
              }}
            >
              Request closure
            </Button>
          ) : null}

          {programme.status === "active" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const r = markCompleted(programmeId);
                toastResult(
                  r.ok,
                  r.ok && r.data.completed
                    ? "Programme marked completed"
                    : "Not all activities terminal yet",
                  r.ok ? undefined : r.errors,
                );
              }}
            >
              Check completion
            </Button>
          ) : null}
        </div>

        {(role === "leadership" || role === "programme_manager") && (
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <Field label="Replace manager" className="min-w-[12rem]">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">Select manager</option>
                {managers
                  .filter((m) => m.id !== programme.managerId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const r = replaceManager(programmeId, managerId);
                toastResult(
                  r.ok,
                  "Manager replaced (past reports keep original author)",
                  r.ok ? undefined : r.errors,
                );
              }}
            >
              Replace
            </Button>
            <p className="w-full text-xs text-muted">
              Current: {state.users[programme.managerId]?.name ?? programme.managerId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
