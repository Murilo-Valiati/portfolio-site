import { NextResponse } from "next/server";
import { restaurarCursosPadrao } from "@/lib/lms";

/** Traz de volta os cursos padrão ocultados (progresso incluso). */
export async function POST() {
  await restaurarCursosPadrao();
  return NextResponse.json({ ok: true });
}
