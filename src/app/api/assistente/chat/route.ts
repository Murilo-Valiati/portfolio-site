import { NextRequest, NextResponse } from "next/server";
import { chatWithTutor, ChatMessage } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = body?.message;
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : [];
  const courseContext =
    typeof body?.courseContext === "string" ? body.courseContext : undefined;

  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  try {
    const reply = await chatWithTutor(history, message, courseContext);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar resposta agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
