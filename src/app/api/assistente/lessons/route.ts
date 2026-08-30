import { NextRequest, NextResponse } from "next/server";
import {
  findAnyCourse,
  addCustomLesson,
  updateCustomLessonContent,
} from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const moduleId = body?.moduleId;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (
    typeof courseId !== "string" ||
    typeof moduleId !== "string" ||
    !title ||
    !(await findAnyCourse(courseId))
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const modules = await addCustomLesson(courseId, moduleId, title);
  return NextResponse.json({ modules });
}

/** Preenche o conteúdo de uma lição personalizada (destrava texto e quiz). */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const lessonId = body?.lessonId;
  const content = typeof body?.content === "string" ? body.content.trim() : null;

  if (typeof courseId !== "string" || typeof lessonId !== "string" || content === null) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const lesson = await updateCustomLessonContent(courseId, lessonId, content);
  if (!lesson) {
    return NextResponse.json(
      { error: "Lição personalizada não encontrada." },
      { status: 404 }
    );
  }
  return NextResponse.json({ lesson });
}
