import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/gemini";
import { getLesson } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const lessonId = body?.lessonId;

  if (typeof courseId !== "string" || typeof lessonId !== "string") {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const found = getLesson(courseId, lessonId);
  if (!found) {
    return NextResponse.json({ error: "Lição não encontrada." }, { status: 404 });
  }

  try {
    const questions = await generateQuiz(found.lesson.title, found.lesson.content);
    if (questions.length === 0) {
      throw new Error("Nenhuma pergunta gerada.");
    }
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar o quiz agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
