"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface LeaderboardHeroOption {
  id: number;
  name: string;
  image: string | null;
}

interface LeaderboardEntry {
  rank: number;
  accountId: number | null;
  accountName: string;
  avatarUrl?: string | null;
  badgeLevel: number | null;
  rankedRank: number | null;
  rankedSubrank: number | null;
  points?: number | null;
  matches?: number | null;
  wins?: number | null;
  losses?: number | null;
  winRate?: number | null;
  liveMatchId?: number | null;
  liveHeroId?: number | null;
  liveMinutes?: number | null;
  topHeroIds: number[];
}

interface RankDistributionTier {
  tier: number;
  uniquePlayers: number;
}

type SortKey = "points" | "winrate" | "matches" | "rank";

const PAGE_SIZE = 50;

const REGIONS = [
  { id: "Global", label: "Global" },
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

const RANK_NAMES: Record<number, string> = {
  1: "Iniciado",
  2: "Aspirante",
  3: "Acólito",
  4: "Sentinela",
  5: "Místico",
  6: "Ritualista",
  7: "Emissário",
  8: "Oráculo",
  9: "Fantasma",
  10: "Ascendente",
  11: "Eterno",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

function tierIconUrl(tier: number, sub = 6): string {
  if (tier < 1) {
    return "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_sm.webp";
  }
  return `https://api.deadlock-api.com/v1/assets/ranks/${tier}/${sub}/image?format=webp`;
}

function getEntryTier(entry: LeaderboardEntry): number {
  if (typeof entry.rankedRank === "number" && entry.rankedRank >= 1) {
    return entry.rankedRank;
  }
  if (typeof entry.badgeLevel === "number" && entry.badgeLevel >= 11) {
    return Math.floor(entry.badgeLevel / 10);
  }
  return 0;
}

function getEntrySubrank(entry: LeaderboardEntry): number {
  if (typeof entry.rankedSubrank === "number" && entry.rankedSubrank >= 1) {
    return entry.rankedSubrank;
  }
  if (typeof entry.badgeLevel === "number" && entry.badgeLevel >= 11) {
    return entry.badgeLevel % 10;
  }
  return 0;
}

function formatRankInfo(entry: LeaderboardEntry): { tier: number; label: string; iconUrl: string } {
  let tier = entry.rankedRank;
  let sub = entry.rankedSubrank;
  if ((tier === null || sub === null) && entry.badgeLevel !== null && entry.badgeLevel >= 11) {
    tier = Math.floor(entry.badgeLevel / 10);
    sub = entry.badgeLevel % 10;
  }
  if (!tier || tier < 1) {
    return {
      tier: 0,
      label: "Obscuro",
      iconUrl: tierIconUrl(0),
    };
  }
  const validSub = sub && sub >= 1 && sub <= 6 ? sub : 1;
  const name = RANK_NAMES[tier] ?? `Tier ${tier}`;
  const roman = ROMAN[validSub] ?? String(validSub);
  return {
    tier,
    label: `${name} ${roman}`,
    iconUrl: tierIconUrl(tier, validSub),
  };
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === "left" ? "m10 3-5 5 5 5" : "m6 3 5 5-5 5"} />
    </svg>
  );
}

