import { NextRequest, NextResponse } from "next/server";
import { getCourse, addCustomLesson } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const moduleId = body?.moduleId;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (
    typeof courseId !== "string" ||
    !getCourse(courseId) ||
    typeof moduleId !== "string" ||
    !title
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const modules = await addCustomLesson(courseId, moduleId, title);
  return NextResponse.json({ modules });
}
