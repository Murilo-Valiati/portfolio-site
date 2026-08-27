import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { checkNotesKey, checkNotesWriteKey } from "@/lib/notes-key";
import { addNote, getNotes, type NoteStatus } from "@/lib/notes";

const VALID_STATUS: NoteStatus[] = ["pendente", "processado"];

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
      { error: 'status deve ser "pendente" ou "processado".' },
      { status: 400 }
    );
  }

  if (!(await hasSession())) {
    const keyError = checkNotesKey(req);
    if (keyError) return keyError;
  }

  const notes = await getNotes((statusParam as NoteStatus) || undefined);
  return NextResponse.json({ notes });
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
  return NextResponse.json({ note });
}
