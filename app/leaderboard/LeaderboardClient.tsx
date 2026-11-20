"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export interface LeaderboardHeroOption {
  id: number;
  name: string;
  image: string | null;
  rgb?: [number, number, number] | null;
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

const PAGE_SIZE = 25;

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

function PaginationBar({
  page,
  totalPages,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (next: number) => void;
}) {
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > totalPages) {
      setDraft(String(page));
      return;
    }
    if (parsed !== page) {
      onPageChange(parsed);
    }
  };

  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <button
        type="button"
        disabled={page <= 1 || loading}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Página anterior"
        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/12 bg-black/50 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronIcon dir="left" />
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
        className="flex items-center gap-1 px-1 text-neutral-300"
      >
        <span>Pág</span>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          disabled={loading || totalPages <= 1}
          aria-label="Ir para página"
          title="Digite o número da página e pressione Enter"
          className="h-7 w-10 rounded-[4px] border border-white/12 bg-black/60 px-1 text-center font-mono text-[11px] font-bold text-[#f4efe6] focus:border-amber-500 focus:outline-none disabled:opacity-45"
        />
        <span className="text-neutral-400">/ {totalPages}</span>
      </form>
      <button
        type="button"
        disabled={page >= totalPages || loading}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        aria-label="Próxima página"
        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/12 bg-black/50 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronIcon dir="right" />
      </button>
    </div>
  );
}

