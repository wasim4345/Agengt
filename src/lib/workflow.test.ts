import { describe, expect, it } from "vitest";
import { SAMPLE_PROFILE } from "./sample-profile";
import {
  canOpenStage,
  emptyState,
  reducer,
  selectedIdea,
} from "./workflow";
import type { DraftBundle, IdeaCard, Positioning, StrategyBrief } from "./types";

const positioning: Positioning = {
  positioningStatement: "We help operators say what they do.",
  buyerProfile: "A technical founder selling to businesses.",
  keyPainPoints: ["The story falls apart on sales calls."],
  messagingDirection: "Start with the buyer's stuck moment.",
};

const ideas: IdeaCard[] = [
  {
    id: "idea-1",
    title: "The demo nod",
    angle: "Buyers nod, then ask what you actually do.",
    whyItMattersToBuyer: "They need a sentence they can repeat inside their company.",
  },
  {
    id: "idea-2",
    title: "Biography trap",
    angle: "Origin stories do not help a buyer decide.",
    whyItMattersToBuyer: "They are hiring a result, not a life story.",
  },
];

const strategy: StrategyBrief = {
  coreInsight: "Clarity is a buyer problem, not a branding exercise.",
  hookDirection: "Open on the call where the buyer still cannot repeat the offer.",
  argument: "If they cannot say it internally, the deal stalls.",
  supportingMaterial: "Use only the founder note about demo nods. Do not add other stories.",
  structure: "Scene, problem, guide, close with a question.",
  closingQuestionOrCta: "What sentence does your buyer use when you are not in the room?",
  missingInformation: [],
};

const draft: DraftBundle = {
  linkedinDraft: "A buyer can nod through a demo and still not know what you do.",
  omittedClaims: [],
  questionsForUser: [],
  managerVerdict: "approve",
  managerSummary: "Clear and grounded.",
  issuesForUser: [],
  revisionRounds: 0,
};

function approvedThrough(stage: "positioning" | "ideas" | "strategy" | "draft") {
  let state = emptyState();
  state = reducer(state, { type: "save-profile", profile: SAMPLE_PROFILE });
  state = reducer(state, { type: "set-positioning", positioning, sample: true });
  state = reducer(state, { type: "approve-positioning" });
  if (stage === "positioning") return state;
  state = reducer(state, { type: "set-ideas", ideas, sample: true });
  state = reducer(state, { type: "select-idea", id: "idea-1" });
  state = reducer(state, { type: "approve-idea" });
  if (stage === "ideas") return state;
  state = reducer(state, { type: "set-strategy", strategy, sample: true });
  state = reducer(state, { type: "approve-strategy" });
  if (stage === "strategy") return state;
  state = reducer(state, { type: "set-draft", draft, sample: true });
  state = reducer(state, { type: "approve-draft" });
  return state;
}

describe("workflow approvals", () => {
  it("does not open later stages until earlier work is approved", () => {
    const fresh = emptyState();
    expect(canOpenStage(fresh, "positioning")).toBe(false);
    expect(canOpenStage(fresh, "ideas")).toBe(false);

    const saved = reducer(fresh, {
      type: "save-profile",
      profile: SAMPLE_PROFILE,
    });
    expect(canOpenStage(saved, "positioning")).toBe(true);
    expect(canOpenStage(saved, "ideas")).toBe(false);
    expect(saved.positioningStatus).not.toBe("approved");
  });

  it("does not approve an idea until the user selects one", () => {
    let state = reducer(emptyState(), {
      type: "save-profile",
      profile: SAMPLE_PROFILE,
    });
    state = reducer(state, { type: "set-positioning", positioning, sample: true });
    state = reducer(state, { type: "approve-positioning" });
    state = reducer(state, { type: "set-ideas", ideas, sample: true });
    const blocked = reducer(state, { type: "approve-idea" });
    expect(blocked.ideaApproved).toBe(false);
    expect(canOpenStage(blocked, "strategy")).toBe(false);
  });

  it("never auto-approves generated work", () => {
    let state = reducer(emptyState(), {
      type: "save-profile",
      profile: SAMPLE_PROFILE,
    });
    state = reducer(state, { type: "set-positioning", positioning, sample: true });
    expect(state.positioningStatus).toBe("ready");
    expect(canOpenStage(state, "ideas")).toBe(false);
  });

  it("marks later work stale when an approved foundation changes", () => {
    let state = approvedThrough("ideas");
    expect(state.ideaApproved).toBe(true);
    state = reducer(state, {
      type: "save-profile",
      profile: { ...SAMPLE_PROFILE, offer: "[SAMPLE] Changed offer" },
    });
    expect(state.positioningStatus).toBe("stale");
    expect(state.ideasStatus).toBe("stale");
    expect(state.ideaApproved).toBe(false);
    expect(canOpenStage(state, "strategy")).toBe(false);
    const silent = reducer(state, { type: "approve-positioning" });
    expect(silent.positioningStatus).toBe("stale");
  });

  it("marks strategy stale if the user picks a different idea", () => {
    let state = approvedThrough("strategy");
    expect(selectedIdea(state)?.id).toBe("idea-1");
    state = reducer(state, { type: "select-idea", id: "idea-2" });
    expect(state.ideaApproved).toBe(false);
    expect(state.strategyStatus).toBe("stale");
    expect(canOpenStage(state, "draft")).toBe(false);
  });

  it("saves an approved draft to the library without publishing", () => {
    const state = approvedThrough("draft");
    expect(state.draftStatus).toBe("approved");
    expect(state.library).toHaveLength(1);
    expect(state.library[0]?.linkedinDraft).toContain("nod through a demo");
    expect(canOpenStage(state, "adapt")).toBe(true);
  });

  it("does not duplicate a library entry on a second approve click", () => {
    const state = approvedThrough("draft");
    const again = reducer(state, { type: "approve-draft" });
    expect(again.library).toHaveLength(1);
  });
});
