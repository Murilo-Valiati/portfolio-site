import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
  DAILY_LOG_PATH,
} from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAssistenteRoute =
    pathname.startsWith("/assistente") || pathname.startsWith("/api/assistente");

  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname === "/api/admin/login";

  const isProtected =
    isAssistenteRoute ||
    pathname === DAILY_LOG_PATH ||
    ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
      !isPublicAdminRoute);

  if (isProtected) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const valid = token ? await verifySessionToken(token) : false;

    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // O cookie anônimo do assistente foi aposentado: progresso e chat agora
  // pertencem à identidade fixa do dono (auditoria de 30/08).
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/assistente/:path*",
    "/api/assistente/:path*",
    "/log-5bda56349c8d",
  ],
};
