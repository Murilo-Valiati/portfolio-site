import { NextRequest, NextResponse } from "next/server";
import { findAnyCourse, getQuizResults, registerQuizResult } from "@/lib/lms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "courseId obrigatório." }, { status: 400 });
  }
  const results = await getQuizResults(courseId);
  return NextResponse.json({ results });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const lessonId = body?.lessonId;
  const score = body?.score;
  const total = body?.total;
  const erradas = Array.isArray(body?.erradas)
    ? body.erradas.filter((e: unknown): e is string => typeof e === "string").slice(0, 20)
    : [];

  if (
    typeof courseId !== "string" ||
    typeof lessonId !== "string" ||
    typeof score !== "number" ||
    typeof total !== "number" ||
    total < 1 ||
    score < 0 ||
    score > total ||
    !(await findAnyCourse(courseId))
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const attempt = await registerQuizResult(courseId, lessonId, {
    score,
    total,
    erradas,
  });
  return NextResponse.json({ attempt });
}
