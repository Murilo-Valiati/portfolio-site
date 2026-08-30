import { NextRequest, NextResponse } from "next/server";
import { proposeCourseFromChat, mapearErroGemini, ChatMessage } from "@/lib/gemini";
import { claudeConfigurado, proporCursoClaude } from "@/lib/claude-cli";
import { addCustomCourse, getAllCategories } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : [];

  if (history.length === 0) {
    return NextResponse.json(
      { error: "É preciso ter uma conversa pra basear o curso." },
      { status: 400 }
    );
  }

  const categories = await getAllCategories();

  // Motor preferido do Assistente: assinatura do Claude, com fallback Gemini.
  if (claudeConfigurado()) {
    try {
      const proposta = await proporCursoClaude(history, categories);
      const course = await addCustomCourse(
        proposta.title,
        proposta.description,
        proposta.category
      );
      return NextResponse.json({ course, motor: "claude" });
    } catch (err) {
      console.warn(
        "[from-chat] Claude (assinatura) falhou, caindo pro Gemini:",
        err
      );
    }
  }

  try {
    const proposal = await proposeCourseFromChat(history, categories);
    const course = await addCustomCourse(
      proposal.title,
      proposal.description,
      proposal.category
    );
    return NextResponse.json({ course });
  } catch (err) {
    const { status, mensagem } = mapearErroGemini(err);
    return NextResponse.json({ error: mensagem }, { status });
  }
}
