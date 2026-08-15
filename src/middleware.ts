import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const LMS_SESSION_COOKIE = "lms_session";
export const DAILY_LOG_PATH = "/log-5bda56349c8d";

export async function middleware(req: NextRequest) {
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

  const res = NextResponse.next();
  if (isAssistenteRoute && !req.cookies.get(LMS_SESSION_COOKIE)) {
    res.cookies.set(LMS_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
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
