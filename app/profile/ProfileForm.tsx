"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PublishedTierList } from "@/app/tier-maker/TierMakerClient";

interface HeroOption {
  id: number;
  name: string;
  image: string;
  banner?: string;
  rgb?: [number, number, number];
}

interface ProfileData {
  id: string;
  username: string;
  avatar_url?: string | null;
  steam_id: string;
  favorite_hero_id: number | null;
  createdAt: string;
}

const STORAGE_KEY = "lockpro_community_tierlists";

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
  const [activeTab, setActiveTab] = useState<"overview" | "tierlists" | "settings">("overview");

  // Estados do formulário de edição
  const [username, setUsername] = useState(initialProfile.username || "");
  const [steamId, setSteamId] = useState(initialProfile.steam_id || "");
  const [favoriteHeroId, setFavoriteHeroId] = useState<number | null>(initialProfile.favorite_hero_id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tier lists criadas pelo usuário (lidas do localStorage)
  const [savedTierLists, setSavedTierLists] = useState<PublishedTierList[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSavedTierLists(JSON.parse(saved));
    } catch {}
  }, []);

  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const selectedHero = heroesById.get(favoriteHeroId ?? -1);
  const heroColor = selectedHero?.rgb ? `rgb(${selectedHero.rgb.join(",")})` : "#f59e0b";
  const avatarImage = initialProfile.avatar_url || selectedHero?.image;

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
      {/* ========================================================================= */}
      {/* 1. HEADER CINEMÁTICO GAMER (IDÊNTICO À REFERÊNCIA)                       */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-800/90 bg-[#0a0d0c] shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
        {/* Banner Panorâmico */}
        <div className="relative h-44 sm:h-60 md:h-72 w-full overflow-hidden bg-neutral-900">
          {selectedHero?.banner ? (
            <img
              src={selectedHero.banner}
              alt=""
              className="h-full w-full object-cover object-top filter brightness-80 transition-all duration-700"
            />
          ) : (
            <div
              className="h-full w-full bg-cover bg-center opacity-25"
              style={{ backgroundImage: "url('/bg.webp')" }}
            />
          )}
          {/* Vinheta escura nas bordas e fusão na base */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d0c] via-[#0a0d0c]/30 to-black/40" />

          {/* Botão de Atalho para Configurações no canto superior do Banner */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              title="Personalizar Perfil"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/80 bg-black/60 text-neutral-300 backdrop-blur-md transition-all hover:border-amber-400 hover:text-amber-400 hover:scale-105 cursor-pointer shadow-lg"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da Conta"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/80 bg-black/60 text-neutral-400 backdrop-blur-md transition-all hover:border-rose-500 hover:text-rose-400 hover:scale-105 cursor-pointer shadow-lg"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Informações de Perfil e Estatísticas Sobrepostas */}
        <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-14 sm:-mt-16">
            
            {/* Bloco de Avatar e Identidade */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar Circular Sobreposto */}
              <div
                className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-[#0c100e] shadow-[0_0_30px_rgba(0,0,0,0.9)]"
                style={{
                  borderColor: heroColor,
                  boxShadow: `0 0 24px color-mix(in srgb, ${heroColor} 45%, transparent)`,
                }}
              >
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={username || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-deadlock text-4xl font-black text-amber-500">
                    {(username || "LP").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nome, E-mail e Badges */}
              <div className="text-center sm:text-left space-y-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="font-deadlock truncate text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#f4efe6]">
                    {username || "Sem Nickname"}
                  </h1>
                  <span className="rounded-[4px] bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Conta LockPro
                  </span>
                </div>
                <p className="text-xs font-mono text-neutral-400 truncate">{userEmail}</p>
                <p className="text-xs text-neutral-300">
                  Na Cidade Amaldiçoada desde{" "}
                  <strong className="text-neutral-200">{initialProfile.createdAt}</strong>
                </p>
              </div>
            </div>

            {/* Ação Rápida: Alternar para aba de Configurações */}
            <div className="flex justify-center sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "settings" ? "overview" : "settings")}
                className="rounded-xl border border-neutral-700 bg-neutral-900/90 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] transition-all hover:border-amber-400 hover:bg-neutral-800 cursor-pointer shadow-sm"
              >
                {activeTab === "settings" ? "Visualizar Perfil" : "Editar Perfil"}
              </button>
            </div>
          </div>

          {/* Barra Horizontal de Métricas do Jogador (Igual ao Modelo de Referência) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-neutral-800/80 pt-5 text-center sm:text-left">
            <div className="rounded-xl border border-neutral-800/80 bg-black/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Herói Assinatura
              </span>
              <p style={{ color: heroColor }} className="font-deadlock text-base font-black truncate mt-0.5">
                {selectedHero?.name || "Nenhum"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Vínculo com Deadlock
              </span>
              <p className="font-deadlock text-base font-black text-[#f4efe6] truncate mt-0.5">
                {steamId ? "Steam Conectada" : "Pendente"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Tier Lists Criadas
              </span>
              <p className="font-deadlock text-base font-black text-amber-400 mt-0.5">
                {savedTierLists.length} {savedTierLists.length === 1 ? "Lista" : "Listas"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Status da Cidade
              </span>
              <p className="font-deadlock text-base font-black text-emerald-400 mt-0.5">
                Iniciado Ativo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGAÇÃO EM ABAS (ESTILO GAMER DA REFERÊNCIA)                */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-amber-500 text-black shadow-[0_2px_12px_rgba(245,158,11,0.3)]"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          <span>Visão Geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tierlists")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "tierlists"
              ? "bg-amber-500 text-black shadow-[0_2px_12px_rgba(245,158,11,0.3)]"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          <span>Minhas Tier Lists</span>
          <span className="rounded bg-black/30 px-1.5 py-0.2 text-[10px] font-black">
            {savedTierLists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-amber-500 text-black shadow-[0_2px_12px_rgba(245,158,11,0.3)]"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          <span>Configurações</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DINÂMICO DAS ABAS                                            */}
      {/* ========================================================================= */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Card Destaque do Herói Favorito */}
          {selectedHero ? (
            <div className="relative overflow-hidden rounded-3xl border border-neutral-800/90 bg-[#0a0d0c] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 z-10 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  Herói Selecionado em Destaque
                </span>
                <h3 className="font-deadlock text-3xl font-black text-[#f4efe6]">
                  {selectedHero.name}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md">
                  Seu perfil está sintonizado com os atributos deste herói. O banner, tema de cores e preferências visuais são personalizados automaticamente.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/heroes/${selectedHero.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    <span>Ver Habilidades & Builds</span>
                    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12 12 4M6 4h6v6" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Render do Herói */}
              <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 shadow-inner flex items-center justify-center">
                <img
                  src={selectedHero.image}
                  alt={selectedHero.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center space-y-3">
              <p className="font-deadlock text-lg font-black text-neutral-300">
                Nenhum Herói Assinatura Selecionado
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Escolha seu herói favorito nas configurações para personalizar a capa e as cores de destaque do seu perfil.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
              >
                Definir Herói Agora
              </button>
            </div>
          )}

          {/* Resumo das Tier Lists do Usuário */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
                Vitrines de Classificação
              </h3>
              <Link
                href="/tier-maker"
                className="font-deadlock text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Criar Nova Tier List →
              </Link>
            </div>

            {savedTierLists.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-6 text-center text-xs text-neutral-500">
                Você ainda não publicou nenhuma tier list. Acesse o{" "}
                <Link href="/tier-maker" className="text-amber-400 font-bold underline">
                  TierMaker
                </Link>{" "}
                para criar e salvar sua classificação.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedTierLists.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-4 space-y-2 shadow-lg"
                  >
                    <p className="font-deadlock text-base font-black text-[#f4efe6] truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Publicada em {item.createdAt} • {item.tiers.length} categorias
                    </p>
                    <div className="pt-1">
                      <Link
                        href="/tier-maker"
                        className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400 hover:underline"
                      >
                        Ver no TierMaker →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: MINHAS TIER LISTS */}
      {activeTab === "tierlists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
              Minhas Classificações Publicadas
            </h3>
            <Link
              href="/tier-maker"
              className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-1.5 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
            >
              Criar no TierMaker
            </Link>
          </div>

          {savedTierLists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-xs text-neutral-500">
              Nenhuma tier list salva neste navegador. Monte sua lista e clique em &quot;Publicar no Site&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedTierLists.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5 space-y-3 shadow-xl"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-deadlock text-lg font-black text-[#f4efe6] truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {item.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Contém {item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0)} heróis distribuídos.
                  </p>
                  <Link
                    href="/tier-maker"
                    className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-deadlock text-xs font-black uppercase text-amber-400 hover:border-amber-400 transition-colors"
                  >
                    Abrir no Editor
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: CONFIGURAÇÕES E FORMULÁRIO DE EDIÇÃO */}
      {activeTab === "settings" && (
        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-neutral-800/90 bg-[#0a0d0c] p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6"
        >
          <div className="border-b border-neutral-800/80 pb-4">
            <h2 className="font-deadlock text-xl font-black uppercase tracking-wider text-[#f4efe6]">
              Personalizar Perfil
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Atualize seus dados de exibição pública e vincule seu código de Deadlock.
            </p>
          </div>

          {message && (
            <div
              className={`rounded-xl p-3.5 text-xs font-bold border transition-all ${
                message.type === "success"
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                  : "border-rose-500/40 bg-rose-950/30 text-rose-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                className="w-full rounded-xl border border-neutral-800 bg-black/60 px-4 py-2.5 text-sm font-semibold text-[#f4efe6] focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Herói Favorito (Define Tema e Banner)
              </label>
              <select
                value={favoriteHeroId ?? ""}
                onChange={(e) => setFavoriteHeroId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-neutral-800 bg-black/60 px-4 py-2.5 text-sm font-semibold text-[#f4efe6] focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
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
              className="w-full rounded-xl border border-neutral-800 bg-black/60 px-4 py-2.5 text-sm font-mono text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-neutral-400">
              Utilizado para sincronização de estatísticas táticas e win rate individual nas próximas atualizações.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="group inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-2.5 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_14px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}