import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const LMS_SESSION_COOKIE = "lms_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/assistente") || pathname.startsWith("/api/assistente")) {
    const res = NextResponse.next();
    if (!req.cookies.get(LMS_SESSION_COOKIE)) {
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

  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname === "/api/admin/login";

  const isProtected =
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !isPublicAdminRoute;

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/assistente/:path*",
    "/api/assistente/:path*",
  ],
};
