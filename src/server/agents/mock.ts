import type {
  AgentRole,
  DraftBundle,
  IdeaCard,
  Positioning,
  StrategyBrief,
  XContent,
} from "@/lib/types";

export function mockForRole(role: AgentRole): unknown {
  switch (role) {
    case "positioning":
      return mockPositioning();
    case "ideator":
      return { ideas: mockIdeas() };
    case "strategist":
      return mockStrategy();
    case "draft":
      return mockDraft();
    case "x-adapt":
      return mockX();
    default:
      throw new Error("Unknown step.");
  }
}

export function mockPositioning(): Positioning {
  return {
    positioningStatement:
      "[SAMPLE] DTW helps a technical founder turn a messy offer into a sentence a buyer can repeat inside their own company.",
    buyerProfile:
      "[SAMPLE] A founder or operator selling a complex B2B offer who can feel the room nod and still not hear a clear 'this is what you do'.",
    keyPainPoints: [
      "[SAMPLE] The buyer hears features, not the job they need done.",
      "[SAMPLE] Founder origin stories do not help the buyer decide.",
    ],
    messagingDirection:
      "[SAMPLE] Open on the buyer's stuck moment. The founder is the guide, not the hero. Use only experiences the founder has written down.",
  };
}

export function mockIdeas(): IdeaCard[] {
  return [
    {
      id: "sample-1",
      title: "[SAMPLE] The demo nod",
      angle:
        "A buyer can sit through a strong demo, nod the whole time, and still not be able to explain the offer to a colleague.",
      whyItMattersToBuyer:
        "They need one sentence they can take back inside the company. Without it, the deal stalls in rooms the founder never enters.",
    },
    {
      id: "sample-2",
      title: "[SAMPLE] Biography is not a brief",
      angle:
        "Founders answer 'what do you do?' with a life story. Buyers asked for a job to be done.",
      whyItMattersToBuyer:
        "The buyer is hiring an outcome. A biography asks them to do the translation work.",
    },
    {
      id: "sample-3",
      title: "[SAMPLE] Repeatable, not impressive",
      angle:
        "If the buyer cannot repeat the offer, the offer is not finished — even if the product is.",
      whyItMattersToBuyer:
        "Internal champions lose deals they believe in when they cannot say the line without the founder present.",
    },
    {
      id: "sample-4",
      title: "[SAMPLE] Guide, not hero",
      angle:
        "The post should put the customer in the hard moment and the founder beside them, not on a pedestal.",
      whyItMattersToBuyer:
        "Buyers recognise their own week. They do not need another founder victory lap.",
    },
  ];
}

export function mockStrategy(): StrategyBrief {
  return {
    coreInsight:
      "[SAMPLE] A buyer who cannot repeat the offer cannot sell it internally. Clarity is part of the product.",
    hookDirection:
      "[SAMPLE] Open in the room after the demo, when the nodding stops and the real question arrives: so what do you actually do?",
    argument:
      "[SAMPLE] If the champion cannot carry one sentence into the next meeting, the founder was never really in that meeting.",
    supportingMaterial:
      "[SAMPLE] Use only the user-supplied note about demo nods. Do not add other customers, quotes, or results. No pasted sources were marked as verified fact.",
    structure:
      "[SAMPLE] 1) The nod. 2) The question the buyer still has. 3) The founder as guide. 4) A question that puts the reader in their own calls.",
    closingQuestionOrCta:
      "[SAMPLE] What sentence does your buyer use when you are not in the room?",
    missingInformation: [],
  };
}

export function mockDraft(): DraftBundle {
  return {
    linkedinDraft: `[SAMPLE]

A buyer can nod through a whole demo and still not know what you do.

That is not because they were not paying attention. It is because they have to explain you tomorrow, in a room you will not be in.

If they cannot repeat the offer, they cannot take it anywhere.

You do not need a louder story. You need one sentence they can carry.

What sentence does your buyer use when you are not in the room?`,
    omittedClaims: [],
    questionsForUser: [],
    managerVerdict: "approve",
    managerSummary:
      "[SAMPLE] Review passed on labelled sample copy. No invented stories or statistics. Customer is the hero; founder is the guide.",
    issuesForUser: [],
    revisionRounds: 0,
  };
}

export function mockX(): XContent {
  return {
    xPost:
      "[SAMPLE] A buyer can nod through a demo and still not know what you do. If they cannot repeat the offer, they cannot take it into the next room.",
    xThread: [
      "[SAMPLE] A buyer can nod through a whole demo and still not know what you do.",
      "[SAMPLE] They have to explain you tomorrow, in a room you will not be in.",
      "[SAMPLE] If they cannot repeat the offer, they cannot take it anywhere.",
      "[SAMPLE] You do not need a louder story. You need one sentence they can carry.",
      "[SAMPLE] What sentence does your buyer use when you are not in the room?",
    ],
  };
}
