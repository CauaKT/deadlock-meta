"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiWakeOverlay } from "@/app/ApiWakeScreen";
import ApiWarmup from "@/app/ApiWarmup";
import {
  getCurrentClientUser,
  resendVerificationEmail,
  signInWithGoogle,
  signUpWithEmail,
  type ApiWakeStage,
} from "@/lib/backend/client";

function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
  if (!pwd) return { label: "", color: "", width: "0%" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { label: "Senha Fraca", color: "bg-rose-500", width: "33%" };
  if (score <= 4) return { label: "Senha Média", color: "bg-amber-400", width: "66%" };
  return { label: "Senha Forte", color: "bg-emerald-400", width: "100%" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    let active = true;
    void getCurrentClientUser().then((u) => {
      if (!active) return;
      if (u) {
        router.replace("/");
        return;
      }
      setMounted(true);
    });
    return () => {
      active = false;
    };
  }, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [googleWaking, setGoogleWaking] = useState(false);
  const [googleStage, setGoogleStage] = useState<ApiWakeStage>("connecting");
  const [googleElapsedMs, setGoogleElapsedMs] = useState(0);
  const googleAbortRef = useRef<AbortController | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setGoogleLoading(true);
    setGoogleStage("connecting");
    setGoogleElapsedMs(0);

    const controller = new AbortController();
    googleAbortRef.current = controller;
    const started = Date.now();
    const timer = setInterval(() => {
      setGoogleElapsedMs(Date.now() - started);
    }, 500);

    const result = await signInWithGoogle("/", {
      signal: controller.signal,
      onSlowWake: () => setGoogleWaking(true),
      onStage: setGoogleStage,
    });

    clearInterval(timer);
    if (!result.ok) {
      setGoogleWaking(false);
      setGoogleLoading(false);
      if (!result.aborted && result.message) {
        setErrorMsg(result.message);
      }
    }
  };

  const strength = getPasswordStrength(password);

  const resetForm = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setUsername("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);
    setSessionActive(false);
    setRegisteredEmail("");
    setResendMsg("");
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    const res = await resendVerificationEmail(registeredEmail);
    setResending(false);
    setResendMsg(res.message);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanNick = username.trim();
    if (cleanNick.length < 3 || cleanNick.length > 20) {
      setErrorMsg("O nome de usuário deve ter entre 3 e 20 caracteres.");
      return;
    }

    if (!/^[a-zA-Z0-9_\-\s]+$/.test(cleanNick)) {
      setErrorMsg("O nick não pode conter caracteres especiais além de traço e sublinhado.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg("As senhas digitadas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email.trim(), password, cleanNick);

    if (!result.ok) {
      setErrorMsg(result.message);
      setLoading(false);
      return;
    }

    setRegisteredEmail(email.trim());
    setSessionActive(result.sessionActive);
    setSuccessMsg(
      result.sessionActive
        ? "Conta criada e sessão iniciada! Você já pode usar o site e confirmar o e-mail depois."
        : "Conta criada com sucesso! Confirme o e-mail para poder entrar.",
    );
    setLoading(false);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
        <div className="h-96 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <div className="text-center space-y-1 pb-6 border-b border-neutral-800/70">
          <h1 className="font-deadlock text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
            Criar <span className="text-amber-500">Conta</span>
          </h1>
          <p className="text-xs text-neutral-400">
            Junte-se ao LockPro para gerenciar seu perfil e estatísticas de Deadlock.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs font-bold text-emerald-300 space-y-3">
            <p>{successMsg}</p>
            <p className="font-medium text-emerald-200/90">
              Enviamos o link para <strong>{registeredEmail}</strong>. Se não aparecer em alguns minutos, olhe a pasta de <strong>Spam</strong> ou promoções.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="cursor-pointer text-amber-400 underline hover:text-amber-300 disabled:opacity-50"
            >
              {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </button>
            {resendMsg && <p className="font-medium text-emerald-200/90">{resendMsg}</p>}
            <div className="flex gap-2 pt-1">
              {sessionActive && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    router.push("/welcome");
                    router.refresh();
                  }}
                  className="inline-block cursor-pointer rounded bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black"
                >
                  Continuar
                </button>
              )}
              <Link
                href="/login"
                onClick={resetForm}
                className={`${sessionActive ? "hidden" : "inline-block"} rounded bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black`}
              >
                Ir para o Login
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className={`${sessionActive ? "hidden" : "inline-block"} rounded border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase text-neutral-300 hover:text-white`}
              >
                Novo Cadastro
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="mt-6 space-y-3.5">
            <div className="space-y-1">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Nome de Usuário (Nick)
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Billy"
                className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2 pr-10 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 2l12 12M6.7 6.7a2 2 0 0 0 2.6 2.6M10.8 10.8C9.9 11.4 8.9 11.7 8 11.7c-3.6 0-6.6-2.5-7.5-6 .5-1.9 1.8-3.5 3.5-4.5" />
                    </svg>
                  ) : (
                    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M8 2.3c3.6 0 6.6 2.5 7.5 6-.9 3.5-3.9 6-7.5 6s-6.6-2.5-7.5-6c.9-3.5 3.9-6 7.5-6z" />
                      <circle cx="8" cy="8.3" r="2" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Barra de Força da Senha */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-400 text-right">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repita sua senha"
                className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Registrar Conta</span>
              )}
            </button>
          </form>
        )}

        <ApiWarmup />
        <ApiWakeOverlay
          open={googleWaking}
          stage={googleStage}
          elapsedMs={googleElapsedMs}
          onCancelAction={() => {
            googleAbortRef.current?.abort();
            setGoogleWaking(false);
            setGoogleLoading(false);
          }}
        />

        {!successMsg && (
          <>
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-neutral-800" />
              <span className="absolute bg-[#0a0d0c] px-3 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-500">
                ou
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900/90 py-2.5 px-4 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-[#f4efe6] transition-all hover:border-neutral-500 hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? "Conectando..." : "Continuar com o Google"}</span>
            </button>
          </>
        )}
        <div className="mt-6 text-center text-xs text-neutral-400">
          Já possui conta?{" "}
          <Link href="/login" className="font-bold text-amber-400 hover:text-amber-300 underline">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}