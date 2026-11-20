"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";

export interface HomeTrackerHero {
  id: number;
  name: string;
  image: string | null;
}

export interface HomeTrackerItem {
  className: string;
  name: string;
  image: string | null;
  slot: "weapon" | "vitality" | "spirit";
  cost: number;
}

export interface HomeMetaHero {
  id: number;
  name: string;
  image: string | null;
  matches: number;
  winRate: number;
  tier: string;
}

export interface HomePatchMover {
  id: number;
  name: string;
  image: string | null;
  winRateNow: number;
  winDelta: number;
}

interface RecentSearch {
  label: string;
  href: string;
}

interface LeaderboardEntry {
  rank: number;
  accountId: number | null;
  accountName: string;
  badgeLevel: number | null;
  topHeroIds: number[];
}

interface HighMmrMatch {
  matchId: number;
  heroId: number;
  durationSec: number;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  playerName: string;
  accountId: string;
}

interface LfgSummaryItem {
  id: string;
  region: string;
  rankTier: string;
  mode: string;
  note: string;
  author: { username: string; handle: string | null };
}

interface BuildSummaryItem {
  id: string;
  heroId: number;
  title: string;
  author: string;
}

interface TournamentSummaryItem {
  id: string;
  title: string;
  region: string;
  status: "ONGOING" | "UPCOMING" | "FINISHED";
  prizePool: string | null;
}

interface FeedSummaryItem {
  id: string;
  content: string;
  author: { username: string; handle: string | null };
}

type SearchMode = "player" | "match" | "compare" | "catalog";
type DashboardTab = "mmr" | "meta" | "community";

const STORAGE_KEY = "lp_recent_tracker_searches";