export default function LeaderboardClient({ heroes }: { heroes: LeaderboardHeroOption[] }) {
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const searchParams = useSearchParams();
  const [region, setRegion] = useState(() => {
    const r = searchParams.get("region");
    return r && ["Global", "SAmerica", "Row", "Europe", "SEAsia", "Oceania"].includes(r)
      ? r
      : "Global";
  });
  const [heroIds, setHeroIds] = useState<number[]>(() => {
    const raw = searchParams.get("heroes") ?? searchParams.get("heroIds") ?? "";
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ).slice(0, 3);
  });
  const [heroSearch, setHeroSearch] = useState("");
  const heroIdsKey = heroIds.join(",");
  const [debouncedHeroIdsKey, setDebouncedHeroIdsKey] = useState(heroIdsKey);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHeroIdsKey(heroIdsKey), 500);
    return () => clearTimeout(t);
  }, [heroIdsKey]);
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page"));
    return Number.isInteger(p) && p >= 1 ? p : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const s = searchParams.get("sort");
    return s === "winrate" || s === "matches" || s === "rank" ? s : "points";
  });
  const [selectedTier, setSelectedTier] = useState<number | null>(() => {
    const t = Number(searchParams.get("tier"));
    return Number.isInteger(t) && t >= 1 && t <= 11 ? t : null;
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (region !== "Global") params.set("region", region);
    if (heroIdsKey) params.set("heroes", heroIdsKey);
    if (selectedTier !== null) params.set("tier", String(selectedTier));
    if (page > 1) params.set("page", String(page));
    if (sortBy !== "points") params.set("sort", sortBy);
    const qs = params.toString();
    const nextUrl = qs ? `/leaderboard?${qs}` : "/leaderboard";
    window.history.replaceState(null, "", nextUrl);
  }, [region, heroIdsKey, selectedTier, page, sortBy]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [rankDist, setRankDist] = useState<RankDistributionTier[]>([]);
  const [totalRankedPlayers, setTotalRankedPlayers] = useState<number>(0);
  const tierParam =
    selectedTier !== null && selectedTier >= 1 && selectedTier <= 11
      ? selectedTier
      : null;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/backend/external-data/rank-distribution?region=${encodeURIComponent(region)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totalPlayers?: number; tiers?: RankDistributionTier[] } | null) => {
        if (!cancelled && d && Array.isArray(d.tiers)) {
          setRankDist(d.tiers);
          setTotalRankedPlayers(typeof d.totalPlayers === "number" ? d.totalPlayers : 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (debouncedHeroIdsKey) params.set("heroIds", debouncedHeroIdsKey);
    if (tierParam !== null) params.set("tier", String(tierParam));

    const url = `/api/backend/external-data/leaderboard/${encodeURIComponent(region)}?${params.toString()}`;

    const load = async () => {
      const maxAttempts = 3;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (cancelled) return;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { message?: string } | null;
            throw new Error(body?.message || "Não foi possível carregar o leaderboard.");
          }
          const data = (await res.json()) as {
            entries?: LeaderboardEntry[];
            totalPages?: number;
            fetchedAt?: string;
          };
          if (!cancelled) {
            setEntries(Array.isArray(data.entries) ? data.entries : []);
            setTotalPages(
              typeof data.totalPages === "number" && data.totalPages > 0 ? data.totalPages : 1,
            );
            setFetchedAt(data.fetchedAt ?? null);
            setError(null);
            setLoading(false);
          }
          return;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Erro ao carregar leaderboard.";
          if (attempt < maxAttempts && !cancelled) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
        }
      }

      if (!cancelled) {
        setEntries([]);
        setError(lastError || "Não foi possível carregar o leaderboard.");
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [region, debouncedHeroIdsKey, page, reloadKey, tierParam]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...entries];

    if (selectedTier !== null && tierParam === null) {
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
  }, [entries, search, sortBy, selectedTier, tierParam]);

  const regionLabel = REGIONS.find((r) => r.id === region)?.label ?? region;

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
            Confira o topo oficial do ranking por região e por herói específico, com cache persistente e acesso direto ao perfil público.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {totalRankedPlayers > 0 && (
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 px-4 py-2.5 text-right">
              <p className="font-mono text-base font-black text-[#f4efe6]">
                {totalRankedPlayers.toLocaleString("pt-BR")}
              </p>
              <p className="font-deadlock text-[9px] font-black uppercase tracking-wider text-neutral-400">
                Jogadores Ranqueados
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
        <aside className="lg:col-span-3 lg:order-2 space-y-4">
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

            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Heróis {heroIds.length > 0 ? `(${heroIds.length}/3)` : ""}
                </label>
                {heroIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroIds([]);
                      setPage(1);
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Buscar herói..."
                className="w-full rounded-[4px] border border-white/12 bg-black/60 px-2.5 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
              />
              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto overflow-x-hidden lp-scroll p-2">
                {heroes
                  .filter((h) =>
                    h.name.toLowerCase().includes(heroSearch.trim().toLowerCase()),
                  )
                  .map((h) => {
                    const selected = heroIds.includes(h.id);
                    const limitReached = !selected && heroIds.length >= 3;
                    const hc =
                      Array.isArray(h.rgb) && h.rgb.length === 3
                        ? h.rgb.join(" ")
                        : "245 158 11";
                    return (
                      <button
                        key={h.id}
                        type="button"
                        title={h.name}
                        aria-label={h.name}
                        aria-pressed={selected}
                        disabled={limitReached}
                        onClick={() => {
                          setHeroIds((prev) => {
                            if (prev.includes(h.id)) return prev.filter((id) => id !== h.id);
                            if (prev.length >= 3) return prev;
                            return [...prev, h.id];
                          });
                          setPage(1);
                        }}
                        style={{ "--hc": hc } as CSSProperties}
                        className={`group relative aspect-square w-full p-0.5 transition-all ${
                          selected
                            ? "pf-smoke scale-110 opacity-100 z-10 cursor-pointer"
                            : limitReached
                              ? "opacity-35 cursor-not-allowed"
                              : heroIds.length > 0
                                ? "opacity-45 hover:opacity-100 hover:scale-110 cursor-pointer"
                                : "opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer"
                        }`}
                      >
                        <span
                          style={{
                            background: `radial-gradient(circle, rgb(${hc} / 0.65) 0%, rgb(${hc} / 0.25) 45%, transparent 72%)`,
                          }}
                          className={`pointer-events-none absolute -inset-1.5 rounded-full transition-opacity duration-200 ${
                            selected
                              ? "opacity-100"
                              : heroIds.length === 0
                                ? "opacity-80 group-hover:opacity-100"
                                : limitReached
                                  ? "opacity-0"
                                  : "opacity-0 group-hover:opacity-100"
                          }`}
                        />
                        {h.image ? (
                          <img
                            src={h.image}
                            alt={h.name}
                            style={{
                              filter: selected
                                ? `drop-shadow(0 0 8px rgb(${hc} / 0.85))`
                                : undefined,
                            }}
                            className="relative z-10 h-full w-full object-contain"
                          />
                        ) : (
                          <span className="relative z-10 block h-full w-full rounded-full bg-white/10" />
                        )}
                      </button>
                    );
                  })}
              </div>
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
                    onClick={() => {
                      setSelectedTier(null);
                      setPage(1);
                    }}
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
                      onClick={() => {
                        setSelectedTier((prev) => (prev === item.tier ? null : item.tier));
                        setPage(1);
                      }}
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
        <div className="lg:col-span-9 lg:order-1 space-y-4">
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

                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  loading={loading}
                  onPageChange={setPage}
                />
              </div>
            </div>

            {loading ? (
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
                    {Array.from({ length: 12 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="pl-4 pr-2 py-3 w-12">
                          <div className="h-3.5 w-6 rounded bg-white/10" />
                        </td>
                        <td className="px-2 py-3 w-14">
                          <div className="mx-auto h-7 w-7 rounded-full bg-white/10" />
                        </td>
                        <td className="pl-2 pr-4 py-3 w-24">
                          <div className="ml-auto h-3.5 w-14 rounded bg-white/10" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-[4px] bg-white/10 shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3.5 w-32 rounded bg-white/10" />
                              <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
                            </div>
                          </div>
                        </td>
                        <td className="pl-3 pr-6 py-3 w-32">
                          <div className="ml-auto h-3.5 w-16 rounded bg-white/10" />
                        </td>
                        <td className="pl-2 pr-4 py-3 w-36">
                          <div className="space-y-1.5">
                            <div className="h-3 w-11 rounded bg-white/10" />
                            <div className="h-1 w-full rounded-full bg-white/[0.07]" />
                          </div>
                        </td>
                        <td className="px-4 py-3 w-32">
                          <div className="flex justify-end gap-1.5">
                            <div className="h-7 w-7 rounded-[3px] bg-white/10" />
                            <div className="h-7 w-7 rounded-[3px] bg-white/10" />
                            <div className="h-7 w-7 rounded-[3px] bg-white/10" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    loading={loading}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}