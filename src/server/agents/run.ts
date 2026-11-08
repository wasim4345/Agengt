import { LIMITS } from "@/lib/limits";
import type { AgentRole, DraftBundle, Profile } from "@/lib/types";
import { isXaiConfigured } from "../env";
import { createChatCompletion } from "../xai";
import { mockForRole } from "./mock";
import {
  parseIdeas,
  parseManager,
  parsePositioning,
  parseStrategy,
  parseWriter,
  parseX,
  toDraftBundle,
} from "./parse";
import {
  managerSystemPrompt,
  systemPrompt,
  writerReviseSystemPrompt,
} from "./prompts";

export type GenerateInput = {
  role: AgentRole;
  profile: Profile;
  payload: Record<string, unknown>;
};

export async function runGenerate(input: GenerateInput): Promise<{
  result: unknown;
  sample: boolean;
}> {
  if (!isXaiConfigured()) {
    return { result: mockForRole(input.role), sample: true };
  }

  if (input.role === "draft") {
    const draft = await runDraftPipeline(input);
    return { result: draft, sample: false };
  }

  const raw = await createChatCompletion(
    [
      {
        role: "system",
        content: systemPrompt(input.role, input.profile.restrictions),
      },
      { role: "user", content: JSON.stringify(input.payload) },
    ],
    { maxCompletionTokens: LIMITS.maxCompletionTokens },
  );

  return { result: parseRole(input.role, raw), sample: false };
}

function parseRole(role: AgentRole, raw: string): unknown {
  switch (role) {
    case "positioning":
      return parsePositioning(raw);
    case "ideator":
      return { ideas: parseIdeas(raw) };
    case "strategist":
      return parseStrategy(raw);
    case "x-adapt":
      return parseX(raw);
    default:
      throw new Error("Unknown step.");
  }
}

async function runDraftPipeline(input: GenerateInput): Promise<DraftBundle> {
  const restrictions = input.profile.restrictions;
  let writer = parseWriter(
    await createChatCompletion(
      [
        { role: "system", content: systemPrompt("draft", restrictions) },
        { role: "user", content: JSON.stringify(input.payload) },
      ],
      { maxCompletionTokens: LIMITS.maxCompletionTokens },
    ),
  );

  let revisionRounds = 0;
  let manager = parseManager(
    await createChatCompletion(
      [
        { role: "system", content: managerSystemPrompt(restrictions) },
        {
          role: "user",
          content: JSON.stringify({
            ...input.payload,
            draft: writer,
          }),
        },
      ],
      { maxCompletionTokens: LIMITS.maxCompletionTokens },
    ),
  );

  while (manager.verdict === "revise" && revisionRounds < LIMITS.revisionRounds) {
    revisionRounds += 1;
    writer = parseWriter(
      await createChatCompletion(
        [
          {
            role: "system",
            content: writerReviseSystemPrompt(restrictions),
          },
          {
            role: "user",
            content: JSON.stringify({
              ...input.payload,
              previousDraft: writer,
              corrections: manager.corrections,
              reviewedDraft: manager.reviewedDraft,
              revisionRound: revisionRounds,
            }),
          },
        ],
        { maxCompletionTokens: LIMITS.maxCompletionTokens },
      ),
    );
    manager = parseManager(
      await createChatCompletion(
        [
          { role: "system", content: managerSystemPrompt(restrictions) },
          {
            role: "user",
            content: JSON.stringify({
              ...input.payload,
              draft: writer,
              revisionRound: revisionRounds,
            }),
          },
        ],
        { maxCompletionTokens: LIMITS.maxCompletionTokens },
      ),
    );
  }

  if (manager.verdict === "revise") {
    manager = {
      ...manager,
      verdict: "flag",
      issuesForUser:
        manager.issuesForUser.length > 0
          ? manager.issuesForUser
          : [
              "The editor still wants changes after two automatic passes. Please edit the draft yourself. Nothing was invented to fill the gap.",
            ],
    };
  }

  return toDraftBundle(writer, manager, revisionRounds);
}
