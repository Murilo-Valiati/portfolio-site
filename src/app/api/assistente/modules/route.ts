import { NextRequest, NextResponse } from "next/server";
import { getCourse, addCustomModule, removeCustomModule } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (typeof courseId !== "string" || !getCourse(courseId) || !title) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const modules = await addCustomModule(courseId, title);
  return NextResponse.json({ modules });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const courseId = body?.courseId;
  const moduleId = body?.moduleId;

  if (typeof courseId !== "string" || typeof moduleId !== "string") {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const modules = await removeCustomModule(courseId, moduleId);
  return NextResponse.json({ modules });
}
