"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);

      // Se já possui username preenchido, libera para a home
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", u.id)
        .maybeSingle();

      if (profile?.username && profile.username.trim() !== "") {
        router.push("/");
        return;
      }

      // Sugere o nome do Google ou o prefixo do e-mail
      const suggestedName =
        u.user_metadata?.full_name?.split(" ")[0] ||
        u.user_metadata?.name?.split(" ")[0] ||
        u.email?.split("@")[0] ||
        "";

      setNickname(suggestedName.slice(0, 20));
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const clean = nickname.trim();
    if (clean.length < 3) {
      setErrorMsg("O apelido deve ter no mínimo 3 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(clean)) {
      setErrorMsg("O apelido só pode conter letras, números, espaços, traço e sublinhado.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (!user) return;

    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    // Salva ou atualiza a tabela profiles com upsert
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      username: clean,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setErrorMsg("Erro ao salvar perfil: " + profileError.message);
      setSaving(false);
      return;
    }

    // Atualiza metadados do usuário para sincronização imediata
    await supabase.auth.updateUser({
      data: { username: clean },
    });

    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
        <div className="h-80 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/95 p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-3 pb-5 border-b border-neutral-800/80">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/60 bg-neutral-900 shadow-[0_0_24px_rgba(245,158,11,0.3)]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-neutral-400" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="font-deadlock text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
              Bem-vindo ao <span className="text-amber-500">LockPro</span>
            </h1>
            <p className="text-xs text-neutral-400">
              Conta do Google conectada. Escolha como você quer ser identificado na plataforma.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Formulário de Nickname */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Seu Apelido / Nickname
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Kaito"
              className="w-full rounded-lg border border-neutral-700 bg-black/60 px-3.5 py-2.5 font-deadlock text-base tracking-wide text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Você poderá alterar este nome a qualquer momento em seu perfil.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-2 rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_14px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>Entrar na Cidade Amaldiçoada →</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}