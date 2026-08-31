import { NextRequest, NextResponse } from "next/server";
import { checkNotesKey } from "@/lib/notes-key";
import {
  montarResumoMatinal,
  montarResumoVespera,
  montarRevisaoSemanal,
} from "@/lib/rotina";
import { enviarPushover, pushoverConfigurado } from "@/lib/pushover";

export const dynamic = "force-dynamic";

/**
 * Dispara (ou só monta) o resumo matinal, a véspera ou a revisão semanal,
 * fora do horário. Protegido pela NOTES_KEY (fora de /api/admin de propósito:
 * o middleware exigiria sessão de navegador).
 *
 *   GET /api/rotina/testar?tipo=resumo|vespera|revisao&key=...
 *   &seco=1  -> monta e retorna o texto SEM enviar (bancada de teste)
 */
export async function GET(req: NextRequest) {
  const keyError = checkNotesKey(req);
  if (keyError) return keyError;

  const tipo = req.nextUrl.searchParams.get("tipo");
  const seco = req.nextUrl.searchParams.get("seco") === "1";

  let r: { titulo: string; mensagem: string } | null;
  if (tipo === "resumo") r = await montarResumoMatinal();
  else if (tipo === "vespera") r = await montarResumoVespera();
  else if (tipo === "revisao") r = await montarRevisaoSemanal();
  else {
    return NextResponse.json(
      { error: 'tipo deve ser "resumo", "vespera" ou "revisao".' },
      { status: 400 }
    );
  }

  if (r === null) {
    return NextResponse.json({ enviado: false, vazio: true });
  }

  if (!seco) {
    if (!pushoverConfigurado()) {
      return NextResponse.json(
        { error: "Pushover não configurado no servidor." },
        { status: 500 }
      );
    }
    await enviarPushover({ ...r, prioridade: 0 });
  }

  return NextResponse.json({ enviado: !seco, ...r });
}
