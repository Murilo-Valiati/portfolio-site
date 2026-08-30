import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { checkNotesKey } from "@/lib/notes-key";
import { deleteNote, setNoteStatus, type NoteStatus } from "@/lib/notes";
import { processarFila } from "@/lib/agenda-worker";

// PATCH aceita só os dois estados "manuais" — os demais são do worker.
const VALID_STATUS: NoteStatus[] = ["pendente", "processado"];

async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? await verifySessionToken(token) : false;
}

/**
 * Flip a note's status. Used by the external automation once it has created the
 * calendar events, so the same note isn't applied again the next day.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasSession())) {
    const keyError = checkNotesKey(req);
    if (keyError) return keyError;
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json(
      { error: 'status deve ser "pendente" ou "processado".' },
      { status: 400 }
    );
  }

  const note = await setNoteStatus(id, status);
  if (!note) {
    return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
  }

  // Reabrir uma nota é pedir pro worker tentar de novo, já.
  if (status === "pendente") after(() => processarFila());

  return NextResponse.json({ note });
}

/** Delete a note. Panel only. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  await deleteNote(id);
  return NextResponse.json({ ok: true });
}
