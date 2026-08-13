import { NextRequest, NextResponse } from "next/server";
import { addCustomCourse, isCustomCourseId, removeCustomCourse } from "@/lib/lms";
import { deleteChatThreadsForCourse } from "@/lib/chat-history";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!title || !category) {
    return NextResponse.json(
      { error: "Título e categoria são obrigatórios." },
      { status: 400 }
    );
  }

  const course = await addCustomCourse(title, description, category);
  return NextResponse.json({ course });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;

  if (typeof courseId !== "string") {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  if (!isCustomCourseId(courseId)) {
    return NextResponse.json(
      { error: "Cursos padrão do site não podem ser removidos." },
      { status: 400 }
    );
  }

  await removeCustomCourse(courseId);
  await deleteChatThreadsForCourse(courseId);
  return NextResponse.json({ ok: true });
}
