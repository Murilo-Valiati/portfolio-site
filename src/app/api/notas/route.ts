import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { checkNotesKey, checkNotesWriteKey } from "@/lib/notes-key";
import { addNote, getNotes, type NoteStatus } from "@/lib/notes";
import { processarFila } from "@/lib/agenda-worker";

const VALID_STATUS: NoteStatus[] = [
  "pendente",
  "processado",
  "aguardando",
  "erro",
];

/**
 * A fila é lida por automação externa de hora em hora e precisa refletir o
 * estado do disco a cada chamada. O Next 16 já não cacheia GET em route
 * handlers, mas sem Cache-Control explícito qualquer intermediário ou cliente
 * HTTP pode aplicar cache heurístico. Deixamos os dois travados.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? await verifySessionToken(token) : false;
}

/**
 * Read notes. Authorized either by the admin session (so the panel can list
 * them) or by the shared key (so the external automation can pull them without
 * a browser session).
 */
export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");

  if (statusParam && !VALID_STATUS.includes(statusParam as NoteStatus)) {
    return NextResponse.json(
      {
        error:
          'status deve ser "pendente", "processado", "aguardando" ou "erro".',
      },
      { status: 400 }
    );
  }

  if (!(await hasSession())) {
    const keyError = checkNotesKey(req);
    if (keyError) return keyError;
  }

  const notes = await getNotes((statusParam as NoteStatus) || undefined);
  return NextResponse.json({ notes }, { headers: NO_STORE });
}

/**
 * Create a note. Authorized by the admin session (panel) or by the write key
 * (the iPhone shortcut). The read key deliberately does not work here.
 *
 * Accepts JSON `{ text }` or a plain-text body, since Shortcuts sends text more
 * easily than JSON.
 */
export async function POST(req: NextRequest) {
  if (!(await hasSession())) {
    const keyError = checkNotesWriteKey(req);
    if (keyError) return keyError;
  }

  const raw = await req.text();
  let text = "";

  if (raw.trimStart().startsWith("{")) {
    try {
      const body = JSON.parse(raw);
      text = typeof body?.text === "string" ? body.text.trim() : "";
    } catch {
      text = "";
    }
  } else {
    text = raw.trim();
  }

  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório." }, { status: 400 });
  }

  const note = await addNote(text);

  // Processa a fila assim que a resposta for enviada — a nota vira evento em
  // segundos, não na próxima passada do cron. Inerte sem o Google configurado.
  after(() => processarFila());

  return NextResponse.json({ note });
}
