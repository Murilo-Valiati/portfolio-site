import { NextRequest, NextResponse } from "next/server";
import { addPrazo, getPrazos } from "@/lib/prazos";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  return NextResponse.json(
    { prazos: await getPrazos() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const data = typeof body?.data === "string" ? body.data.trim() : "";

  if (!titulo || !DATE_REGEX.test(data)) {
    return NextResponse.json(
      { error: "Informe título e data no formato AAAA-MM-DD." },
      { status: 400 }
    );
  }

  return NextResponse.json({ prazo: await addPrazo(titulo, data) });
}
