import { NextResponse } from "next/server";
import {
  getBufferAccount,
  listBufferChannels,
  pickOrganization,
  withFreshAccessToken,
} from "@/server/buffer/api";
import {
  isBufferOAuthConfigured,
  redirectUriFromRequest,
} from "@/server/buffer/config";
import {
  readBufferSession,
  setSessionCookie,
} from "@/server/buffer/session";
import { redactSecrets } from "@/server/redact";
import type { BufferAccount, BufferChannel } from "@/server/buffer/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const configured = isBufferOAuthConfigured();
  const redirectUri = redirectUriFromRequest(request);
  const session = readBufferSession(request);

  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      sample: true,
      redirectUri,
    });
  }

  if (!session) {
    return NextResponse.json({
      configured: true,
      connected: false,
      sample: false,
      redirectUri,
    });
  }

  try {
    const { result, session: nextSession } = await withFreshAccessToken(
      session,
      async (token) => {
        const account = await getBufferAccount(token);
        const org = pickOrganization(account.organizations);
        const channels = org
          ? await listBufferChannels(token, org.id)
          : [];
        return { account, channels };
      },
    );
    const { account, channels } = result as {
      account: BufferAccount;
      channels: BufferChannel[];
    };
    const response = NextResponse.json({
      configured: true,
      connected: true,
      sample: false,
      redirectUri,
      accountName: account.name || account.email,
      organizations: account.organizations,
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.displayName || channel.name,
        service: channel.service,
      })),
    });
    setSessionCookie(response, request, nextSession);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read Buffer account.";
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        sample: false,
        redirectUri,
        error: redactSecrets(message),
      },
      { status: 200 },
    );
  }
}
