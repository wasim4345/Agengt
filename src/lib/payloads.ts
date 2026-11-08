import { selectedIdea } from "./workflow";
import type { AgentRole, AppState } from "./types";

export function payloadFor(role: AgentRole, state: AppState): Record<string, unknown> {
  const idea = selectedIdea(state);
  switch (role) {
    case "positioning":
      return { profile: state.profile };
    case "ideator":
      return { profile: state.profile, positioning: state.positioning };
    case "strategist":
      return {
        profile: state.profile,
        positioning: state.positioning,
        idea,
      };
    case "draft":
      return {
        profile: state.profile,
        positioning: state.positioning,
        idea,
        strategy: state.strategy,
      };
    case "x-adapt":
      return {
        linkedinDraft: state.draft?.linkedinDraft,
        ideaTitle: idea?.title,
      };
    default:
      return {};
  }
}

export const LOADING_COPY: Record<AgentRole, string> = {
  positioning: "Turning your notes into positioning. This can take a short while.",
  ideator: "Writing ideas from the approved positioning.",
  strategist: "Building a brief for the idea you approved.",
  draft:
    "Writing the LinkedIn draft, then reviewing it. Routine edits go back to the writer automatically, at most twice.",
  "x-adapt": "Adapting the approved LinkedIn draft into an X post and thread. No new claims will be added.",
};
