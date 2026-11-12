"use client";

import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Drawer,
  Field,
  useToast,
} from "@/components/ui";
import { useOsStore } from "@/store/store";
import type { ID, Template } from "@/types/domain";

export default function TemplatesPage() {
  const templates = useOsStore((s) => Object.values(s.state.templates));
  const categories = useOsStore((s) => s.state.categories);
  const createProgrammeDraft = useOsStore((s) => s.createProgrammeDraft);
  const applyTemplate = useOsStore((s) => s.applyTemplate);
  const duplicateTemplate = useOsStore((s) => s.duplicateTemplate);
  const updateTemplate = useOsStore((s) => s.updateTemplate);
  const deleteTemplate = useOsStore((s) => s.deleteTemplate);
  const { push } = useToast();

  const [previewId, setPreviewId] = useState<ID | null>(null);
  const [editId, setEditId] = useState<ID | null>(null);
  const [editDraft, setEditDraft] = useState<Template | null>(null);

  const preview = previewId
    ? templates.find((t) => t.id === previewId)
    : null;

  function startFromTemplate(templateId: ID) {
    const created = createProgrammeDraft({});
    if (!created.ok) {
      push({
        title: created.errors[0]?.message ?? "Could not create programme",
        tone: "danger",
      });
      return;
    }
    const applied = applyTemplate(created.data.programmeId, templateId);
    if (!applied.ok) {
      push({
        title: applied.errors[0]?.message ?? "Apply failed",
        tone: "danger",
      });
      return;
    }
    window.location.href = `/programmes/new/?id=${created.data.programmeId}`;
  }

  return (
    <RoleGate allow={["programme_manager", "leadership"]}>
      <PageHeader
        title="Templates"
        description="Preview, duplicate, edit, or start a programme from a template."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge tone={t.builtIn ? "neutral" : "accent"}>
                  {t.builtIn ? "Built-in" : "Custom"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-muted">{t.description}</p>
              <p className="text-xs text-muted">
                {categories[t.categoryId]?.name ?? "—"} · {t.activities.length}{" "}
                blocks · {t.milestones.length} milestones
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPreviewId(t.id)}
                >
                  Preview
                </Button>
                <Button size="sm" onClick={() => startFromTemplate(t.id)}>
                  Use
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const r = duplicateTemplate(t.id);
                    if (r.ok) {
                      push({ title: "Template duplicated", tone: "success" });
                    }
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditId(t.id);
                    setEditDraft(structuredClone(t));
                  }}
                >
                  Edit
                </Button>
                {!t.builtIn ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!window.confirm(`Delete template “${t.name}”?`))
                        return;
                      const r = deleteTemplate(t.id);
                      push({
                        title: r.ok
                          ? "Deleted"
                          : (r.errors[0]?.message ?? "Delete failed"),
                        tone: r.ok ? "success" : "danger",
                      });
                    }}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Drawer
        open={!!preview}
        onClose={() => setPreviewId(null)}
        title={preview?.name ?? "Preview"}
      >
        {preview ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted">{preview.description}</p>
            <p className="text-xs font-semibold uppercase text-muted">
              Activity blocks
            </p>
            <ul className="flex flex-col gap-1">
              {preview.activities.map((a) => (
                <li
                  key={a.key}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted">
                    offset {a.startOffsetDays}d · duration {a.durationDays}d ·{" "}
                    {a.budgetPct}% budget · {a.priority}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase text-muted">
              Milestones
            </p>
            <ul className="text-xs text-muted">
              {preview.milestones.map((m) => (
                <li key={m.key}>
                  {m.name} (+{m.offsetDays}d) · gating {m.gatingKeys.join(", ")}
                </li>
              ))}
            </ul>
            <Button onClick={() => startFromTemplate(preview.id)}>
              Use template
            </Button>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={!!editDraft}
        onClose={() => {
          setEditId(null);
          setEditDraft(null);
        }}
        title={`Edit ${editDraft?.name ?? "template"}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditId(null);
                setEditDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editId || !editDraft) return;
                const r = updateTemplate(editId, {
                  name: editDraft.name,
                  description: editDraft.description,
                  activities: editDraft.activities,
                });
                push({
                  title: r.ok ? "Template saved" : (r.errors[0]?.message ?? "Failed"),
                  tone: r.ok ? "success" : "danger",
                });
                if (r.ok) {
                  setEditId(null);
                  setEditDraft(null);
                }
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        {editDraft ? (
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editDraft.name}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, name: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                className="h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editDraft.description}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, description: e.target.value })
                }
              />
            </Field>
            <p className="text-xs text-muted">
              Advanced structure (offsets / %) — edit activity names inline:
            </p>
            {editDraft.activities.map((a, idx) => (
              <Field key={a.key} label={`${a.key} name`}>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={a.name}
                  onChange={(e) => {
                    const activities = [...editDraft.activities];
                    activities[idx] = { ...a, name: e.target.value };
                    setEditDraft({ ...editDraft, activities });
                  }}
                />
              </Field>
            ))}
          </div>
        ) : null}
      </Drawer>
    </RoleGate>
  );
}
