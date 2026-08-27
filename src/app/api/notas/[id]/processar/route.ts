import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { checkNotesKey } from "@/lib/notes-key";
import { setNoteStatus, type NoteStatus } from "@/lib/notes";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const VALID_STATUS: NoteStatus[] = ["pendente", "processado"];

/**
 * Marca uma nota como processada usando GET.
 *
 * Mutação via GET é incomum de propósito: a automação (Claude Cowork) roda num
 * ambiente cuja única ferramenta de rede faz apenas GET, sem cabeçalhos
 * customizados nem PATCH. Sem isto ela consegue ler a fila mas nunca fechá-la,
 * e a mesma nota seria reprocessada para sempre.
 *
 * É aceitável aqui porque a operação é idempotente (marcar duas vezes dá no
 * mesmo), exige a chave secreta e responde no-store. O PATCH continua existindo
 * e é o caminho preferido para quem consegue usá-lo.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const hasSession = token ? await verifySessionToken(token) : false;

  if (!hasSession) {
    const keyError = checkNotesKey(req);
    if (keyError) return keyError;
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status: NoteStatus = VALID_STATUS.includes(statusParam as NoteStatus)
    ? (statusParam as NoteStatus)
    : "processado";

  const { id } = await params;
  const note = await setNoteStatus(id, status);

  if (!note) {
    return NextResponse.json(
      { error: "Nota não encontrada." },
      { status: 404, headers: NO_STORE }
    );
  }

  return NextResponse.json({ note }, { headers: NO_STORE });
}
