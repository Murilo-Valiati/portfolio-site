import { NextRequest, NextResponse } from "next/server";
import { getAllProgress, toggleLessonComplete, findAnyCourse } from "@/lib/lms";

export const dynamic = "force-dynamic";

export async function GET() {
  const progress = await getAllProgress();
  return NextResponse.json({ progress });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { courseId, lessonId, completed } = body ?? {};

  if (
    typeof courseId !== "string" ||
    typeof lessonId !== "string" ||
    typeof completed !== "boolean" ||
    !(await findAnyCourse(courseId))
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const completedLessons = await toggleLessonComplete(courseId, lessonId, completed);
  return NextResponse.json({ completedLessons });
}
