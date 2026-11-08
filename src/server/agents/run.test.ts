import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_PROFILE } from "@/lib/sample-profile";
import { EDITORIAL_RULES } from "./rules";
import { runGenerate } from "./run";
import { mockForRole } from "./mock";

const TEST_API_KEY = "xai-secret-test-key-do-not-log-abc123";
const ORIGINAL_API_KEY = process.env.XAI_API_KEY;
const ORIGINAL_MODEL = process.env.GROK_MODEL;

function restoreEnv() {
  if (ORIGINAL_API_KEY === undefined) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = ORIGINAL_API_KEY;
  if (ORIGINAL_MODEL === undefined) delete process.env.GROK_MODEL;
  else process.env.GROK_MODEL = ORIGINAL_MODEL;
}

function grokReply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  };
}

describe("runGenerate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreEnv();
  });

  it("returns labelled mock data when Grok is not configured", async () => {
    delete process.env.XAI_API_KEY;
    const { result, sample } = await runGenerate({
      role: "positioning",
      profile: SAMPLE_PROFILE,
      payload: { profile: SAMPLE_PROFILE },
    });
    expect(sample).toBe(true);
    expect(JSON.stringify(result)).toContain("[SAMPLE]");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("iimcip");
  });

  it("runs positioning through Grok without logging the key", async () => {
    process.env.XAI_API_KEY = TEST_API_KEY;
    process.env.GROK_MODEL = "grok-4.7";
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        grokReply({
          positioningStatement: "A clear sentence a buyer can repeat.",
          buyerProfile: "A technical founder.",
          keyPainPoints: ["They cannot explain the offer internally."],
          messagingDirection: "Start with the buyer's stuck moment.",
        }),
      ),
    );

    const { result, sample } = await runGenerate({
      role: "positioning",
      profile: SAMPLE_PROFILE,
      payload: { profile: SAMPLE_PROFILE },
    });

    expect(sample).toBe(false);
    expect(result).toMatchObject({
      positioningStatement: "A clear sentence a buyer can repeat.",
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("Never invent");
    expect(body.messages[0].content).toContain("IIMCIP");
    expect(logs.join("\n")).not.toContain(TEST_API_KEY);
  });

  it("returns routine writer revisions to the writer at most twice", async () => {
    process.env.XAI_API_KEY = TEST_API_KEY;
    process.env.GROK_MODEL = "grok-4.7";
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        grokReply({
          linkedinDraft: "First draft.",
          omittedClaims: [],
          questionsForUser: [],
        }),
      )
      .mockResolvedValueOnce(
        grokReply({
          verdict: "revise",
          reviewedDraft: "Slightly tighter first draft.",
          corrections: "Cut the extra clause.",
          issuesForUser: [],
          summary: "Routine clarity pass.",
        }),
      )
      .mockResolvedValueOnce(
        grokReply({
          linkedinDraft: "Second draft.",
          omittedClaims: [],
          questionsForUser: [],
        }),
      )
      .mockResolvedValueOnce(
        grokReply({
          verdict: "approve",
          reviewedDraft: "Second draft, cleared.",
          corrections: "",
          issuesForUser: [],
          summary: "Voice holds.",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = await runGenerate({
      role: "draft",
      profile: SAMPLE_PROFILE,
      payload: { brief: "brief" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({
      linkedinDraft: "Second draft, cleared.",
      managerVerdict: "approve",
      revisionRounds: 1,
    });
  });
});

describe("editorial fixtures", () => {
  it("keeps IIMCIP out of mock outputs and in the rules", () => {
    expect(EDITORIAL_RULES).toContain("IIMCIP");
    for (const role of ["positioning", "ideator", "strategist", "draft", "x-adapt"] as const) {
      expect(JSON.stringify(mockForRole(role)).toLowerCase()).not.toContain("iimcip");
    }
  });
});
