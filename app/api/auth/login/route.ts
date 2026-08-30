import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  setSessionCookie,
  getGroupLeaderProfile,
  type GroupLeaderUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const remember = body.remember !== false;

    console.log("[LOGIN] Kezdet:", { email, passwordLength: password?.length });

    if (!email || !password) {
      console.log("[LOGIN] Hiba: Üres email vagy jelszó");
      return NextResponse.json(
        { success: false, message: "Kérjük, adja meg az e-mail címet és a jelszót." },
        { status: 400 }
      );
    }

    const result = await verifyCredentials(email, password);
    console.log("[LOGIN] verifyCredentials eredmény:", { success: result.success, hasUser: !!result.user });
    
    if (!result.success || !result.user) {
      console.log("[LOGIN] Sikertelen auth:", result.message);
      return NextResponse.json(
        { success: false, message: result.message || "Hibás e-mail cím vagy jelszó." },
        { status: 401 }
      );
    }

    const user: GroupLeaderUser = await getGroupLeaderProfile(result.user);
    const token = createSessionToken(user, remember);
    await setSessionCookie(token, remember);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        loginAt: user.loginAt,
        staffId: user.staffId,
      },
    });
  } catch (err) {
    console.error("[GroupLeader Login Error]", err);
    return NextResponse.json(
      { success: false, message: "Váratlan hiba történt. Kérjük, próbálja újra." },
      { status: 500 }
    );
  }
}
