import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Checks the shared secret used by the external automation (Claude Cowork).
 * Accepts it as `?key=` or the `x-notes-key` header.
 *
 * Returns null when the request is authorized, or the response to send back
 * when it is not.
 */
export function checkNotesKey(req: NextRequest): NextResponse | null {
  const expected = process.env.NOTES_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "NOTES_KEY não configurada no servidor." },
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