const REGIONS = [
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

const SLOT_BADGE: Record<HomeTrackerItem["slot"], string> = {
  weapon: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  vitality: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  spirit: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

function isSteamInput(raw: string): boolean {
  const clean = raw.replace(/^@+/, "").trim();
  return (
    /steamcommunity\.com\/(id|profiles)\//i.test(clean) ||
    /s\.team\/p\//i.test(clean) ||
    /^STEAM_[01]:[01]:\d+$/i.test(clean) ||
    /^\[U:1:\d+\]$/i.test(clean)
  );
}

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function HomeTracker({
  heroes,
  items,
  metaTop,
  risers,
  fallers,
  patchLabel,
  prevPatchLabel,
}: {
  heroes: HomeTrackerHero[];
  items: HomeTrackerItem[];
  metaTop: HomeMetaHero[];
  risers: HomePatchMover[];
  fallers: HomePatchMover[];
  patchLabel: string;
  prevPatchLabel: string;
}) {
  const router = useRouter();
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [mode, setMode] = useState<SearchMode>("player");
  const [query, setQuery] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [disambiguate, setDisambiguate] = useState<{
    handle?: string;
    steamId?: string;
    steamName?: string | null;
  } | null>(null);

  const [dashTab, setDashTab] = useState<DashboardTab>("mmr");
  const [region, setRegion] = useState("SAmerica");
  const [mmrLoading, setMmrLoading] = useState(true);
  const [highMmr, setHighMmr] = useState<HighMmrMatch[]>([]);
  const [topLeaders, setTopLeaders] = useState<LeaderboardEntry[]>([]);

  const [communityLoaded, setCommunityLoaded] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [lfgList, setLfgList] = useState<LfgSummaryItem[]>([]);
  const [buildsList, setBuildsList] = useState<BuildSummaryItem[]>([]);
  const [tournamentsList, setTournamentsList] = useState<TournamentSummaryItem[]>([]);
  const [feedList, setFeedList] = useState<FeedSummaryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentSearch[];
        if (Array.isArray(parsed)) {
          // Remove entradas antigas inválidas (ex.: @https://steamcommunity.com/...)
          const sanitized = parsed
            .filter(
              (p) =>
                p &&
                typeof p.label === "string" &&
                typeof p.href === "string" &&
                !p.label.startsWith("@http") &&
                !p.href.startsWith("/profile/http"),
            )
            .slice(0, 5);
          setRecent(sanitized);
          if (sanitized.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMmrLoading(true);
    setHighMmr([]);
    setTopLeaders([]);

    fetch(`/api/backend/external-data/leaderboard/${encodeURIComponent(region)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (lb: { entries?: LeaderboardEntry[] } | null) => {
        if (cancelled) return;
        const entries = Array.isArray(lb?.entries) ? lb.entries : [];
        setTopLeaders(entries.slice(0, 5));

        const top = entries.find((e) => typeof e.accountId === "number" && e.accountId > 0);
        if (!top?.accountId) return;

        const sumRes = await fetch(
          `/api/backend/external-data/player/${top.accountId}/summary`,
          { cache: "no-store" },
        );
        if (!sumRes.ok || cancelled) return;

        const summary = (await sumRes.json()) as {
          recentMatches?: Array<{
            matchId: number;
            heroId: number;
            durationSec: number;
            won: boolean;
            kills: number;
            deaths: number;
            assists: number;
          }>;
        };

        if (!cancelled && Array.isArray(summary.recentMatches)) {
          setHighMmr(
            summary.recentMatches.slice(0, 4).map((m) => ({
              ...m,
              playerName: top.accountName,
              accountId: String(top.accountId),
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMmrLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    if (dashTab !== "community" || communityLoaded) return;
    let cancelled = false;
    setCommunityLoading(true);

    Promise.all([
      fetch("/api/backend/lfg", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/builds", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/tournaments", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/feed?page=1&limit=3", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([lfg, builds, tournaments, feed]) => {
        if (cancelled) return;
        setLfgList(Array.isArray(lfg) ? lfg.slice(0, 3) : []);
        setBuildsList(Array.isArray(builds) ? builds.slice(0, 3) : []);
        setTournamentsList(Array.isArray(tournaments) ? tournaments.slice(0, 3) : []);
        setFeedList(Array.isArray(feed?.items) ? feed.items.slice(0, 3) : []);
        setCommunityLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashTab, communityLoaded]);

  const saveRecent = (entry: RecentSearch) => {
    setRecent((prev) => {
      const next = [entry, ...prev.filter((p) => p.href !== entry.href)].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const catalogMatches = useMemo(() => {
    if (mode !== "catalog") return { heroes: [], items: [] };
    const q = normalizeText(query);
    if (!q) return { heroes: heroes.slice(0, 4), items: items.slice(0, 4) };
    return {
      heroes: heroes.filter((h) => normalizeText(h.name).includes(q)).slice(0, 4),
      items: items.filter((i) => normalizeText(i.name).includes(q)).slice(0, 4),
    };
  }, [mode, query, heroes, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError(null);
    setDisambiguate(null);

    if (mode === "compare") {
      const a = compareA.trim();
      const b = compareB.trim();
      if (!a || !b) {
        setResolveError("Preencha os dois jogadores (link da Steam, Steam ID64 ou Account ID).");
        return;
      }
      router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
      return;
    }

    if (mode === "catalog") {
      const firstHero = catalogMatches.heroes[0];
      const firstItem = catalogMatches.items[0];
      if (firstHero) router.push(`/heroes/${firstHero.id}`);
      else if (firstItem) router.push(`/items/${firstItem.className}`);
      return;
    }

    const raw = query.trim();
    if (!raw || resolving) return;

    if (mode === "match") {
      const cleanId = raw.replace(/\D/g, "");
      if (!cleanId) {
        setResolveError("Informe um Match ID numérico válido.");
        return;
      }
      const href = `/matches/${cleanId}`;
      saveRecent({ label: `Partida #${cleanId}`, href });
      router.push(href);
      return;
    }

    // 1) Link / identificador explícito da Steam
    if (isSteamInput(raw)) {
      setResolving(true);
      try {
        const res = await fetch(`/api/resolve-steam?q=${encodeURIComponent(raw)}`);
        const data = (await res.json().catch(() => null)) as {
          steamId?: string;
          personaName?: string | null;
          error?: string;
        } | null;
        if (!res.ok || !data?.steamId) {
          setResolveError(data?.error || "Não foi possível resolver este perfil Steam.");
          return;
        }
        const href = `/player/${data.steamId}`;
        saveRecent({
          label: data.personaName || `Steam #${data.steamId.slice(-6)}`,
          href,
        });
        router.push(href);
      } finally {
        setResolving(false);
      }
      return;
    }

    // 2) Steam ID64 ou Account ID numérico
    const cleanNumeric = raw.replace(/^@+/, "");
    if (/^\d{5,20}$/.test(cleanNumeric)) {
      const href = `/player/${cleanNumeric}`;
      saveRecent({ label: `Jogador #${cleanNumeric}`, href });
      router.push(href);
      return;
    }

    // 3) @handle explícito do LockPro
    if (raw.startsWith("@")) {
      const cleanHandle = raw.replace(/^@+/, "").trim();
      if (!cleanHandle) return;
      const href = `/profile/${encodeURIComponent(cleanHandle)}`;
      saveRecent({ label: `@${cleanHandle}`, href });
      router.push(href);
      return;
    }

    // 4) Texto livre sem @: verifica perfil LockPro (@handle) e URL personalizada da Steam (/id/...)
    setResolving(true);
    try {
      const [lockproRes, steamRes] = await Promise.all([
        fetch(`/api/backend/profiles/by-handle/${encodeURIComponent(raw)}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/resolve-steam?mode=vanity&q=${encodeURIComponent(raw)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const hasLockpro = Boolean(lockproRes?.handle);
      const hasSteam = Boolean(steamRes?.steamId);

      if (hasLockpro && hasSteam) {
        setDisambiguate({
          handle: lockproRes.handle,
          steamId: steamRes.steamId,
          steamName: steamRes.personaName ?? raw,
        });
        return;
      }

      if (hasLockpro) {
        const href = `/profile/${encodeURIComponent(lockproRes.handle)}`;
        saveRecent({ label: `@${lockproRes.handle}`, href });
        router.push(href);
        return;
      }

      if (hasSteam) {
        const href = `/player/${steamRes.steamId}`;
        saveRecent({ label: steamRes.personaName || raw, href });
        router.push(href);
        return;
      }

      setResolveError(
        `Nenhum perfil LockPro "@${raw}" ou URL personalizada da Steam encontrado. Tente colar o link completo da Steam.`,
      );
    } finally {
      setResolving(false);
    }
  };

  return (
    <section className="mb-10 space-y-6">
      <SlantFrame
        shape="narrowTop"
        border="#3897a1"
        background="linear-gradient(160deg, rgba(16,44,48,0.9), rgba(7,12,14,0.97))"
        className="space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-cyan-300">
              LockPro Tracker
            </p>
            <h2 className="font-deadlock text-xl sm:text-2xl font-black text-[#f4efe6]">
              Rastrear <span className="text-amber-500">Jogador</span>, Partida ou Meta
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "player", label: "Jogador / Steam" },
                { id: "match", label: "Match ID" },
                { id: "compare", label: "Comparar 1v1" },
                { id: "catalog", label: "Heróis & Itens" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setResolveError(null);
                  setDisambiguate(null);
                }}
                className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase cursor-pointer transition-colors ${
                  mode === tab.id
                    ? "bg-amber-500 text-black"
                    : "border border-white/15 bg-black/40 text-neutral-300 hover:border-amber-500/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "compare" ? (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                placeholder="Jogador 1: link da Steam, Steam ID64 ou Account ID..."
                className="flex-1 rounded-[4px] border border-white/15 bg-black/55 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="text"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                placeholder="Jogador 2: link da Steam, Steam ID64 ou Account ID..."
                className="flex-1 rounded-[4px] border border-white/15 bg-black/55 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-[4px] bg-amber-500 px-5 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 cursor-pointer"
              >
                Comparar
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDisambiguate(null);
                }}
                placeholder={
                  mode === "player"
                    ? "Cole o link da Steam (steamcommunity.com/id/... ou /profiles/...), Steam ID64 ou @handle..."
                    : mode === "match"
                      ? "Digite o ID da partida (ex.: 31849201)..."
                      : "Digite o nome de um herói ou item da loja..."
                }
                className="flex-1 rounded-[4px] border border-white/15 bg-black/55 px-4 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={resolving}
                className="rounded-[4px] bg-amber-500 px-5 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {resolving ? "Buscando..." : mode === "catalog" ? "Abrir 1º" : "Rastrear"}
              </button>
            </div>
          )}
        </form>

        {mode === "catalog" && (catalogMatches.heroes.length > 0 || catalogMatches.items.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {catalogMatches.heroes.map((h) => (
              <Link
                key={`cat-h-${h.id}`}
                href={`/heroes/${h.id}`}
                className="flex items-center gap-2.5 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-400/60 transition-colors"
              >
                {h.image && <img src={h.image} alt="" className="h-7 w-7 rounded-[3px] object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300">Herói</p>
                </div>
              </Link>
            ))}
            {catalogMatches.items.map((it) => (
              <Link
                key={`cat-i-${it.className}`}
                href={`/items/${it.className}`}
                className="flex items-center gap-2.5 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-400/60 transition-colors"
              >
                {it.image && <img src={it.image} alt="" className="h-7 w-7 rounded-[3px] object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#f4efe6]">{it.name}</p>
                  <span className={`inline-block rounded border px-1 text-[9px] font-bold ${SLOT_BADGE[it.slot]}`}>
                    {it.cost}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {disambiguate && (
          <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-amber-500/35 bg-black/55 px-3 py-2 text-xs">
            <span className="text-neutral-300">Encontramos dois resultados:</span>
            {disambiguate.handle && (
              <Link
                href={`/profile/${encodeURIComponent(disambiguate.handle)}`}
                onClick={() =>
                  saveRecent({
                    label: `@${disambiguate.handle}`,
                    href: `/profile/${encodeURIComponent(disambiguate.handle!)}`,
                  })
                }
                className="rounded-[4px] border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/25"
              >
                Perfil LockPro (@{disambiguate.handle})
              </Link>
            )}
            {disambiguate.steamId && (
              <Link
                href={`/player/${disambiguate.steamId}`}
                onClick={() =>
                  saveRecent({
                    label: disambiguate.steamName || `Steam #${disambiguate.steamId!.slice(-6)}`,
                    href: `/player/${disambiguate.steamId}`,
                  })
                }
                className="rounded-[4px] border border-cyan-500/50 bg-cyan-500/15 px-2.5 py-1 font-bold text-cyan-300 hover:bg-cyan-500/25"
              >
                Perfil Steam ({disambiguate.steamName})
              </Link>
            )}
          </div>
        )}

        {resolveError && (
          <p className="text-xs font-semibold text-rose-400">{resolveError}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {recent.length > 0 && (
              <>
                <span className="text-neutral-400 font-semibold">Recentes:</span>
                {recent.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="rounded-[4px] border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-neutral-200 hover:border-amber-400 hover:text-amber-300"
                  >
                    {r.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={clearRecent}
                  className="ml-1 text-[10px] text-neutral-500 hover:text-rose-400 cursor-pointer"
                >
                  Limpar
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 font-deadlock text-[10px] uppercase tracking-wider">
            <Link href="/tier-list" className="text-amber-400 hover:underline">Tier List</Link>
            <span className="text-neutral-600">•</span>
            <Link href="/leaderboard" className="text-amber-400 hover:underline">Leaderboard</Link>
            <span className="text-neutral-600">•</span>
            <Link href="/compare" className="text-cyan-300 hover:underline">Comparador 1v1</Link>
            <span className="text-neutral-600">•</span>
            <Link href="/patches" className="text-emerald-400 hover:underline">Patch Tracker</Link>
          </div>
        </div>
      </SlantFrame>

      {/* Abas de conteúdo do Tracker */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "mmr", label: "Alto MMR & Ranking" },
                { id: "meta", label: "Meta & Patches" },
                { id: "community", label: "Comunidade & Torneios" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDashTab(tab.id)}
                className={`rounded-[4px] px-3.5 py-1.5 font-deadlock text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                  dashTab === tab.id
                    ? "bg-amber-500 text-black"
                    : "border border-white/10 bg-[#0a0d0c] text-neutral-300 hover:border-amber-500/40 hover:text-amber-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dashTab === "mmr" && (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Região do Alto MMR"
              className="rounded-[4px] border border-white/15 bg-[#0a0d0c] px-3 py-1.5 font-deadlock text-[11px] font-black uppercase text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ABA 1: ALTO MMR & LEADERBOARD */}
        {dashTab === "mmr" && (
          <div className="space-y-4">
            <div className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
                  Partidas Recentes de Alto MMR {highMmr[0] ? `(${highMmr[0].playerName})` : ""}
                </h3>
                <Link href="/leaderboard" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Ver Leaderboard →
                </Link>
              </div>

              {mmrLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="h-14 rounded-[4px] border border-white/5 bg-black/40 animate-pulse" />
                  ))}
                </div>
              ) : highMmr.length === 0 ? (
                <p className="text-xs text-neutral-500 py-2">
                  Nenhuma partida recente encontrada para esta região no momento.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {highMmr.map((m) => {
                    const hero = heroMap.get(m.heroId);
                    const mins = Math.floor(m.durationSec / 60);
                    return (
                      <Link
                        key={m.matchId}
                        href={`/matches/${m.matchId}`}
                        className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {hero?.image && (
                            <img src={hero.image} alt="" className="h-8 w-8 rounded-[3px] object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#f4efe6]">
                              {hero?.name ?? `Herói #${m.heroId}`}
                            </p>
                            <p className="font-mono text-[10px] text-neutral-400">
                              {m.kills}/{m.deaths}/{m.assists} • {mins}m
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-[3px] px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase ${
                            m.won ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {m.won ? "V" : "D"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {topLeaders.length > 0 && (
              <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-cyan-300">
                    Top 5 do Leaderboard ({REGIONS.find((r) => r.id === region)?.label})
                  </h3>
                  <Link href="/leaderboard" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                    Ranking completo →
                  </Link>
                </div>

                <div className="divide-y divide-white/10">
                  {topLeaders.map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.accountName}`}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 font-mono font-black text-amber-400">#{entry.rank}</span>
                        {entry.accountId ? (
                          <Link
                            href={`/player/${entry.accountId}`}
                            className="truncate font-bold text-[#f4efe6] hover:text-amber-400"
                          >
                            {entry.accountName}
                          </Link>
                        ) : (
                          <span className="truncate font-bold text-[#f4efe6]">{entry.accountName}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {entry.topHeroIds.slice(0, 3).map((hid) => {
                            const h = heroMap.get(hid);
                            if (!h?.image) return null;
                            return (
                              <Link key={hid} href={`/heroes/${hid}`} title={h.name}>
                                <img
                                  src={h.image}
                                  alt={h.name}
                                  className="h-6 w-6 rounded-[3px] border border-white/15 object-cover"
                                />
                              </Link>
                            );
                          })}
                        </div>
                        <span className="font-mono text-[11px] text-neutral-400 w-14 text-right">
                          {entry.badgeLevel !== null ? `Tier ${entry.badgeLevel}` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: META & PATCHES */}
        {dashTab === "meta" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
                  Destaques do Meta ({patchLabel})
                </h3>
                <Link href="/tier-list" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Tier List →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {metaTop.map((h) => (
                  <Link
                    key={h.id}
                    href={`/heroes/${h.id}`}
                    className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {h.image && (
                        <img src={h.image} alt="" className="h-8 w-8 rounded-[3px] object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</p>
                        <p className="text-[10px] text-neutral-400">
                          {h.matches.toLocaleString("pt-BR")} jogos
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-black text-emerald-400">
                        {h.winRate.toFixed(1)}%
                      </p>
                      <span className="font-deadlock text-[9px] font-black uppercase text-amber-400">
                        {h.tier}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-emerald-400">
                  Impacto vs {prevPatchLabel}
                </h3>
                <Link href="/patches" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Patch Tracker →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Em Alta
                  </p>
                  {risers.map((m) => (
                    <Link
                      key={`rise-${m.id}`}
                      href={`/heroes/${m.id}`}
                      className="flex items-center justify-between gap-2 rounded-[4px] border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-2 hover:border-emerald-400/60"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {m.image && <img src={m.image} alt="" className="h-6 w-6 rounded-[3px] object-cover" />}
                        <span className="truncate text-xs font-bold text-[#f4efe6]">{m.name}</span>
                      </span>
                      <span className="font-mono text-[11px] font-black text-emerald-400 shrink-0">
                        +{m.winDelta.toFixed(2)}%
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-rose-400">
                    Em Queda
                  </p>
                  {fallers.map((m) => (
                    <Link
                      key={`fall-${m.id}`}
                      href={`/heroes/${m.id}`}
                      className="flex items-center justify-between gap-2 rounded-[4px] border border-rose-500/20 bg-rose-950/20 px-2.5 py-2 hover:border-rose-400/60"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {m.image && <img src={m.image} alt="" className="h-6 w-6 rounded-[3px] object-cover" />}
                        <span className="truncate text-xs font-bold text-[#f4efe6]">{m.name}</span>
                      </span>
                      <span className="font-mono text-[11px] font-black text-rose-400 shrink-0">
                        {m.winDelta.toFixed(2)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: COMUNIDADE & TORNEIOS */}
        {dashTab === "community" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-cyan-300">
                  Procurar Duo / LFG
                </h3>
                <Link href="/lfg" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Ver LFG →
                </Link>
              </div>
              {communityLoading ? (
                <p className="text-xs text-neutral-500">Carregando anúncios...</p>
              ) : lfgList.length === 0 ? (
                <p className="text-xs text-neutral-500">Nenhum anúncio recente.</p>
              ) : (
                <div className="space-y-2">
                  {lfgList.map((post) => (
                    <Link
                      key={post.id}
                      href="/lfg"
                      className="block rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/50"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                        <span>{post.region} • {post.rankTier}</span>
                        <span>{post.mode}</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-[#f4efe6]">{post.note}</p>
                      <p className="text-[10px] text-neutral-400">por {post.author.username}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
                  Builds Recentes
                </h3>
                <Link href="/builds" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Ver Builds →
                </Link>
              </div>
              {communityLoading ? (
                <p className="text-xs text-neutral-500">Carregando builds...</p>
              ) : buildsList.length === 0 ? (
                <p className="text-xs text-neutral-500">Nenhuma build publicada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {buildsList.map((b) => {
                    const hero = heroMap.get(b.heroId);
                    return (
                      <Link
                        key={b.id}
                        href={`/builds/${b.id}`}
                        className="flex items-center gap-2.5 rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/50"
                      >
                        {hero?.image && (
                          <img src={hero.image} alt="" className="h-8 w-8 rounded-[3px] object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#f4efe6]">{b.title}</p>
                          <p className="text-[10px] text-neutral-400">
                            {hero?.name ?? `Herói #${b.heroId}`} • {b.author}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-emerald-400">
                  Torneios & Feed
                </h3>
                <Link href="/tournaments" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
                  Torneios →
                </Link>
              </div>
              {communityLoading ? (
                <p className="text-xs text-neutral-500">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {tournamentsList.slice(0, 2).map((t) => (
                    <Link
                      key={t.id}
                      href="/tournaments"
                      className="block rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/50"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold">{t.status}</span>
                        <span className="text-neutral-400">{t.region}</span>
                      </div>
                      <p className="truncate text-xs font-bold text-[#f4efe6] mt-0.5">{t.title}</p>
                    </Link>
                  ))}
                  {feedList.slice(0, 2).map((post) => (
                    <Link
                      key={post.id}
                      href="/feed"
                      className="block rounded-[4px] border border-white/10 bg-black/45 p-2.5 hover:border-amber-400/50"
                    >
                      <p className="truncate text-xs text-[#f4efe6]">{post.content}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Feed • {post.author.username}
                      </p>
                    </Link>
                  ))}
                  {tournamentsList.length === 0 && feedList.length === 0 && (
                    <p className="text-xs text-neutral-500">Sem novidades recentes.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}