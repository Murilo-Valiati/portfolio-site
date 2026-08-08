import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "admin_session";
const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-insecure-secret");

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
