"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanNick = username.trim();
    if (cleanNick.length < 3) {
      setErrorMsg("O nome de usuário deve ter pelo menos 3 caracteres.");
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

    if (password.length < 6) {
      setErrorMsg("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: cleanNick,
        },
      },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        setErrorMsg("Este e-mail já está cadastrado.");
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

    // Se a confirmação de e-mail estiver desativada no Supabase, a sessão já é criada na hora
    if (data.session) {
      router.push("/profile");
      router.refresh();
    } else {
      setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail para ativar seu cadastro.");
      setLoading(false);
    }
  };

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
            <Link
              href="/login"
              className="inline-block rounded bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black"
            >
              Ir para o Login
            </Link>
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
                placeholder="Ex: Kaito"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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
                type={showPassword ? "text" : "password"}
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