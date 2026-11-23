"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SlantFrame from "@/components/ui/SlantFrame";
import type { AuthUser } from "@/lib/backend/types";

export interface LfgHeroOption {
  id: number;
  name: string;
  image: string | null;
}

export interface LfgPostItem {
  id: string;
  region: string;
  rankTier: string;
  mode: string;
  heroIds: number[];
  note: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  canDelete: boolean;
}

const REGIONS = [
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

const RANKS = [
  "Iniciado",
  "Aspirante",
  "Acólito",
  "Alquimista",
  "Arcanista",
  "Ritualista",
  "Emissário",
  "Arconte",
  "Oráculo",
  "Fantasma",
  "Ascendente",
  "Eterno",
];

const MODES = [
  { id: "duo", label: "Duo" },
  { id: "team", label: "Time Fechado" },
  { id: "tournament", label: "Torneio" },
];

export default function LfgClient({
  heroes,
  initialPosts,
  initialUser,
}: {
  heroes: LfgHeroOption[];
  initialPosts: LfgPostItem[];
  initialUser: AuthUser | null;
}) {
  const { confirm, modal } = useConfirm();
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [posts, setPosts] = useState<LfgPostItem[]>(initialPosts);
  const [region, setRegion] = useState("SAmerica");
  const [rankTier, setRankTier] = useState("Ritualista");
  const [mode, setMode] = useState("duo");
  const [heroIds, setHeroIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterRegion, setFilterRegion] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterHero, setFilterHero] = useState("");

  const toggleHero = (id: number) => {
    setHeroIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ region, rankTier, mode, heroIds, note: note.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || "Não foi possível publicar o anúncio.");
        return;
      }
      setPosts((prev) => [data as LfgPostItem, ...prev]);
      setNote("");
      setHeroIds([]);
    } catch {
      setError("Erro de conexão com a API.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir anúncio LFG?",
      description: "Seu anúncio será removido da listagem de procura de grupo.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/backend/lfg/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filteredPosts = useMemo(() => {
    const hid = filterHero ? Number(filterHero) : 0;
    return posts.filter((p) => {
      if (filterRegion && p.region !== filterRegion) return false;
      if (filterRank && p.rankTier !== filterRank) return false;
      if (filterMode && p.mode !== filterMode) return false;
      if (hid > 0 && !p.heroIds.includes(hid)) return false;
      return true;
    });
  }, [posts, filterRegion, filterRank, filterMode, filterHero]);

  return (
    <div className="space-y-8">
      {initialUser ? (
        <SlantFrame
          shape="narrowTop"
          border="#3897a1"
          background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs font-bold text-[#f4efe6]"
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <select
                value={rankTier}
                onChange={(e) => setRankTier(e.target.value)}
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs font-bold text-[#f4efe6]"
              >
                {RANKS.map((rk) => (
                  <option key={rk} value={rk}>{rk}</option>
                ))}
              </select>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs font-bold text-[#f4efe6]"
              >
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300">
                Heróis que você joga (até 5):
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto lp-scroll">
                {heroes.map((h) => {
                  const selected = heroIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHero(h.id)}
                      className={`flex items-center gap-1 rounded-[4px] border px-2 py-1 text-[11px] cursor-pointer ${
                        selected
                          ? "border-amber-400 bg-amber-500/20 text-amber-200"
                          : "border-white/10 bg-black/40 text-neutral-300 hover:border-white/25"
                      }`}
                    >
                      {h.image && <img src={h.image} alt="" className="h-4 w-4 rounded-[2px] object-cover" />}
                      <span>{h.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Descreva horário, estilo de jogo ou objetivo (ex.: Procuro duo para ranked à noite)..."
              className="w-full rounded-[4px] border border-white/15 bg-black/50 p-3 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">{note.length}/300</span>
              <button
                type="submit"
                disabled={posting || !note.trim()}
                className="rounded-[4px] bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {posting ? "Publicando..." : "Publicar Anúncio"}
              </button>
            </div>
          </form>
        </SlantFrame>
      ) : (
        <SlantFrame
          shape="narrowTop"
          border="#3897a1"
          background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
          className="flex items-center justify-between gap-3 text-xs text-neutral-200"
        >
          <span>Entre na sua conta para anunciar procura por duo ou time.</span>
          <Link href="/login" className="rounded-[4px] bg-amber-500 px-4 py-1.5 font-deadlock font-black uppercase text-black">
            Entrar
          </Link>
        </SlantFrame>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="rounded-[4px] border border-white/15 bg-[#0a0d0c] px-3 py-2 text-xs text-[#f4efe6]"
        >
          <option value="">Todas as regiões</option>
          {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select
          value={filterRank}
          onChange={(e) => setFilterRank(e.target.value)}
          className="rounded-[4px] border border-white/15 bg-[#0a0d0c] px-3 py-2 text-xs text-[#f4efe6]"
        >
          <option value="">Todas as patentes</option>
          {RANKS.map((rk) => <option key={rk} value={rk}>{rk}</option>)}
        </select>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="rounded-[4px] border border-white/15 bg-[#0a0d0c] px-3 py-2 text-xs text-[#f4efe6]"
        >
          <option value="">Todos os modos</option>
          {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select
          value={filterHero}
          onChange={(e) => setFilterHero(e.target.value)}
          className="rounded-[4px] border border-white/15 bg-[#0a0d0c] px-3 py-2 text-xs text-[#f4efe6]"
        >
          <option value="">Todos os heróis</option>
          {heroes.map((h) => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
        </select>
      </div>

      {/* Lista de anúncios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPosts.length === 0 ? (
          <p className="md:col-span-2 py-8 text-center text-xs text-neutral-500">
            Nenhum anúncio encontrado com esses filtros.
          </p>
        ) : (
          filteredPosts.map((p) => (
            <article
              key={p.id}
              className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {p.author.handle ? (
                    <Link
                      href={`/profile/${p.author.handle}`}
                      className="font-deadlock text-sm font-black text-[#f4efe6] hover:text-amber-400"
                    >
                      {p.author.username} <span className="font-mono text-xs font-normal text-neutral-400">@{p.author.handle}</span>
                    </Link>
                  ) : (
                    <span className="font-deadlock text-sm font-black text-[#f4efe6]">{p.author.username}</span>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase">
                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-cyan-300">{p.region}</span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">{p.rankTier}</span>
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                      {MODES.find((m) => m.id === p.mode)?.label ?? p.mode}
                    </span>
                  </div>
                </div>

                {p.canDelete && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    className="text-[10px] font-bold uppercase text-rose-400 hover:underline cursor-pointer"
                  >
                    Excluir
                  </button>
                )}
              </div>

              <p className="text-xs text-neutral-200 leading-relaxed">{p.note}</p>

              {p.heroIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.heroIds.map((hid) => {
                    const h = heroMap.get(hid);
                    if (!h) return null;
                    return (
                      <span key={hid} className="inline-flex items-center gap-1 rounded-[3px] border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] text-neutral-200">
                        {h.image && <img src={h.image} alt="" className="h-4 w-4 rounded-[2px] object-cover" />}
                        {h.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          ))
        )}
      </div>
      {modal}
    </div>
  );
}