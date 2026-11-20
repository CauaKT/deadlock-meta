"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiWakeOverlay } from "@/app/ApiWakeScreen";
import ApiWarmup from "@/app/ApiWarmup";
import {
  getCurrentClientUser,
  resendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithSteam,
  type ApiWakeStage,
} from "@/lib/backend/client";
import type { AuthUser } from "@/lib/backend/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get("next") || "/";
  const verifiedParam = searchParams.get("verified");
  const errorParam = searchParams.get("error");

  const [mounted, setMounted] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleWaking, setGoogleWaking] = useState(false);
  const [googleStage, setGoogleStage] = useState<ApiWakeStage>("connecting");
  const [googleElapsedMs, setGoogleElapsedMs] = useState(0);
  const googleAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentClientUser().then((u) => {
      if (!active) return;
      if (verifiedParam === "1") {
        if (u) {
          setVerifiedUser(u);
        } else {
          setInfoMsg("E-mail confirmado com sucesso! Já pode entrar na sua conta.");
        }
        setMounted(true);
        return;
      }

      if (errorParam === "invalid-verification-token") {
        setErrorMsg("Link de confirmação inválido ou expirado.");
        setMounted(true);
        return;
      } else if (errorParam === "google-not-configured") {
        setErrorMsg("Login com Google ainda não está configurado na API.");
        setMounted(true);
        return;
      } else if (errorParam === "auth-callback-failed") {
        setErrorMsg("Não foi possível concluir o login com Google.");
        setMounted(true);
        return;
      }

      if (u) {
        router.replace("/");
        return;
      }
      setMounted(true);
    });
    return () => {
      active = false;
    };
  }, [verifiedParam, errorParam, router]);

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

    const result = await signInWithGoogle(nextRoute, {
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

  const handleSteamLogin = async () => {
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

    const result = await signInWithSteam(nextRoute, {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setCanResend(false);
    setLoading(true);

    const result = await signInWithEmail(email.trim(), password);
    if (!result.ok) {
      setErrorMsg(result.message);
      setCanResend(Boolean(result.unverified));
      setLoading(false);
      return;
    }

    router.push(nextRoute);
    router.refresh();
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    const res = await resendVerificationEmail(email.trim());
    setResending(false);
    if (res.ok) {
      setErrorMsg("");
      setCanResend(false);
      setInfoMsg(res.message);
    } else {
      setErrorMsg(res.message);
    }
  };

  if (!mounted) {
    return <div className="h-96 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />;
  }

  if (verifiedUser) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md text-center space-y-5">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <svg aria-hidden viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="font-deadlock text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
            Conta <span className="text-emerald-400">Verificada</span>
          </h1>
          <p className="text-xs text-neutral-400">
            O e-mail <span className="font-semibold text-neutral-200">{verifiedUser.email}</span> foi confirmado com sucesso.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/profile"
            className="flex-1 rounded-lg bg-amber-500 py-2.5 px-4 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 transition-all"
          >
            Ir para o Perfil
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 px-4 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] hover:border-neutral-500 transition-colors"
          >
            Página Inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
      <div className="text-center space-y-1 pb-6 border-b border-neutral-800/70">
        <h1 className="font-deadlock text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
          Acessar <span className="text-amber-500">LockPro</span>
        </h1>
        <p className="text-xs text-neutral-400">
          Entre com suas credenciais para sincronizar seu perfil e estatísticas.
        </p>
      </div>

      {infoMsg && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs font-bold text-emerald-300">
          {infoMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300 space-y-2">
          <p>{errorMsg}</p>
          {canResend && (
            <p className="font-medium text-rose-200/80">
              O link foi enviado ao e-mail cadastrado. Olhe também a pasta de Spam.
            </p>
          )}
          {canResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-amber-400 underline hover:text-amber-300 cursor-pointer disabled:opacity-50"
            >
              {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </button>
          )}
        </div>
      )}

      {/* Formulário com E-mail e Senha primeiro */}
      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div className="space-y-1.5">
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
            className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Senha
            </label>
            <Link
              href="/reset-password"
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 pr-10 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <span>Autenticando...</span>
            </>
          ) : (
            <span>Entrar na Conta</span>
          )}
        </button>
      </form>

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

      {/* Divisor Visual */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-neutral-800" />
        <span className="absolute bg-[#0a0d0c] px-3 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-500">
          ou
        </span>
      </div>

      {/* Botão do Google abaixo */}
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

      <button
        type="button"
        onClick={handleSteamLogin}
        disabled={googleLoading || loading}
        className="mt-2.5 flex w-full items-center justify-center gap-3 rounded-lg border border-[#1b2838] bg-[#171a21] py-2.5 px-4 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-[#c7d5e0] transition-all hover:border-[#66c0f4]/60 hover:bg-[#1b2838] hover:text-white active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
          <path d="M11.98 0C5.63 0 .44 4.94.03 11.19l6.43 2.66a3.38 3.38 0 0 1 1.9-.58c.07 0 .14 0 .2.01l2.86-4.14v-.06a4.5 4.5 0 1 1 4.5 4.5h-.1l-4.08 2.91c0 .06.01.12.01.18a3.38 3.38 0 0 1-6.7.61L.44 15.36A12 12 0 1 0 11.98 0zm-4.5 17.51-1.46-.6a2.54 2.54 0 0 0 4.65.17 2.54 2.54 0 0 0-3.19-3.44l1.51.62a1.87 1.87 0 0 1-1.51 3.25zm11.02-8.43a3 3 0 1 0-6 0 3 3 0 0 0 6 0zm-5.25 0a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0z" />
        </svg>
        <span>{googleLoading ? "Conectando..." : "Continuar com a Steam"}</span>
      </button>

      <div className="mt-6 text-center text-xs text-neutral-400">
        Não tem uma conta?{" "}
        <Link href="/register" className="font-bold text-amber-400 hover:text-amber-300 underline">
          Cadastre-se gratuitamente
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <Suspense fallback={<div className="h-96 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}