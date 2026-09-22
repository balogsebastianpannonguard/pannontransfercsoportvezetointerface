import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "pannon_groupleader_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/auto-login", "/api/auth/session", "/api/auth/logout", "/_next", "/favicon.ico", "/public"];

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
