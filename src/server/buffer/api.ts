import { redactSecrets } from "../redact";
import { refreshAccessToken } from "./oauth";
import type { BufferSession } from "./session";

const BUFFER_GRAPHQL_URL = "https://api.buffer.com";

export type BufferOrganization = { id: string; name: string };
export type BufferChannel = {
  id: string;
  name: string;
  displayName?: string;
  service: string;
};
export type BufferAccount = {
  id: string;
  name: string | null;
  email: string;
  organizations: BufferOrganization[];
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export async function bufferGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BUFFER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new Error(`Buffer request failed: ${redactSecrets(message)}`);
  }

  if (response.status === 401) {
    throw new Error("Buffer session expired. Connect Buffer again.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = redactSecrets(await response.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error(
      `Buffer request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const payload = (await response.json()) as GraphqlResponse<T>;
  if (payload.errors?.length) {
    const message = payload.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(redactSecrets(message || "Buffer returned an error"));
  }
  if (!payload.data) throw new Error("Buffer returned no data");
  return payload.data;
}

export async function withFreshAccessToken(
  session: BufferSession,
  run: (token: string) => Promise<unknown>,
): Promise<{ result: unknown; session: BufferSession }> {
  let current = session;
  if (current.refreshToken && current.expiresAt < Date.now()) {
    const tokens = await refreshAccessToken(current.refreshToken);
    current = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? current.refreshToken,
      expiresAt: tokens.expiresAt,
    };
  }
  try {
    return { result: await run(current.accessToken), session: current };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!current.refreshToken || !message.includes("expired")) throw error;
    const tokens = await refreshAccessToken(current.refreshToken);
    current = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? current.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    return { result: await run(current.accessToken), session: current };
  }
}

export async function getBufferAccount(
  accessToken: string,
): Promise<BufferAccount> {
  const data = await bufferGraphql<{
    account: {
      id: string;
      name?: string | null;
      email: string;
      organizations: BufferOrganization[];
    };
  }>(
    accessToken,
    `query GetOrganizations {
      account { id name email organizations { id name } }
    }`,
  );
  return {
    id: data.account.id,
    name: data.account.name ?? null,
    email: data.account.email,
    organizations: data.account.organizations,
  };
}

export async function listBufferChannels(
  accessToken: string,
  organizationId: string,
): Promise<BufferChannel[]> {
  const data = await bufferGraphql<{
    channels: Array<{
      id: string;
      name: string;
      displayName?: string;
      service: string;
    }>;
  }>(
    accessToken,
    `query GetChannels($organizationId: ID!) {
      channels(input: { organizationId: $organizationId }) {
        id name displayName service
      }
    }`,
    { organizationId },
  );
  return data.channels ?? [];
}

export async function createBufferIdea(
  accessToken: string,
  input: { organizationId: string; title: string; text: string },
): Promise<{ id: string }> {
  const data = await bufferGraphql<{
    createIdea: {
      id?: string;
      idea?: { id: string };
      message?: string;
    } | null;
  }>(
    accessToken,
    `mutation CreateIdea($organizationId: ID!, $title: String, $text: String) {
      createIdea(input: {
        organizationId: $organizationId,
        content: { title: $title, text: $text, aiAssisted: true }
      }) {
        ... on Idea { id }
        ... on IdeaResponse { idea { id } }
        ... on MutationError { message }
      }
    }`,
    input,
  );
  const payload = data.createIdea;
  if (payload?.message) throw new Error(redactSecrets(payload.message));
  const id = payload?.id || payload?.idea?.id;
  if (!id) throw new Error("Buffer did not save the idea.");
  return { id };
}

export async function queueBufferPost(
  accessToken: string,
  input: { channelId: string; text: string },
): Promise<{ id: string; dueAt?: string | null }> {
  const data = await bufferGraphql<{
    createPost: {
      message?: string;
      post?: { id: string; dueAt?: string | null };
    } | null;
  }>(
    accessToken,
    `mutation QueuePost($channelId: ID!, $text: String!) {
      createPost(input: {
        text: $text,
        channelId: $channelId,
        schedulingType: automatic,
        mode: addToQueue,
        aiAssisted: true
      }) {
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }`,
    input,
  );
  const payload = data.createPost;
  if (payload?.message) throw new Error(redactSecrets(payload.message));
  if (!payload?.post?.id) throw new Error("Buffer did not queue the post.");
  return { id: payload.post.id, dueAt: payload.post.dueAt };
}

export function pickOrganization(
  organizations: BufferOrganization[],
  requestedId?: string,
): BufferOrganization {
  if (requestedId) {
    const match = organizations.find((org) => org.id === requestedId);
    if (!match) {
      throw new Error("That Buffer workspace is not on this connected account.");
    }
    return match;
  }
  const first = organizations[0];
  if (!first) throw new Error("This Buffer account has no workspace.");
  return first;
}

export function pickChannel(
  channels: BufferChannel[],
  requestedId: string | undefined,
  service: string,
): BufferChannel {
  if (requestedId) {
    const match = channels.find((channel) => channel.id === requestedId);
    if (!match) {
      throw new Error("That Buffer channel is not on this connected account.");
    }
    return match;
  }
  const match = channels.find(
    (channel) => channel.service.toLowerCase() === service.toLowerCase(),
  );
  if (!match) {
    throw new Error(
      `No ${service} channel is connected in Buffer yet. Connect one in Buffer, then try again.`,
    );
  }
  return match;
}
