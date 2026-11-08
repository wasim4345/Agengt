import { EMPTY_PROFILE } from "./sample-profile";
import { fingerprint } from "./fingerprint";
import type {
  AppState,
  BufferSends,
  DraftBundle,
  IdeaCard,
  Positioning,
  Profile,
  SavedPost,
  StageId,
  Status,
  StrategyBrief,
  XContent,
} from "./types";

export function emptyState(): AppState {
  return {
    version: 1,
    profile: EMPTY_PROFILE,
    profileSaved: false,
    positioning: null,
    positioningStatus: "empty",
    ideas: null,
    ideasStatus: "empty",
    selectedIdeaId: null,
    ideaApproved: false,
    strategy: null,
    strategyStatus: "empty",
    draft: null,
    draftStatus: "empty",
    bufferSends: { sample: false },
    bufferStatus: "empty",
    xContent: null,
    xStatus: "empty",
    library: [],
    currentStage: "foundation",
    lastSample: false,
  };
}

const AFTER_FOUNDATION: StageId[] = [
  "positioning",
  "ideas",
  "strategy",
  "draft",
  "buffer",
  "adapt",
];

export type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "set-stage"; stage: StageId }
  | { type: "save-profile"; profile: Profile }
  | { type: "set-positioning"; positioning: Positioning; sample: boolean }
  | { type: "edit-positioning"; positioning: Positioning }
  | { type: "approve-positioning" }
  | { type: "set-ideas"; ideas: IdeaCard[]; sample: boolean }
  | { type: "select-idea"; id: string }
  | { type: "approve-idea" }
  | { type: "set-strategy"; strategy: StrategyBrief; sample: boolean }
  | { type: "edit-strategy"; strategy: StrategyBrief }
  | { type: "approve-strategy" }
  | { type: "set-draft"; draft: DraftBundle; sample: boolean }
  | { type: "edit-draft"; linkedinDraft: string }
  | { type: "approve-draft" }
  | { type: "record-buffer-send"; sends: Partial<BufferSends>; sample: boolean }
  | { type: "set-x"; xContent: XContent; sample: boolean }
  | { type: "new-piece" };

export function canOpenStage(state: AppState, stage: StageId): boolean {
  switch (stage) {
    case "foundation":
      return true;
    case "positioning":
      return state.profileSaved;
    case "ideas":
      return state.positioningStatus === "approved";
    case "strategy":
      return state.ideaApproved && state.ideasStatus === "approved";
    case "draft":
      return state.strategyStatus === "approved";
    case "buffer":
      return state.draftStatus === "approved";
    case "adapt":
      return state.draftStatus === "approved";
    default:
      return false;
  }
}