export default function LeaderboardClient({ heroes }: { heroes: LeaderboardHeroOption[] }) {
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [region, setRegion] = useState("Global");
  const [heroId, setHeroId] = useState<string>("");
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const heroDropRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [rankDist, setRankDist] = useState<RankDistributionTier[]>([]);
  const [totalRankedPlayers, setTotalRankedPlayers] = useState<number>(0);

  useEffect(() => {
    if (!heroOpen) return;
    const onDown = (e: MouseEvent) => {
      if (heroDropRef.current && !heroDropRef.current.contains(e.target as Node)) {
        setHeroOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHeroOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [heroOpen]);

  useEffect(() => {
    fetch("/api/backend/external-data/rank-distribution", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totalPlayers?: number; tiers?: RankDistributionTier[] } | null) => {
        if (d && Array.isArray(d.tiers)) {
          setRankDist(d.tiers);
          setTotalRankedPlayers(typeof d.totalPlayers === "number" ? d.totalPlayers : 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (heroId) params.set("heroId", heroId);

    fetch(`/api/backend/external-data/leaderboard/${encodeURIComponent(region)}?${params.toString()}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || "Não foi possível carregar o leaderboard.");
        }
        return res.json();
      })
      .then((data: { entries?: LeaderboardEntry[]; totalPages?: number; fetchedAt?: string }) => {
        if (!cancelled) {
          setEntries(Array.isArray(data.entries) ? data.entries : []);
          setTotalPages(typeof data.totalPages === "number" && data.totalPages > 0 ? data.totalPages : 1);
          setFetchedAt(data.fetchedAt ?? null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar leaderboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region, heroId, page, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...entries];

    if (selectedTier !== null) {
      list = list.filter((e) => getEntryTier(e) === selectedTier);
    }

    if (q) {
      list = list.filter((e) => e.accountName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "rank") {
        return a.rank - b.rank;
      }
      if (sortBy === "points") {
        const tierDiff = getEntryTier(b) - getEntryTier(a);
        if (tierDiff !== 0) return tierDiff;
        const ptsDiff = (b.points ?? -1) - (a.points ?? -1);
        return ptsDiff !== 0 ? ptsDiff : a.rank - b.rank;
      }
      if (sortBy === "winrate") {
        const diff = (b.winRate ?? -1) - (a.winRate ?? -1);
        return diff !== 0 ? diff : (b.points ?? -1) - (a.points ?? -1);
      }
      const diff = (b.matches ?? -1) - (a.matches ?? -1);
      return diff !== 0 ? diff : (b.points ?? -1) - (a.points ?? -1);
    });

    return list;
  }, [entries, search, sortBy, selectedTier]);

  const regionLabel = REGIONS.find((r) => r.id === region)?.label ?? region;

  const PaginationBar = () => (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <button
        type="button"
        disabled={page <= 1 || loading}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        aria-label="Página anterior"
        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/12 bg-black/50 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronIcon dir="left" />
      </button>
      <span className="px-2 text-neutral-300">
        Pág <strong className="text-[#f4efe6]">{page}</strong> / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages || loading}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        aria-label="Próxima página"
        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/12 bg-black/50 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronIcon dir="right" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO NO TOPO COM CARDS À DIREITA */}
      <header className="border-b border-neutral-800 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
            Competitivo
          </p>
          <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Leader<span className="text-amber-500">board</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
            Confira os melhores jogadores por região e por herói específico, com cache persistente e acesso direto ao perfil público.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {totalRankedPlayers > 0 && (
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 px-4 py-2.5 text-right">
              <p className="font-mono text-base font-black text-[#f4efe6]">
                {totalRankedPlayers.toLocaleString("pt-BR")}
              </p>
              <p className="font-deadlock text-[9px] font-black uppercase tracking-wider text-neutral-400">
                Jogadores Mapeados
              </p>
            </div>
          )}
          <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 px-4 py-2.5 text-right">
            <p className="font-deadlock text-base font-black text-amber-400 uppercase">
              {regionLabel}
            </p>
            <p className="font-deadlock text-[9px] font-black uppercase tracking-wider text-neutral-400">
              Região Selecionada
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUNA LATERAL DE FILTROS + DISTRIBUIÇÃO POR PATENTE */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="dl-noise relative z-20 rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4 space-y-4">
            <div className="space-y-2">
              <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
                Região
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRegion(r.id);
                      setPage(1);
                    }}
                    className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      region === r.id
                        ? "bg-amber-500 text-black"
                        : "border border-white/12 bg-black/45 text-neutral-300 hover:border-amber-500/40 hover:text-amber-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={heroDropRef} className="relative space-y-1.5 border-t border-white/10 pt-3">
              <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
                Herói
              </label>
              {(() => {
                const activeHero = heroId ? heroMap.get(Number(heroId)) : null;
                return (
                  <button
                    type="button"
                    onClick={() => setHeroOpen((o) => !o)}
                    aria-expanded={heroOpen}
                    className="flex w-full items-center justify-between gap-2 rounded-[4px] border border-white/12 bg-black/60 px-2.5 py-2 text-left transition-colors hover:border-amber-500/50 focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {activeHero?.image ? (
                        <img
                          src={activeHero.image}
                          alt=""
                          className="h-5 w-5 rounded-[3px] object-cover shrink-0"
                        />
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-white/[0.06] text-amber-400">
                          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2 4 6v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V6l-8-4z" />
                          </svg>
                        </span>
                      )}
                      <span className="truncate font-deadlock text-[11px] font-black uppercase text-[#f4efe6]">
                        {activeHero ? activeHero.name : "Geral (Todos os Heróis)"}
                      </span>
                    </span>
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${
                        heroOpen ? "rotate-180 text-amber-400" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4 6 4 4 4-4" />
                    </svg>
                  </button>
                );
              })()}

              {heroOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-[5px] border border-white/20 bg-[#0c0f0e] shadow-[0_18px_40px_rgba(0,0,0,0.92)] overflow-hidden">
                  <div className="border-b border-white/10 p-2">
                    <input
                      type="text"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      placeholder="Buscar herói..."
                      autoFocus
                      className="w-full rounded-[4px] border border-white/12 bg-black/60 px-2.5 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto lp-scroll p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHeroId("");
                        setPage(1);
                        setHeroOpen(false);
                        setHeroSearch("");
                      }}
                      className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-xs font-semibold cursor-pointer ${
                        heroId === ""
                          ? "bg-amber-500/15 text-amber-300"
                          : "text-neutral-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-white/[0.06] text-amber-400">
                        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2 4 6v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V6l-8-4z" />
                        </svg>
                      </span>
                      <span className="truncate">Geral (Todos os Heróis)</span>
                    </button>

                    {heroes
                      .filter((h) =>
                        h.name.toLowerCase().includes(heroSearch.trim().toLowerCase()),
                      )
                      .map((h) => {
                        const selected = heroId === String(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              setHeroId(String(h.id));
                              setPage(1);
                              setHeroOpen(false);
                              setHeroSearch("");
                            }}
                            className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-xs font-semibold cursor-pointer ${
                              selected
                                ? "bg-amber-500/15 text-amber-300"
                                : "text-neutral-200 hover:bg-white/[0.05]"
                            }`}
                          >
                            {h.image ? (
                              <img
                                src={h.image}
                                alt=""
                                className="h-6 w-6 rounded-[3px] object-cover shrink-0"
                              />
                            ) : (
                              <span className="h-6 w-6 rounded-[3px] bg-white/10 shrink-0" />
                            )}
                            <span className="truncate">{h.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {rankDist.length > 0 && (
            <div className="dl-noise relative z-10 rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Patentes (14d)
                </p>
                {selectedTier !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedTier(null)}
                    className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {rankDist.map((item) => {
                  const active = selectedTier === item.tier;
                  return (
                    <button
                      key={item.tier}
                      type="button"
                      onClick={() =>
                        setSelectedTier((prev) => (prev === item.tier ? null : item.tier))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-[4px] px-2 py-1 text-xs transition-colors cursor-pointer ${
                        active
                          ? "bg-amber-500/15 border border-amber-500/45 text-amber-300"
                          : "border border-transparent hover:bg-white/[0.04] text-neutral-200"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <img
                          src={tierIconUrl(item.tier, 6)}
                          alt=""
                          className="h-5 w-5 object-contain shrink-0"
                        />
                        <span className="truncate font-semibold">
                          {RANK_NAMES[item.tier] ?? `Tier ${item.tier}`}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                        {item.uniquePlayers.toLocaleString("pt-BR")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* TABELA PRINCIPAL */}
        <div className="lg:col-span-9 space-y-4">
          {error && (
            <div className="rounded-[5px] border border-rose-500/40 bg-rose-950/30 p-3.5 flex items-center justify-between gap-3 text-xs font-bold text-rose-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-[4px] border border-rose-400/50 bg-rose-500/15 px-2.5 py-1 font-deadlock text-[10px] font-black uppercase text-rose-200 hover:bg-rose-500/25 cursor-pointer shrink-0"
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className="rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 overflow-hidden shadow-2xl">
            <div className="dl-noise dl-halftone relative border-b border-white/10 bg-[#101413]/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nick na página..."
                  className="w-full sm:w-56 rounded-[4px] border border-white/12 bg-black/55 px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
                {fetchedAt && (
                  <span className="font-mono text-[10px] text-neutral-400">
                    Cache{" "}
                    {new Date(fetchedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 rounded-[4px] border border-white/10 bg-black/50 p-1">
                  {(
                    [
                      { id: "points", label: "Pontos" },
                      { id: "winrate", label: "Win %" },
                      { id: "matches", label: "Partidas" },
                      { id: "rank", label: "Oficial" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSortBy(opt.id)}
                      className={`rounded-[3px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                        sortBy === opt.id
                          ? "bg-amber-500 text-black"
                          : "text-neutral-400 hover:bg-white/[0.06] hover:text-[#f4efe6]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <PaginationBar />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                Carregando página {page}...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                Nenhum jogador encontrado nesta página com os filtros atuais.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead className="border-b border-white/10 bg-black/40 font-deadlock text-[10px] uppercase tracking-wider text-neutral-400">
                      <tr>
                        <th className="pl-4 pr-2 py-3 w-12">Rank</th>
                        <th className="px-2 py-3 w-14 text-center">Elo</th>
                        <th className="pl-2 pr-4 py-3 w-24 text-right">Pontos</th>
                        <th className="px-4 py-3">Jogador</th>
                        <th className="pl-3 pr-6 py-3 w-32 text-right">W / L</th>
                        <th className="pl-2 pr-4 py-3 w-36">Win %</th>
                        <th className="px-4 py-3 w-32 text-right">Top Heróis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.07]">
                      {filtered.map((entry, idx) => {
                        const rk = formatRankInfo(entry);
                        const displayPos = (page - 1) * PAGE_SIZE + idx + 1;
                        const liveHero = entry.liveHeroId ? heroMap.get(entry.liveHeroId) : null;

                        return (
                          <tr key={`${entry.rank}-${entry.accountName}`} className="hover:bg-white/[0.03] transition-colors">
                            <td className="pl-4 pr-2 py-2.5 font-mono font-black w-12">
                              <span className={displayPos <= 3 ? "text-amber-400" : "text-neutral-400"}>
                                {displayPos}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center w-14">
                              <img
                                src={rk.iconUrl}
                                alt={rk.label}
                                title={rk.label}
                                className="mx-auto h-7 w-7 object-contain"
                              />
                            </td>
                            <td className="pl-2 pr-4 py-2.5 text-right font-mono font-black text-[#f4efe6] whitespace-nowrap w-24">
                              {typeof entry.points === "number" ? entry.points.toLocaleString("pt-BR") : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {entry.avatarUrl ? (
                                  <img
                                    src={entry.avatarUrl}
                                    alt=""
                                    className="h-8 w-8 rounded-[4px] border border-white/15 object-cover shrink-0"
                                  />
                                ) : (
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-white/12 bg-black/60 font-deadlock text-[11px] font-black text-amber-400">
                                    {entry.accountName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  {entry.accountId ? (
                                    <Link
                                      href={`/player/${entry.accountId}`}
                                      className="block truncate font-bold text-[#f4efe6] hover:text-amber-400 transition-colors"
                                    >
                                      {entry.accountName}
                                    </Link>
                                  ) : (
                                    <span className="block truncate font-bold text-[#f4efe6]">
                                      {entry.accountName}
                                    </span>
                                  )}

                                  {entry.liveMatchId && liveHero ? (
                                    <Link
                                      href={`/matches/${entry.liveMatchId}`}
                                      className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-400 hover:underline"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      <span>
                                        EM PARTIDA • {liveHero.name} {entry.liveMinutes ?? 1}m
                                      </span>
                                    </Link>
                                  ) : (
                                    <span className="font-mono text-[10px] text-neutral-500">
                                      {typeof entry.matches === "number"
                                        ? `${entry.matches.toLocaleString("pt-BR")} partidas`
                                        : "—"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="pl-3 pr-6 py-2.5 text-right font-mono whitespace-nowrap w-32">
                              {typeof entry.wins === "number" && typeof entry.losses === "number" ? (
                                <span>
                                  <span className="font-bold text-[#f4efe6]">
                                    {entry.wins.toLocaleString("pt-BR")}
                                  </span>
                                  <span className="text-neutral-600"> / </span>
                                  <span className="text-neutral-400">
                                    {entry.losses.toLocaleString("pt-BR")}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
                            </td>
                            <td className="pl-2 pr-4 py-2.5 w-36">
                              {typeof entry.winRate === "number" ? (
                                <div className="space-y-1">
                                  <span
                                    className={`font-mono text-xs font-black ${
                                      entry.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                  >
                                    {entry.winRate.toFixed(1)}%
                                  </span>
                                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        entry.winRate >= 50 ? "bg-emerald-400" : "bg-rose-400"
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, entry.winRate))}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="font-mono text-neutral-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 w-32">
                              <div className="flex items-center justify-end gap-1.5">
                                {entry.topHeroIds.slice(0, 3).map((hid) => {
                                  const h = heroMap.get(hid);
                                  if (!h) return null;
                                  return (
                                    <Link key={hid} href={`/heroes/${hid}`} title={h.name}>
                                      {h.image && (
                                        <img
                                          src={h.image}
                                          alt={h.name}
                                          className="h-7 w-7 rounded-[3px] border border-white/15 object-cover hover:border-amber-400"
                                        />
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-white/10 bg-black/30 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-neutral-500">
                    Exibindo {filtered.length} de {entries.length} nesta página
                  </span>
                  <PaginationBar />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}