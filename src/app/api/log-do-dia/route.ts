import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { getAllEntries, addEntry } from "@/lib/daily-log";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  const expectedKey = process.env.LOG_READ_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: "LOG_READ_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  const providedKey =
    req.nextUrl.searchParams.get("key") || req.headers.get("x-log-key");

  if (!providedKey || !timingSafeEqual(providedKey, expectedKey)) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
  }

  const entries = await getAllEntries();
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;
  if (!valid) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];

  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório." }, { status: 400 });
  }

  const entry = await addEntry(text, tags);
  return NextResponse.json({ entry });
}
