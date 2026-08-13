import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getAllProgress, toggleLessonComplete, findAnyCourse } from "@/lib/lms";

export async function GET() {
  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ progress: {} });
  }
  const progress = await getAllProgress(sessionId);
  return NextResponse.json({ progress });
}

export async function POST(req: NextRequest) {
  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Sessão não encontrada." }, { status: 400 });
  }

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

  const completedLessons = await toggleLessonComplete(
    sessionId,
    courseId,
    lessonId,
    completed
  );
  return NextResponse.json({ completedLessons });
}
