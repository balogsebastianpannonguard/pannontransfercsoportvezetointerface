"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CarFront,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type State = "login" | "done";

export default function GroupLeaderPremiumLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Kérjük, adja meg az e-mail címet és a jelszót.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setError(json?.message || "Sikertelen bejelentkezés.");
        return;
      }

      if (json?.user) {
        setState("done");
        setTimeout(() => {
          // Teljes oldal újratöltés a biztonságos átirányításért
          window.location.href = nextPath;
        }, 1600);
        return;
      }

      setError("Váratlan hiba történt a bejelentkezés során.");
    } catch {
      setError("Hálózati hiba történt. Kérjük, próbálja újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] flex flex-col justify-between overflow-hidden selection:bg-[#C9A962]/30 selection:text-white">
      {/* Pannon Transfer Premium Deep Blue Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-[#C9A962]/[0.08] blur-[140px] rounded-full animate-float" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[450px] h-[450px] md:w-[600px] md:h-[600px] bg-[#1e3a5f]/[0.5] blur-[120px] rounded-full" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-[#C9A962]/[0.04] blur-[100px] rounded-full" />
      </div>

      {/* Premium Header */}
      <div className="relative z-10 w-full pt-[max(2.5rem,env(safe-area-inset-top))] px-6 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(11,26,42,0.6)] overflow-hidden">
            <div className="absolute inset-0 gold-gradient" />
            <CarFront className="relative z-10 w-6 h-6 text-[#0B1A2A]" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] leading-none tracking-wide">
              Pannon Transfer
            </span>
            <span className="text-[9.5px] text-[#C9A962] mt-1.5 font-bold tracking-[0.25em] uppercase">
              Csoportvezető Központ
            </span>
          </div>
        </div>
      </div>

      {/* Centered Main content - Mobile optimized */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[420px] mx-auto">
          <AnimatePresence mode="wait">
            {state === "login" && (
              <motion.div
                key="card-login"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Gold glow border */}
                <div className="absolute -inset-[1.5px] rounded-[28px] bg-gradient-to-br from-[#C9A962]/40 via-transparent to-[#C9A962]/25 blur-[2px] opacity-80" />
                <div className="relative rounded-[28px] card-glass p-7 sm:p-9 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
                  <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="mb-9 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 gold-gradient shadow-[0_8px_24px_rgba(201,169,98,0.3)]">
                        <Lock className="w-6 h-6 text-[#0B1A2A]" strokeWidth={2.5} />
                      </div>
                      <h1 className="text-[30px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] tracking-tight mb-4">
                        Bejelentkezés
                      </h1>
                      <div className="w-12 h-0.5 rounded-full gold-gradient mx-auto mb-5" />
                      <p className="text-[13px] text-[#F7F5F1]/60 font-medium px-2 leading-relaxed">
                        Kérjük, adja meg csoportvezetői hozzáférését a járműállapot nyomon követéséhez.
                      </p>
                    </div>

                    <div className="space-y-5 mb-7">
                      <div className="space-y-2">
                        <label className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#C9A962]/80 ml-1.5">
                          E-mail cím
                        </label>
                        <div
                          className={cn(
                            "relative flex items-center bg-[#0B1A2A]/60 border transition-all duration-300 rounded-2xl overflow-hidden",
                            error
                              ? "border-red-500/50 bg-red-500/10"
                              : "border-[#C9A962]/20 focus-within:border-[#C9A962]/60 focus-within:bg-[#0B1A2A]/80 focus-within:ring-[3px] focus-within:ring-[#C9A962]/15 hover:border-[#C9A962]/30"
                          )}
                        >
                          <Mail
                            className={cn(
                              "absolute left-4 w-4.5 h-4.5 transition-colors",
                              error ? "text-red-400" : "text-[#C9A962]/70"
                            )}
                          />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="csoportvezeto@pannon.hu"
                            className="w-full bg-transparent pl-12 pr-4 py-4 text-[15px] text-[#F7F5F1] placeholder:text-[#F7F5F1]/30 font-medium outline-none"
                            autoComplete="email"
                            spellCheck={false}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1.5 mr-1.5">
                          <label className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#C9A962]/80">
                            Jelszó
                          </label>
                        </div>
                        <div
                          className={cn(
                            "relative flex items-center bg-[#0B1A2A]/60 border transition-all duration-300 rounded-2xl overflow-hidden",
                            error
                              ? "border-red-500/50 bg-red-500/10"
                              : "border-[#C9A962]/20 focus-within:border-[#C9A962]/60 focus-within:bg-[#0B1A2A]/80 focus-within:ring-[3px] focus-within:ring-[#C9A962]/15 hover:border-[#C9A962]/30"
                          )}
                        >
                          <Lock
                            className={cn(
                              "absolute left-4 w-4.5 h-4.5 transition-colors",
                              error ? "text-red-400" : "text-[#C9A962]/70"
                            )}
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="••••••••"
                            className="w-full bg-transparent pl-12 pr-12 py-4 text-[15px] text-[#F7F5F1] placeholder:text-[#F7F5F1]/30 font-medium outline-none tracking-wider"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 w-9 h-9 flex items-center justify-center text-[#F7F5F1]/30 hover:text-[#C9A962] transition-colors rounded-xl"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-[16px] h-[16px]" />
                            ) : (
                              <Eye className="w-[16px] h-[16px]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2.5 mb-7 px-1.5 cursor-pointer group"
                      onClick={() => setRemember((v) => !v)}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-300 shrink-0",
                          remember
                            ? "bg-[#C9A962] border-[#C9A962] shadow-[0_4px_12px_rgba(201,169,98,0.4)]"
                            : "bg-transparent border-[#C9A962]/30 group-hover:border-[#C9A962]/60"
                        )}
                      >
                        {remember && <Check className="w-3.5 h-3.5 text-[#0B1A2A]" strokeWidth={3.5} />}
                      </div>
                      <span className="text-[13px] text-[#F7F5F1]/70 font-medium select-none group-hover:text-[#F7F5F1] transition-colors">
                        Emlékezzen rám
                      </span>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden mb-6"
                        >
                          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl">
                            <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                            <p className="text-[13px] text-red-300 font-medium leading-snug">{error}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full h-[58px] rounded-2xl text-[#0B1A2A] text-[15px] font-bold shadow-[0_12px_32px_-8px_rgba(201,169,98,0.5)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 gold-gradient" />
                      <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-out" />
                      <span className="relative z-10 flex items-center gap-2">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Belépés
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {state === "done" && (
              <motion.div
                key="card-done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center py-8 px-6"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 18 }}
                  className="w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center mb-7 shadow-[0_16px_44px_rgba(201,169,98,0.4)]"
                >
                  <Check className="w-9 h-9 text-[#0B1A2A]" strokeWidth={3} />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-[28px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] mb-3"
                >
                  Hitelesítve
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-[14px] text-[#F7F5F1]/60 font-medium mb-8"
                >
                  Átirányítás a járműállapot felületre...
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.45, duration: 0.8 }}
                  className="w-20 h-1 rounded-full bg-[#1a2d44] overflow-hidden"
                >
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-full h-full gold-gradient"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Minimal Footer - Mobile safe */}
      <div className="relative z-10 w-full pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 flex justify-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10.5px] text-[#F7F5F1]/35 font-medium uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Pannon Transfer
          </span>
          <span className="text-[9.5px] text-[#C9A962]/40 font-semibold uppercase tracking-[0.15em]">
            Csoportvezető Interface
          </span>
        </div>
      </div>
    </div>
  );
}
