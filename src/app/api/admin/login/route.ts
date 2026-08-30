import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Freio de força bruta, em memória (o app é um processo único): depois de
 * 5 falhas seguidas por IP, cada nova tentativa dobra o bloqueio, até 15 min.
 * Sucesso zera. Reinício do container zera também — aceitável: o objetivo é
 * inviabilizar robôs de dicionário, não construir um WAF.
 */
const LIMITE_LIVRE = 5;
const BLOQUEIO_BASE_MS = 30_000;
const BLOQUEIO_MAX_MS = 15 * 60_000;

const falhas = new Map<string, { count: number; bloqueadoAte: number }>();

function ipDe(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconhecido"
  );
}

export async function POST(req: NextRequest) {
  const ip = ipDe(req);
  const agora = Date.now();

  const registro = falhas.get(ip);
  if (registro && registro.bloqueadoAte > agora) {
    const espera = Math.ceil((registro.bloqueadoAte - agora) / 1000);
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${espera}s.` },
      { status: 429, headers: { "Retry-After": String(espera) } }
    );
  }

  const { email, password } = await req.json();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    return NextResponse.json(
      { error: "Painel administrativo não configurado." },
      { status: 500 }
    );
  }

  const emailOk =
    typeof email === "string" &&
    email.toLowerCase() === adminEmail.toLowerCase();
  const senhaOk =
    typeof password === "string" &&
    (await bcrypt.compare(password, adminPasswordHash));

  if (!emailOk || !senhaOk) {
    const count = (registro?.count || 0) + 1;
    const excedente = Math.max(0, count - LIMITE_LIVRE);
    const bloqueadoAte =
      excedente > 0
        ? agora +
          Math.min(BLOQUEIO_BASE_MS * 2 ** (excedente - 1), BLOQUEIO_MAX_MS)
        : 0;
    falhas.set(ip, { count, bloqueadoAte });

    // Higiene: não deixa o mapa crescer sem limite.
    if (falhas.size > 1000) {
      for (const [k, v] of falhas) {
        if (v.bloqueadoAte < agora) falhas.delete(k);
      }
    }

    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  falhas.delete(ip);

  const token = await createSessionToken(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
