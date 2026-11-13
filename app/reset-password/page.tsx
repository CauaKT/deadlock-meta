"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/backend/client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    const res = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!res.ok) setErrorMsg(res.message);
    else setSuccessMsg(res.message);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordWithToken(token, newPassword);
    setLoading(false);
    if (!res.ok) setErrorMsg(res.message);
    else setSuccessMsg(res.message);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
      <div className="text-center space-y-1 pb-6 border-b border-neutral-800/70">
        <h1 className="font-deadlock text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
          {token ? "Nova " : "Recuperar "}
          <span className="text-amber-500">Senha</span>
        </h1>
        <p className="text-xs text-neutral-400">
          {token
            ? "Escolha uma nova senha com no mínimo 8 caracteres."
            : "Informe seu e-mail para receber o link de redefinição."}
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
          {errorMsg}
        </div>
      )}

      {successMsg ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs font-bold text-emerald-300">
            {successMsg}
          </div>
          <Link
            href="/login"
            className="block w-full text-center rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110"
          >
            Ir para o Login
          </Link>
        </div>
      ) : token ? (
        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Salvando..." : "Redefinir Senha"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequest} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              E-mail cadastrado
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
          </button>
          <p className="text-center text-xs text-neutral-400">
            <Link href="/login" className="text-amber-400 hover:underline">
              Voltar para o login
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <Suspense fallback={<div className="h-80 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}