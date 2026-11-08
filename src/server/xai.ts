import { getXaiConfig } from "./env";
import { redactSecrets } from "./redact";

const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export async function createChatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  const { apiKey, model } = getXaiConfig();

  let response: Response;
  try {
    response = await fetch(XAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new Error(`xAI request failed: ${redactSecrets(message)}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = redactSecrets(await response.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error(
      `xAI request failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("xAI response did not include any content");
  }
  return content;
}
