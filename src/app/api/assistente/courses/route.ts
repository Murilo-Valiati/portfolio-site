import { NextRequest, NextResponse } from "next/server";
import { addCustomCourse } from "@/lib/lms";

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
