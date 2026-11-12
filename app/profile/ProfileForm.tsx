"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeroOption {
  id: number;
  name: string;
  image: string;
}

interface ProfileData {
  id: string;
  username: string;
  steam_id: string;
  favorite_hero_id: number | null;
}

export default function ProfileForm({
  initialProfile,
  heroes,
  userEmail,
}: {
  initialProfile: ProfileData;
  heroes: HeroOption[];
  userEmail: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialProfile.username || "");
  const [steamId, setSteamId] = useState(initialProfile.steam_id || "");
  const [favoriteHeroId, setFavoriteHeroId] = useState<number | null>(initialProfile.favorite_hero_id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedHero = heroes.find((h) => h.id === favoriteHeroId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        steam_id: steamId.trim(),
        favorite_hero_id: favoriteHeroId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", initialProfile.id);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Erro ao salvar alterações: " + error.message });
      return;
    }

    setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    router.refresh();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Card de Visualização do Perfil / Identidade */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-900/40 p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-black/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          {selectedHero?.image ? (
            <img src={selectedHero.image} alt={selectedHero.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-deadlock text-2xl font-black text-amber-500">
              {(username || "LP").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="font-deadlock truncate text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
              {username || "Sem Nickname"}
            </h2>
            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-400">
              Conta LockPro
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono truncate">{userEmail}</p>
          <p className="text-xs text-neutral-300 pt-1">
            Herói Favorito:{" "}
            <strong className="text-amber-400">{selectedHero?.name || "Nenhum selecionado"}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-neutral-700 bg-neutral-900/90 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400 hover:border-rose-500/60 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
        >
          Sair da Conta
        </button>
      </div>

      {/* Formulário de Edição */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-neutral-800/90 bg-neutral-950/80 p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-5"
      >
        <div className="border-b border-neutral-800/80 pb-3">
          <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
            Personalizar Perfil
          </h3>
          <p className="text-xs text-neutral-400">
            Atualize seus dados de exibição e vincule sua conta do Deadlock.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-xs font-bold border ${
              message.type === "success"
                ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                : "border-rose-500/40 bg-rose-950/30 text-rose-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Nome de Usuário (Nick)
            </label>
            <input
              type="text"
              required
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Herói Favorito (Avatar)
            </label>
            <select
              value={favoriteHeroId ?? ""}
              onChange={(e) => setFavoriteHeroId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Selecione um herói...</option>
              {heroes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Steam ID ou Friend Code de Deadlock
            </label>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
              Opcional
            </span>
          </div>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="Ex: 76561198000000000 ou seu código de amigo"
            className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm font-mono text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
          />
          <p className="text-[11px] text-neutral-400">
            Necessário para carregar suas estatísticas individuais de partidas e taxa de vitória com cada herói.
          </p>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-amber-500 bg-amber-500 px-6 py-2.5 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}