import { NextRequest, NextResponse } from "next/server";
import { interpretarNota } from "@/lib/interprete";

/**
 * Bancada de teste do interpretador — SÓ EXISTE EM DEV. Permite validar a
 * resolução de datas relativas sem criar nota nem evento:
 *
 *   /api/notas/teste-interpretacao?texto=treino amanhã 21h me ligue
 *     &criadaEm=2026-08-28T20:29:30.147Z   (opcional; padrão: agora)
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const texto = req.nextUrl.searchParams.get("texto");
  if (!texto) {
    return NextResponse.json({ error: "Passe ?texto=..." }, { status: 400 });
  }

  const criadaEm =
    req.nextUrl.searchParams.get("criadaEm") || new Date().toISOString();

  const itens = await interpretarNota({
    id: "teste",
    text: texto,
    createdAt: criadaEm,
    status: "pendente",
  });

  return NextResponse.json({ texto, criadaEm, itens });
}
