"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PublishedTierList } from "@/app/tier-maker/TierMakerClient";
import { AvatarEditButton, BannerEditOverlay } from "./ProfileEditControls";
import ProfileBanner, { type BannerMode } from "./ProfileBanner";
import ProfileBannerEditor from "./ProfileBannerEditor";

interface HeroOption {
  id: number;
  name: string;
  image: string;
  banner?: string;
  art: string;
  tagBg: string;
  playable: boolean;
  rgb?: [number, number, number];
}

interface ProfileData {
  id: string;
  username: string;
  bio?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  steam_id: string;
  favorite_hero_id: number | null;
  banner_hero_id: number | null;
  banner_image: string | null;
  createdAt: string;
}

const STORAGE_KEY = "lockpro_community_tierlists";

export default function ProfileForm({
  initialProfile,
  heroes,
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
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [handle, setHandle] = useState(initialProfile.handle || "");
  const [favoriteHeroId, setFavoriteHeroId] = useState<number | null>(initialProfile.favorite_hero_id);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url ?? null);
  const [lookSaving, setLookSaving] = useState(false);
  const [lookError, setLookError] = useState("");
  const [snapshot, setSnapshot] = useState<{
    mode: BannerMode;
    heroId: number | null;
    image: string | null;
    avatar: string | null;
    username: string;
    bio: string;
    handle: string;
  } | null>(null);
  const [bannerMode, setBannerMode] = useState<BannerMode>(
    initialProfile.banner_image ? "custom" : initialProfile.banner_hero_id != null ? "hero" : "default",
  );
  const [bannerHeroId, setBannerHeroId] = useState<number | null>(initialProfile.banner_hero_id);
  const [bannerImage, setBannerImage] = useState<string | null>(initialProfile.banner_image);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bio cresce conforme o texto, sem barra de rolagem
  const bioRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [bio, editing]);

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
  const avatarImage = avatarUrl || selectedHero?.image;
  const bannerHero = heroesById.get((bannerMode === "hero" ? bannerHeroId : favoriteHeroId) ?? -1) ?? null;
  const bannerNode =
    bannerMode === "custom" && bannerImage ? (
      <ProfileBanner customImage={bannerImage} />
    ) : bannerHero ? (
      <ProfileBanner hero={bannerHero} />
    ) : null;

  const startEdit = () => {
    setSnapshot({ mode: bannerMode, heroId: bannerHeroId, image: bannerImage, avatar: avatarUrl, username, bio, handle });
    setLookError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    if (snapshot) {
      setBannerMode(snapshot.mode);
      setBannerHeroId(snapshot.heroId);
      setBannerImage(snapshot.image);
      setAvatarUrl(snapshot.avatar);
      setUsername(snapshot.username);
      setBio(snapshot.bio);
      setHandle(snapshot.handle);
    }
    setSnapshot(null);
    setLookError("");
    setEditing(false);
  };

  const saveLook = async () => {
    const cleanName = username.trim();
    if (cleanName.length < 3) {
      setLookError("O apelido deve ter no mínimo 3 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(cleanName)) {
      setLookError("O apelido só pode conter letras, números, espaços, traço e sublinhado.");
      return;
    }
    const cleanHandle = handle.trim();
    if (cleanHandle && cleanHandle.length < 3) {
      setLookError("O @ deve ter de 3 a 20 caracteres (minúsculas, números e _).");
      return;
    }
    setLookSaving(true);
    setLookError("");
    const { error } = await createClient()
      .from("profiles")
      .update({
        username: cleanName,
        bio: bio.trim() || null,
        handle: cleanHandle || null,
        avatar_url: avatarUrl,
        banner_hero_id: bannerMode === "hero" ? bannerHeroId : null,
        banner_image: bannerMode === "custom" ? bannerImage : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", initialProfile.id);
    setLookSaving(false);
    if (error) {
      console.error("saveLook:", error);
      setLookError(
        error.code === "23505" && error.message.includes("handle")
          ? "Esse @ já está em uso."
          : "Não foi possível salvar. Tente novamente.",
      );
      return;
    }
    setUsername(cleanName);
    setBio(bio.trim());
    setSnapshot(null);
    setEditing(false);
    const target = cleanHandle ? `/profile/${cleanHandle}` : "/profile";
    if (target !== window.location.pathname) router.replace(target);
    else router.refresh();
  };

  const tabClass = (tab: typeof activeTab) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-deadlock text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
      activeTab === tab
        ? "border-amber-500 text-[#f4efe6]"
        : "border-transparent text-neutral-400 hover:text-white"
    }`;

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
        banner_hero_id: bannerMode === "hero" ? bannerHeroId : null,
        banner_image: bannerMode === "custom" ? bannerImage : null,
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

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER CINEMÁTICO GAMER (IDÊNTICO À REFERÊNCIA)                       */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-b-3xl border border-t-0 border-neutral-800/90 bg-[#0a0d0c] shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
        {/* Banner Panorâmico */}
        <div className="relative h-40 sm:h-52 md:h-60 w-full overflow-hidden bg-neutral-900">
{bannerNode ? (
            bannerNode
          ) : selectedHero?.banner ? (
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

          {editing && (
            <>
              <BannerEditOverlay
                heroes={heroes}
                heroId={bannerHeroId}
                canReset={bannerMode !== "default"}
                onImage={(data) => {
                  setBannerImage(data);
                  setBannerMode("custom");
                }}
                onHero={(id) => {
                  setBannerHeroId(id);
                  setBannerMode("hero");
                }}
                onReset={() => {
                  setBannerMode("default");
                  setBannerHeroId(null);
                  setBannerImage(null);
                }}
                onError={setLookError}
              />
            </>
          )}

          {/* Lápis (visualização) ou Cancelar/Salvar (modo edição) no canto superior do Banner */}
          <div className="absolute right-4 top-4 z-20 flex flex-wrap items-center justify-end gap-2">
            {editing ? (
              <>
                {lookError && <span className="rounded bg-black/70 px-2 py-1 text-xs text-rose-400">{lookError}</span>}
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={lookSaving}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-black/70 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] backdrop-blur-md transition-colors hover:border-neutral-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveLook}
                  disabled={lookSaving}
                  className="cursor-pointer rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-[filter] hover:brightness-110 disabled:opacity-50"
                >
                  {lookSaving ? "Salvando..." : "Salvar"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                title="Personalizar Perfil"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/80 bg-black/60 text-neutral-300 backdrop-blur-md transition-all hover:border-amber-400 hover:text-amber-400 hover:scale-105 cursor-pointer shadow-lg"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Informações de Perfil e Estatísticas Sobrepostas */}
        <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-14 sm:-mt-16">
            
            {/* Bloco de Avatar e Identidade */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar Circular Sobreposto */}
              <div
                className="relative z-30 flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-[#0c100e] shadow-[0_0_30px_rgba(0,0,0,0.9)]"
                style={{
                  borderColor: heroColor,
                  boxShadow: `0 0 24px color-mix(in srgb, ${heroColor} 45%, transparent)`,
                }}
              >
                {editing && <AvatarEditButton onImageAction={setAvatarUrl} onErrorAction={setLookError} />}
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
              <div className="text-center sm:text-left space-y-1 min-w-0 sm:mt-[5.5rem]">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  {editing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      placeholder="Seu apelido"
                      aria-label="Apelido"
                      className="font-deadlock w-full min-w-0 rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2 py-0.5 text-center text-3xl font-black uppercase tracking-tight text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none sm:w-72 sm:text-left sm:text-4xl"
                    />
                  ) : (
                    <h1 className="font-deadlock truncate text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#f4efe6]">
                      {username || "Sem Nickname"}
                    </h1>
                  )}
                </div>
                {editing ? (
                  <div className="flex items-center justify-center gap-1 sm:justify-start">
                    <span className="font-mono text-sm text-neutral-500">@</span>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                      maxLength={20}
                      placeholder="seu_usuario"
                      aria-label="@ do perfil"
                      className="w-40 rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2 py-0.5 font-mono text-sm text-neutral-300 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  handle && <p className="font-mono text-sm text-neutral-400">@{handle}</p>
                )}
                {editing ? (
                  <div className="space-y-0.5">
                    <textarea
                      ref={bioRef}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={160}
                      rows={2}
                      placeholder="Escreva uma bio..."
                      aria-label="Bio"
                      className="w-full resize-none overflow-hidden rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none sm:w-96"
                    />
                    <p className="text-right text-[10px] text-neutral-500 sm:w-96">{bio.length}/160</p>
                  </div>
                ) : (
                  bio && <p className="max-w-md whitespace-pre-line break-words text-sm text-neutral-300">{bio}</p>
                )}
              </div>
            </div>

            {/* Ação Rápida: Alternar para aba de Configurações */}
            <div className="flex justify-center sm:justify-end sm:self-start sm:mt-[5.75rem]">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "settings" ? "overview" : "settings")}
                className="rounded-xl border border-neutral-700 bg-neutral-900/90 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] transition-all hover:border-amber-400 hover:bg-neutral-800 cursor-pointer shadow-sm"
              >
                {activeTab === "settings" ? "Visualizar Perfil" : "Editar Perfil"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGAÇÃO EM ABAS (ESTILO GAMER DA REFERÊNCIA)                */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={tabClass("overview")}
        >
          <span>Visão Geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tierlists")}
          className={tabClass("tierlists")}
        >
          <span>Minhas Tier Lists</span>
          <span className="rounded bg-black/30 px-1.5 py-0.2 text-[10px] font-black">
            {savedTierLists.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DINÂMICO DAS ABAS                                            */}
      {/* ========================================================================= */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5">
            <h3 className="border-l-2 border-amber-500 pl-2 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              Atividade
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Tier lists salvas</dt>
                <dd className="font-deadlock text-base font-black text-amber-400">{savedTierLists.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Heróis classificados</dt>
                <dd className="font-deadlock text-base font-black text-amber-400">
                  {savedTierLists.reduce(
                    (acc, tl) => acc + tl.tiers.reduce((sum, t) => sum + (t.heroes?.length || 0), 0),
                    0
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-neutral-500">
              As tier lists ficam salvas apenas neste navegador.
            </p>
          </section>
        </aside>
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
              <ProfileBannerEditor
                heroes={heroes}
                mode={bannerMode}
                onMode={setBannerMode}
                heroId={bannerHeroId}
                onHero={setBannerHeroId}
                customImage={bannerImage}
                onCustomImage={setBannerImage}
              />
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Herói Favorito (Define Tema e Banner Padrão)
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