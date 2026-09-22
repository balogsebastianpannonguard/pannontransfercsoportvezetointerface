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

  const user = await getGroupLeaderProfile();
  const sessionToken = createSessionToken(user, true);
  await setSessionCookie(sessionToken, true);

  return NextResponse.redirect(new URL("/", request.url));
}
