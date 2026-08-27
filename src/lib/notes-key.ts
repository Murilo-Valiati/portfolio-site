import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Two separate secrets, on purpose:
 *
 * - NOTES_KEY       lê a fila e marca notas como processadas (Claude Cowork).
 * - NOTES_WRITE_KEY apenas cria notas (atalho do iPhone).
 *
 * Se uma vazar, ela não faz o que a outra faz.
 */
type KeyName = "NOTES_KEY" | "NOTES_WRITE_KEY";

function checkKey(req: NextRequest, name: KeyName): NextResponse | null {
  const expected = process.env[name];
  if (!expected) {
    return NextResponse.json(
      { error: `${name} não configurada no servidor.` },
      { status: 500 }
    );
  }

  const provided =
    req.nextUrl.searchParams.get("key") || req.headers.get("x-notes-key");

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
  }

  return null;
}

/** Leitura da fila e marcação de status. Returns null when authorized. */
export function checkNotesKey(req: NextRequest): NextResponse | null {
  return checkKey(req, "NOTES_KEY");
}

/** Criação de notas. Returns null when authorized. */
export function checkNotesWriteKey(req: NextRequest): NextResponse | null {
  return checkKey(req, "NOTES_WRITE_KEY");
}
