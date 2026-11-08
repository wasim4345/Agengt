import { LIMITS } from "@/lib/limits";
import type {
  DraftBundle,
  IdeaCard,
  Positioning,
  StrategyBrief,
  XContent,
} from "@/lib/types";
import { asNonEmptyString, asStringArray, parseJsonObject } from "../json";

export function parsePositioning(raw: string): Positioning {
  const record = parseJsonObject(raw);
  const keyPainPoints = asStringArray(record.keyPainPoints).slice(0, 6);
  if (keyPainPoints.length === 0) {
    throw new Error("Positioning came back without pain points. Try again.");
  }
  return {
    positioningStatement: clip(
      asNonEmptyString(record.positioningStatement, "positioning statement"),
      LIMITS.medium,
    ),
    buyerProfile: clip(
      asNonEmptyString(record.buyerProfile, "buyer profile"),
      LIMITS.medium,
    ),
    keyPainPoints,
    messagingDirection: clip(
      asNonEmptyString(record.messagingDirection, "messaging direction"),
      LIMITS.medium,
    ),
  };
}

export function parseIdeas(raw: string): IdeaCard[] {
  const record = parseJsonObject(raw);
  if (!Array.isArray(record.ideas)) {
    throw new Error("Ideas came back in the wrong shape. Try again.");
  }
  const ideas = record.ideas
    .slice(0, LIMITS.ideas)
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error("One idea was unreadable. Try again.");
      }
      const idea = item as Record<string, unknown>;
      return {
        id: clip(asNonEmptyString(idea.id ?? `idea-${index + 1}`, "idea id"), 40),
        title: clip(asNonEmptyString(idea.title, "idea title"), LIMITS.short),
        angle: clip(asNonEmptyString(idea.angle, "idea angle"), LIMITS.medium),
        whyItMattersToBuyer: clip(
          asNonEmptyString(idea.whyItMattersToBuyer, "why it matters"),
          LIMITS.medium,
        ),
      };
    });
  if (ideas.length === 0) {
    throw new Error("No ideas came back. Try again.");
  }
  return ideas;
}

export function parseStrategy(raw: string): StrategyBrief {
  const record = parseJsonObject(raw);
  return {
    coreInsight: clip(asNonEmptyString(record.coreInsight, "core insight"), LIMITS.medium),
    hookDirection: clip(
      asNonEmptyString(record.hookDirection, "hook direction"),
      LIMITS.medium,
    ),
    argument: clip(asNonEmptyString(record.argument, "argument"), LIMITS.medium),
    supportingMaterial: clip(
      asNonEmptyString(record.supportingMaterial, "supporting material"),
      LIMITS.medium,
    ),
    structure: clip(asNonEmptyString(record.structure, "structure"), LIMITS.medium),
    closingQuestionOrCta: clip(
      asNonEmptyString(record.closingQuestionOrCta, "closing"),
      LIMITS.medium,
    ),
    missingInformation: asStringArray(record.missingInformation).slice(0, 8),
  };
}

export function parseWriter(raw: string): {
  linkedinDraft: string;
  omittedClaims: string[];
  questionsForUser: string[];
} {
  const record = parseJsonObject(raw);
  return {
    linkedinDraft: clip(
      asNonEmptyString(record.linkedinDraft, "LinkedIn draft"),
      LIMITS.draft,
    ),
    omittedClaims: asStringArray(record.omittedClaims).slice(0, 8),
    questionsForUser: asStringArray(record.questionsForUser).slice(0, 8),
  };
}

export function parseManager(raw: string): {
  verdict: "approve" | "revise" | "flag";
  reviewedDraft: string;
  corrections: string;
  issuesForUser: string[];
  summary: string;
} {
  const record = parseJsonObject(raw);
  const verdictRaw = typeof record.verdict === "string" ? record.verdict : "";
  const verdict =
    verdictRaw === "revise" || verdictRaw === "flag" || verdictRaw === "approve"
      ? verdictRaw
      : "flag";
  const reviewedDraft =
    typeof record.reviewedDraft === "string" && record.reviewedDraft.trim()
      ? clip(record.reviewedDraft.trim(), LIMITS.draft)
      : "";
  return {
    verdict,
    reviewedDraft,
    corrections:
      typeof record.corrections === "string" ? record.corrections.trim() : "",
    issuesForUser: asStringArray(record.issuesForUser).slice(0, 8),
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? clip(record.summary.trim(), LIMITS.medium)
        : "Review finished.",
  };
}

export function parseX(raw: string): XContent {
  const record = parseJsonObject(raw);
  const thread = asStringArray(record.xThread).slice(0, 8);
  if (thread.length === 0) {
    throw new Error("The X thread came back empty. Try again.");
  }
  return {
    xPost: clip(asNonEmptyString(record.xPost, "X post"), LIMITS.medium),
    xThread: thread.map((item) => clip(item, LIMITS.medium)),
  };
}

export function toDraftBundle(
  writer: ReturnType<typeof parseWriter>,
  manager: ReturnType<typeof parseManager>,
  revisionRounds: number,
): DraftBundle {
  const linkedinDraft =
    manager.reviewedDraft || writer.linkedinDraft;
  return {
    linkedinDraft: clip(linkedinDraft, LIMITS.draft),
    omittedClaims: writer.omittedClaims,
    questionsForUser: writer.questionsForUser,
    managerVerdict: manager.verdict,
    managerSummary: manager.summary,
    issuesForUser: manager.issuesForUser,
    revisionRounds,
  };
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}