export function selectedIdea(state: AppState): IdeaCard | null {
  if (!state.ideas || !state.selectedIdeaId) return null;
  return state.ideas.find((idea) => idea.id === state.selectedIdeaId) ?? null;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state.version === 1 ? action.state : emptyState();
    case "set-stage":
      if (!canOpenStage(state, action.stage)) return state;
      return { ...state, currentStage: action.stage };
    case "save-profile": {
      const changed =
        fingerprint(action.profile) !== fingerprint(state.profile);
      let next: AppState = {
        ...state,
        profile: action.profile,
        profileSaved: true,
        currentStage: "positioning",
      };
      if (changed && hasWork(state, "positioning")) {
        next = markStaleFrom(next, "positioning");
      }
      return next;
    }
    case "set-positioning":
      return {
        ...state,
        positioning: action.positioning,
        positioningStatus: "ready",
        lastSample: action.sample,
        currentStage: "positioning",
      };
    case "edit-positioning": {
      let next: AppState = {
        ...state,
        positioning: action.positioning,
        positioningStatus:
          state.positioningStatus === "empty" ? "ready" : "ready",
      };
      if (state.positioningStatus === "approved" && hasWork(state, "ideas")) {
        next = markStaleFrom(next, "ideas");
      }
      return next;
    }
    case "approve-positioning":
      if (!state.positioning || state.positioningStatus === "empty") return state;
      if (state.positioningStatus === "stale") return state;
      return { ...state, positioningStatus: "approved" };
    case "set-ideas":
      return {
        ...state,
        ideas: action.ideas,
        ideasStatus: "ready",
        selectedIdeaId: null,
        ideaApproved: false,
        lastSample: action.sample,
        currentStage: "ideas",
      };
    case "select-idea": {
      if (state.ideasStatus === "stale" || state.ideasStatus === "empty") {
        return state;
      }
      if (action.id === state.selectedIdeaId) return state;
      let next: AppState = {
        ...state,
        selectedIdeaId: action.id,
        ideaApproved: false,
        ideasStatus: "ready",
      };
      if (state.ideaApproved && hasWork(state, "strategy")) {
        next = markStaleFrom(next, "strategy");
      }
      return next;
    }
    case "approve-idea":
      if (!state.selectedIdeaId || state.ideasStatus === "stale") return state;
      return { ...state, ideasStatus: "approved", ideaApproved: true };
    case "set-strategy":
      return {
        ...state,
        strategy: action.strategy,
        strategyStatus: "ready",
        lastSample: action.sample,
        currentStage: "strategy",
      };
    case "edit-strategy": {
      let next: AppState = {
        ...state,
        strategy: action.strategy,
        strategyStatus: "ready",
      };
      if (state.strategyStatus === "approved" && hasWork(state, "draft")) {
        next = markStaleFrom(next, "draft");
      }
      return next;
    }
    case "approve-strategy":
      if (!state.strategy || state.strategyStatus === "empty") return state;
      if (state.strategyStatus === "stale") return state;
      return { ...state, strategyStatus: "approved" };
    case "set-draft":
      return {
        ...state,
        draft: action.draft,
        draftStatus: "ready",
        lastSample: action.sample,
        currentStage: "draft",
      };
    case "edit-draft": {
      if (!state.draft) return state;
      let next: AppState = {
        ...state,
        draft: { ...state.draft, linkedinDraft: action.linkedinDraft },
        draftStatus: "ready",
      };
      if (state.draftStatus === "approved" && hasWork(state, "buffer")) {
        next = markStaleFrom(next, "buffer");
      }
      return next;
    }
    case "approve-draft": {
      if (!state.draft || state.draftStatus === "empty") return state;
      if (state.draftStatus === "stale") return state;
      if (state.draftStatus === "approved") return state;
      const idea = selectedIdea(state);
      const saved: SavedPost = {
        id: `post-${Date.now()}`,
        savedAt: new Date().toISOString(),
        title: idea?.title || "Approved LinkedIn draft",
        linkedinDraft: state.draft.linkedinDraft,
        sample: state.lastSample,
      };
      return {
        ...state,
        draftStatus: "approved",
        bufferStatus: "empty",
        bufferSends: { sample: false },
        library: [saved, ...state.library],
        currentStage: "buffer",
      };
    }
    case "record-buffer-send": {
      if (state.draftStatus !== "approved") return state;
      const bufferSends: BufferSends = {
        ...state.bufferSends,
        ...action.sends,
        sample: action.sample,
      };
      const library = state.library.map((post, index) =>
        index === 0 ? { ...post, buffer: bufferSends } : post,
      );
      return {
        ...state,
        bufferSends,
        bufferStatus: "approved",
        library,
        currentStage: "buffer",
      };
    }
    case "set-x": {
      const library = state.library.map((post, index) =>
        index === 0
          ? {
              ...post,
              xPost: action.xContent.xPost,
              xThread: action.xContent.xThread,
            }
          : post,
      );
      return {
        ...state,
        xContent: action.xContent,
        xStatus: "approved",
        lastSample: action.sample,
        library,
        currentStage: "adapt",
      };
    }
    case "new-piece":
      return {
        ...state,
        ideas: null,
        ideasStatus: "empty",
        selectedIdeaId: null,
        ideaApproved: false,
        strategy: null,
        strategyStatus: "empty",
        draft: null,
        draftStatus: "empty",
        bufferSends: { sample: false },
        bufferStatus: "empty",
        xContent: null,
        xStatus: "empty",
        currentStage:
          state.positioningStatus === "approved" ? "ideas" : "positioning",
      };
    default:
      return state;
  }
}

function hasWork(state: AppState, stage: StageId): boolean {
  switch (stage) {
    case "positioning":
      return state.positioningStatus !== "empty";
    case "ideas":
      return state.ideasStatus !== "empty" || state.ideaApproved;
    case "strategy":
      return state.strategyStatus !== "empty";
    case "draft":
      return state.draftStatus !== "empty";
    case "buffer":
      return state.bufferStatus !== "empty";
    case "adapt":
      return state.xStatus !== "empty";
    default:
      return false;
  }
}

export function markStaleFrom(state: AppState, start: StageId): AppState {
  const startIndex = AFTER_FOUNDATION.indexOf(start);
  if (startIndex === -1) return state;
  let next = { ...state };
  for (const stage of AFTER_FOUNDATION.slice(startIndex)) {
    next = markStageStale(next, stage);
  }
  return next;
}

function markStageStale(state: AppState, stage: StageId): AppState {
  switch (stage) {
    case "positioning":
      return {
        ...state,
        positioningStatus: statusToStale(state.positioningStatus),
      };
    case "ideas":
      return {
        ...state,
        ideasStatus: statusToStale(state.ideasStatus),
        ideaApproved: false,
      };
    case "strategy":
      return {
        ...state,
        strategyStatus: statusToStale(state.strategyStatus),
      };
    case "draft":
      return { ...state, draftStatus: statusToStale(state.draftStatus) };
    case "buffer":
      return {
        ...state,
        bufferStatus: statusToStale(state.bufferStatus),
        bufferSends: { sample: false },
      };
    case "adapt":
      return { ...state, xStatus: statusToStale(state.xStatus) };
    default:
      return state;
  }
}

function statusToStale(status: Status): Status {
  return status === "empty" ? "empty" : "stale";
}

export function statusLabel(status: Status): string {
  switch (status) {
    case "empty":
      return "Not started";
    case "ready":
      return "Needs your approval";
    case "approved":
      return "Approved";
    case "stale":
      return "Needs to be generated again";
    default:
      return "";
  }
}
