import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { handleTranscription } from "@/lib/transcribe";

/**
 * Session is checked here rather than by middleware: this path lives under
 * /api/log-do-dia, which middleware leaves open so the key-authenticated read
 * endpoint can work without a browser session.
 */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;
  if (!valid) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  return handleTranscription(req, "livre");
}
