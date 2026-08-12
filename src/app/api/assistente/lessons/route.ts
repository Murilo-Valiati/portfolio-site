import { NextRequest, NextResponse } from "next/server";
import { findAnyCourse, addCustomLesson } from "@/lib/lms";

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
