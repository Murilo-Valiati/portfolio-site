import { NextRequest, NextResponse } from "next/server";
import { getContent, saveContent, type SiteContent } from "@/lib/content";

export async function GET() {
  const content = await getContent();
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as SiteContent;

  if (
    !body ||
    typeof body.profile !== "object" ||
    !Array.isArray(body.skills) ||
    !Array.isArray(body.projects) ||
    !Array.isArray(body.languages) ||
    typeof body.contact !== "object"
  ) {
    return NextResponse.json({ error: "Conteúdo inválido." }, { status: 400 });
  }

  await saveContent(body);
  return NextResponse.json({ ok: true });
}
