import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { chatWithTutor, ChatMessage } from "@/lib/gemini";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getChatHistory, appendChatExchange } from "@/lib/chat-history";

export async function GET(req: NextRequest) {
  const threadKey = req.nextUrl.searchParams.get("threadKey");
  if (!threadKey) {
    return NextResponse.json({ error: "threadKey obrigatório." }, { status: 400 });
  }
  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ history: [] });
  }
  const history = await getChatHistory(sessionId, threadKey);
  return NextResponse.json({ history });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = body?.message;
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : [];
  const courseContext =
    typeof body?.courseContext === "string" ? body.courseContext : undefined;
  const threadKey = typeof body?.threadKey === "string" ? body.threadKey : "geral";

  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  try {
    const reply = await chatWithTutor(history, message, courseContext);

    const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
    if (sessionId) {
      await appendChatExchange(sessionId, threadKey, message, reply);
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar resposta agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
