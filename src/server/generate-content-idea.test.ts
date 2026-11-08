import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateContentIdea } from "./generate-content-idea";

const TEST_API_KEY = "xai-secret-test-key-do-not-log-abc123";
const TEST_MODEL = "grok-4.7";
const ORIGINAL_API_KEY = process.env.XAI_API_KEY;
const ORIGINAL_MODEL = process.env.GROK_MODEL;

const SAMPLE_IDEA = {
  title: "Stop selling the model. Sell Monday morning.",
  hook: "Your buyer does not wake up wanting another AI feature list.",
  format: "LinkedIn post",
  whyItWorks:
    "It puts the buyer in a specific, high-stakes moment instead of a product pitch.",
};

function restoreEnv() {
  if (ORIGINAL_API_KEY === undefined) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = ORIGINAL_API_KEY;
  if (ORIGINAL_MODEL === undefined) delete process.env.GROK_MODEL;
  else process.env.GROK_MODEL = ORIGINAL_MODEL;
}

function captureLogs(): string[] {
  const logs: string[] = [];
  const sink = (...args: unknown[]) => {
    logs.push(
      args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" "),
    );
  };
  vi.spyOn(console, "log").mockImplementation(sink);
  vi.spyOn(console, "info").mockImplementation(sink);
  vi.spyOn(console, "warn").mockImplementation(sink);
  vi.spyOn(console, "error").mockImplementation(sink);
  vi.spyOn(console, "debug").mockImplementation(sink);
  return logs;
}

describe("generateContentIdea", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = TEST_API_KEY;
    process.env.GROK_MODEL = TEST_MODEL;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(SAMPLE_IDEA) } }],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreEnv();
  });

  it("generates one content idea via the server-side xAI client", async () => {
    const logs = captureLogs();

    const idea = await generateContentIdea("AI-first B2B marketing");

    expect(idea).toEqual(SAMPLE_IDEA);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect(init.method).toBe("POST");

    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers.get("Content-Type")).toBe("application/json");

    const body = JSON.parse(String(init.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe(TEST_MODEL);
    expect(body.messages[0]?.role).toBe("system");
    expect(body.messages[1]?.content).toContain("exactly one content idea");

    const combinedLogs = logs.join("\n");
    expect(combinedLogs).not.toContain(TEST_API_KEY);
    expect(combinedLogs).not.toContain(`Bearer ${TEST_API_KEY}`);
  });

  it("does not put the API key in thrown errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new Error(`connect failed for Bearer ${TEST_API_KEY}`),
    );

    try {
      await generateContentIdea("pipeline reviews");
      throw new Error("expected generateContentIdea to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("[redacted]");
      expect(message).not.toContain(TEST_API_KEY);
    }
  });

  it("fails closed when XAI_API_KEY is missing", async () => {
    delete process.env.XAI_API_KEY;
    await expect(generateContentIdea()).rejects.toThrow(/Missing XAI_API_KEY/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

const hasLiveKey = Boolean(
  ORIGINAL_API_KEY && !ORIGINAL_API_KEY.startsWith("your_"),
);

describe.skipIf(!hasLiveKey)("generateContentIdea live", () => {
  it("generates one live content idea from xAI", async () => {
    const logs = captureLogs();
    const idea = await generateContentIdea("AI-first B2B marketing");
    const key = process.env.XAI_API_KEY ?? "";

    expect(idea.title.length).toBeGreaterThan(0);
    expect(idea.hook.length).toBeGreaterThan(0);
    expect(idea.format.length).toBeGreaterThan(0);
    expect(idea.whyItWorks.length).toBeGreaterThan(0);
    expect(logs.join("\n")).not.toContain(key);

    vi.restoreAllMocks();
  });
});
