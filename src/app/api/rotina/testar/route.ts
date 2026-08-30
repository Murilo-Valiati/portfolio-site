import { NextRequest, NextResponse } from "next/server";
import { checkNotesKey } from "@/lib/notes-key";
import { montarResumoMatinal, montarRevisaoSemanal } from "@/lib/rotina";
import { enviarPushover, pushoverConfigurado } from "@/lib/pushover";

export const dynamic = "force-dynamic";

/**
 * Dispara o resumo matinal ou a revisão semanal AGORA, fora do horário — para
 * testar ou para pedir o resumo de novo. Protegido pela NOTES_KEY (fora de
 * /api/admin de propósito: o middleware exigiria sessão de navegador).
 *
 *   GET /api/rotina/testar?tipo=resumo&key=...
 *   GET /api/rotina/testar?tipo=revisao&key=...
 */
export async function GET(req: NextRequest) {
  const keyError = checkNotesKey(req);
  if (keyError) return keyError;

  if (!pushoverConfigurado()) {
    return NextResponse.json(
      { error: "Pushover não configurado no servidor." },
      { status: 500 }
    );
  }

  const tipo = req.nextUrl.searchParams.get("tipo");
  if (tipo !== "resumo" && tipo !== "revisao") {
    return NextResponse.json(
      { error: 'tipo deve ser "resumo" ou "revisao".' },
      { status: 400 }
    );
  }

  const r =
    tipo === "resumo"
      ? await montarResumoMatinal()
      : await montarRevisaoSemanal();

  await enviarPushover({ ...r, prioridade: 0 });
  return NextResponse.json({ enviado: true, ...r });
}
