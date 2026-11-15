import type { AppState, ID, Template } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import { programmeToTemplate } from "./programme";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function applyDuplicateTemplate(
  draft: AppState,
  templateId: ID,
): Result<{ templateId: ID }> {
  const source = draft.templates[templateId];
  if (!source) {
    return err({ code: "TPL_MISSING", message: "Template not found" });
  }
  const id = nid("tpl");
  draft.templates[id] = {
    ...JSON.parse(JSON.stringify(source)) as Template,
    id,
    name: `${source.name} (copy)`,
    builtIn: false,
  };
  return ok({ templateId: id });
}

export function applyUpdateTemplate(
  draft: AppState,
  templateId: ID,
  patch: Partial<Template>,
): Result<Template> {
  const template = draft.templates[templateId];
  if (!template) {
    return err({ code: "TPL_MISSING", message: "Template not found" });
  }
  if (template.builtIn && patch.builtIn !== false) {
    // Allow editing built-in in demo via copy expectation — still permit content edits for presenter
  }
  Object.assign(template, patch, { id: templateId });
  return ok(template);
}

export function applyDeleteTemplate(
  draft: AppState,
  templateId: ID,
): Result<true> {
  const template = draft.templates[templateId];
  if (!template) {
    return err({ code: "TPL_MISSING", message: "Template not found" });
  }
  if (template.builtIn) {
    return err({
      code: "TPL_BUILTIN",
      message: "Built-in templates cannot be deleted. Duplicate first.",
    });
  }
  delete draft.templates[templateId];
  return ok(true);
}

export function applySaveProgrammeAsTemplate(
  draft: AppState,
  programmeId: ID,
  name: string,
): Result<{ templateId: ID }> {
  const built = programmeToTemplate(draft, programmeId, name);
  if (!built.ok) return built;
  draft.templates[built.data.id] = built.data;
  return ok({ templateId: built.data.id });
}
