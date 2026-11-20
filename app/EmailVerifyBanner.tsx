"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getCurrentClientUser,
  resendVerificationEmail,
  subscribeToAuthChanges,
} from "@/lib/backend/client";
import type { AuthUser } from "@/lib/backend/types";

const HIDDEN_ROUTES = new Set(["/login", "/register", "/reset-password", "/welcome"]);

export default function EmailVerifyBanner() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const sync = (u: AuthUser | null) => {
      setUser(u);
      setFeedback(null);
      if (!u) {
        setDismissed(false);
        return;
      }
      try {
        setDismissed(sessionStorage.getItem(`lockpro_dismiss_verify_${u.id}`) === "1");
      } catch {
        setDismissed(false);
      }
    };

    void getCurrentClientUser().then(sync);
    return subscribeToAuthChanges(sync);
  }, []);

  if (
    !user ||
    user.emailVerified ||
    !user.emailVerificationRequired ||
    dismissed ||
    HIDDEN_ROUTES.has(pathname)
  ) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    setFeedback(null);
    const res = await resendVerificationEmail(user.email);
    setSending(false);
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`lockpro_dismiss_verify_${user.id}`, "1");
    } catch {}
  };

  return (
    <div className="border-t border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-neutral-950/90">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div className="min-w-0 text-xs sm:text-[13px] leading-snug">
            <p className="text-neutral-200">
              <span className="font-bold text-amber-400">Confirme seu e-mail:</span>{" "}
              enviamos o link para{" "}
              <span className="font-semibold text-white">{user.email}</span>.
              <span className="text-neutral-400"> Confira também a pasta de Spam.</span>
            </p>
            {feedback && (
              <p
                className={`mt-0.5 text-xs font-semibold ${
                  feedback.ok ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {feedback.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="cursor-pointer px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Reenviar e-mail"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar aviso de verificação"
            className="cursor-pointer w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors text-base leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}