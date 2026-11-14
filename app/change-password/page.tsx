"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword, getCurrentClientUser } from "@/lib/backend/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentClientUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setEmail(u.email);
      setMounted(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("As senhas digitadas não coincidem.");
      return;
    }

    setSaving(true);
    const res = await changeOwnPassword(password);
    if (!res.ok) {
      setErrorMsg(res.message);
      setSaving(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
        <div className="h-80 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <div className="text-center space-y-1 pb-6 border-b border-neutral-800/70">
          <h1 className="font-deadlock text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
            Definir <span className="text-amber-500">Nova Senha</span>
          </h1>
          <p className="text-xs text-neutral-400">
            Escolha uma nova senha para a conta <span className="font-mono text-neutral-200">{email}</span> antes de continuar.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
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

          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg border border-amber-500 bg-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Salvando..." : "Salvar Nova Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}