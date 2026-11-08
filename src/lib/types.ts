export type StageId =
  | "foundation"
  | "positioning"
  | "ideas"
  | "strategy"
  | "draft"
  | "adapt";

export type Status = "empty" | "ready" | "approved" | "stale";

export type AgentRole =
  | "positioning"
  | "ideator"
  | "strategist"
  | "draft"
  | "x-adapt";

export type Profile = {
  business: string;
  offer: string;
  startupStage: string;
  targetBuyer: string;
  buyerPainPoints: string;
  differentiation: string;
  founderBackground: string;
  genuineExperiences: string;
  writingSamples: string;
  preferredTone: string;
  restrictions: string;
  pastedSourceMaterial: string;
};

export type Positioning = {
  positioningStatement: string;
  buyerProfile: string;
  keyPainPoints: string[];
  messagingDirection: string;
};

export type IdeaCard = {
  id: string;
  title: string;
  angle: string;
  whyItMattersToBuyer: string;
};

export type StrategyBrief = {
  coreInsight: string;
  hookDirection: string;
  argument: string;
  supportingMaterial: string;
  structure: string;
  closingQuestionOrCta: string;
  missingInformation: string[];
};

export type DraftBundle = {
  linkedinDraft: string;
  omittedClaims: string[];
  questionsForUser: string[];
  managerVerdict: "approve" | "revise" | "flag";
  managerSummary: string;
  issuesForUser: string[];
  revisionRounds: number;
};

export type XContent = {
  xPost: string;
  xThread: string[];
};

export type SavedPost = {
  id: string;
  savedAt: string;
  title: string;
  linkedinDraft: string;
  xPost?: string;
  xThread?: string[];
  sample: boolean;
};

export type AppState = {
  version: 1;
  profile: Profile;
  profileSaved: boolean;
  positioning: Positioning | null;
  positioningStatus: Status;
  ideas: IdeaCard[] | null;
  ideasStatus: Status;
  selectedIdeaId: string | null;
  ideaApproved: boolean;
  strategy: StrategyBrief | null;
  strategyStatus: Status;
  draft: DraftBundle | null;
  draftStatus: Status;
  xContent: XContent | null;
  xStatus: Status;
  library: SavedPost[];
  currentStage: StageId;
  lastSample: boolean;
};

export const STAGE_ORDER: StageId[] = [
  "foundation",
  "positioning",
  "ideas",
  "strategy",
  "draft",
  "adapt",
];
