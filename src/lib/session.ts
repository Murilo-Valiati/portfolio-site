import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "admin_session";

export const DAILY_LOG_PATH = "/log-5bda56349c8d";

const secret = () => {
  const valor = process.env.SESSION_SECRET;
  if (!valor) {
    // Sem segredo de verdade, qualquer um forja o cookie do painel. Em
    // produção é melhor nenhum login do que um login falsificável.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET não configurada — sessões desabilitadas por segurança."
      );
    }
    return new TextEncoder().encode("dev-only-insecure-secret");
  }
  return new TextEncoder().encode(valor);
};

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
