import { NextRequest, NextResponse } from "next/server";
import { generateQuiz, mapearErroGemini } from "@/lib/gemini";
import { claudeConfigurado, gerarQuizClaude } from "@/lib/claude-cli";
import { getLessonWithCustom } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const lessonId = body?.lessonId;

  if (typeof courseId !== "string" || typeof lessonId !== "string") {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  // getLessonWithCustom (e não getLesson): lições personalizadas com conteúdo
  // também merecem quiz.
  const found = await getLessonWithCustom(courseId, lessonId);
  if (!found) {
    return NextResponse.json({ error: "Lição não encontrada." }, { status: 404 });
  }
  if (!found.lesson.content.trim()) {
    return NextResponse.json(
      { error: "Esta lição ainda não tem conteúdo pra basear um quiz." },
      { status: 400 }
    );
  }

  // Motor preferido do Assistente: assinatura do Claude, com fallback Gemini.
  if (claudeConfigurado()) {
    try {
      const questions = await gerarQuizClaude(
        found.lesson.title,
        found.lesson.content
      );
      return NextResponse.json({ questions, motor: "claude" });
    } catch (err) {
      console.warn("[quiz] Claude (assinatura) falhou, caindo pro Gemini:", err);
    }
  }

  try {
    const questions = await generateQuiz(found.lesson.title, found.lesson.content);
    if (questions.length === 0) {
      throw new Error("Nenhuma pergunta gerada.");
    }
    return NextResponse.json({ questions });
  } catch (err) {
    const { status, mensagem } = mapearErroGemini(err);
    return NextResponse.json({ error: mensagem }, { status });
  }
}
