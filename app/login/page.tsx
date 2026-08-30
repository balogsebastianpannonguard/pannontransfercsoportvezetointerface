import GroupLeaderPremiumLogin from "./components/GroupLeaderPremiumLogin";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0B1A2A]">
        <div className="w-8 h-8 rounded-full border-2 border-[#C9A962]/30 border-t-[#C9A962] animate-spin" />
      </div>
    }>
      <GroupLeaderPremiumLogin />
    </Suspense>
  );
}
