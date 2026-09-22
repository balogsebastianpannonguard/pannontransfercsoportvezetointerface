import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getGroupLeaderProfile, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Egyedi, előre generált linkkel automatikusan bejelentkezteti Gábort,
// anélkül hogy meg kellene adnia az e-mail címét és jelszavát.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expectedToken = process.env.GROUPLEADER_AUTOLOGIN_TOKEN;

  if (!expectedToken || !token || token !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Örökre bejelentkezve marad (10 év) — nem kell újra megadnia az adatait.
  const FOREVER_SECONDS = 60 * 60 * 24 * 365 * 10;
  const user = await getGroupLeaderProfile();
  const sessionToken = createSessionToken(user, true, `${FOREVER_SECONDS}s`);
  await setSessionCookie(sessionToken, true, FOREVER_SECONDS);

  return NextResponse.redirect(new URL("/", request.url));
}
