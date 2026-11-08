import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/limits";
import {
  createBufferIdea,
  getBufferAccount,
  listBufferChannels,
  pickChannel,
  pickOrganization,
  queueBufferPost,
  withFreshAccessToken,
} from "@/server/buffer/api";
import { isBufferOAuthConfigured } from "@/server/buffer/config";
import {
  readBufferSession,
  setSessionCookie,
} from "@/server/buffer/session";
import { allowRequest, clientIp } from "@/server/rate-limit";
import { redactSecrets } from "@/server/redact";

export const runtime = "nodejs";

const ACTIONS = ["idea", "queue-linkedin", "queue-x"] as const;
type SendAction = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many Buffer sends in a short time. Wait a few minutes." },
      { status: 429 },
    );
  }

  let body: {
    action?: string;
    organizationId?: string;
    channelId?: string;
    title?: string;
    text?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "The Buffer send request could not be read." },
      { status: 400 },
    );
  }

  const action = body.action as SendAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: "Choose Save idea, LinkedIn queue, or X queue." },
      { status: 400 },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "DTW draft";
  if (!text || text.length > LIMITS.draft) {
    return NextResponse.json(
      { error: "There is no approved text to send, or it is too long." },
      { status: 400 },
    );
  }

  if (!isBufferOAuthConfigured()) {
    return NextResponse.json({
      sample: true,
      id: `sample-${action}-${Date.now()}`,
      message:
        "[SAMPLE] Nothing was sent to Buffer. Connect a Buffer app client, then this same button will save for real.",
    });
  }

  const session = readBufferSession(request);
  if (!session) {
    return NextResponse.json(
      { error: "Connect Buffer first. Nothing was sent." },
      { status: 401 },
    );
  }

  try {
    const { result, session: nextSession } = await withFreshAccessToken(
      session,
      async (token) => {
        const account = await getBufferAccount(token);
        const org = pickOrganization(
          account.organizations,
          typeof body.organizationId === "string"
            ? body.organizationId
            : undefined,
        );
        if (action === "idea") {
          return createBufferIdea(token, {
            organizationId: org.id,
            title: title.slice(0, LIMITS.short),
            text: text.slice(0, LIMITS.draft),
          });
        }
        const channels = await listBufferChannels(token, org.id);
        const service = action === "queue-x" ? "twitter" : "linkedin";
        const channel = pickChannel(
          channels,
          typeof body.channelId === "string" ? body.channelId : undefined,
          service,
        );
        return queueBufferPost(token, {
          channelId: channel.id,
          text: text.slice(0, LIMITS.draft),
        });
      },
    );
    const payload = result as { id: string; dueAt?: string | null };
    const response = NextResponse.json({
      sample: false,
      id: payload.id,
      dueAt: payload.dueAt ?? null,
      message:
        action === "idea"
          ? "Saved to Buffer Ideas."
          : "Added to your Buffer queue. It is not posted until Buffer’s scheduled time.",
    });
    setSessionCookie(response, request, nextSession);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send to Buffer.";
    return NextResponse.json(
      { error: redactSecrets(message) },
      { status: 502 },
    );
  }
}
