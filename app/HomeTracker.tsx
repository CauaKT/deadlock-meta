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

interface RecentSearch {
  label: string;
  href: string;
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

const STORAGE_KEY = "lp_recent_tracker_searches";

export default function HomeTracker({ heroes }: { heroes: HomeTrackerHero[] }) {
  const router = useRouter();
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [mode, setMode] = useState<"player" | "match">("player");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [highMmr, setHighMmr] = useState<HighMmrMatch[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentSearch[];
        if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5));
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/backend/external-data/leaderboard/SAmerica", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (lb: { entries?: Array<{ accountId: number | null; accountName: string }> } | null) => {
        const top = lb?.entries?.find((e) => typeof e.accountId === "number" && e.accountId > 0);
        if (!top?.accountId || cancelled) return;
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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const saveRecent = (entry: RecentSearch) => {
    setRecent((prev) => {
      const next = [entry, ...prev.filter((p) => p.href !== entry.href)].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = query.trim();
    if (!raw || resolving) return;
    setResolveError(null);

    if (mode === "match") {
      const cleanId = raw.replace(/\D/g, "");
      if (!cleanId) return;
      const href = `/matches/${cleanId}`;
      saveRecent({ label: `Partida #${cleanId}`, href });
      router.push(href);
      return;
    }

    if (raw.includes("steamcommunity.com/")) {
      setResolving(true);
      try {
        const res = await fetch(`/api/resolve-steam?q=${encodeURIComponent(raw)}`);
        const data = (await res.json().catch(() => null)) as { steamId?: string; error?: string } | null;
        if (!res.ok || !data?.steamId) {
          setResolveError(data?.error || "Não foi possível resolver o link da Steam.");
          return;
        }
        const href = `/player/${data.steamId}`;
        saveRecent({ label: `Steam #${data.steamId.slice(-6)}`, href });
        router.push(href);
      } finally {
        setResolving(false);
      }
      return;
    }

    if (raw.startsWith("@") || !/^\d+$/.test(raw)) {
      const cleanHandle = raw.replace(/^@+/, "");
      const href = `/profile/${encodeURIComponent(cleanHandle)}`;
      saveRecent({ label: `@${cleanHandle}`, href });
      router.push(href);
      return;
    }

    const href = `/player/${raw}`;
    saveRecent({ label: `Jogador #${raw}`, href });
    router.push(href);
  };

  return (
    <section className="mb-10 space-y-5">
      <SlantFrame
        shape="narrowTop"
        border="#3897a1"
        background="linear-gradient(160deg, rgba(16,44,48,0.9), rgba(7,12,14,0.97))"
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-cyan-300">
              LockPro Tracker
            </p>
            <h2 className="font-deadlock text-xl sm:text-2xl font-black text-[#f4efe6]">
              Buscar Jogador, <span className="text-amber-500">@handle</span> ou Partida
            </h2>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode("player")}
              className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase cursor-pointer ${
                mode === "player"
                  ? "bg-amber-500 text-black"
                  : "border border-white/15 bg-black/40 text-neutral-300"
              }`}
            >
              Jogador / @
            </button>
            <button
              type="button"
              onClick={() => setMode("match")}
              className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase cursor-pointer ${
                mode === "match"
                  ? "bg-amber-500 text-black"
                  : "border border-white/15 bg-black/40 text-neutral-300"
              }`}
            >
              Match ID
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "player"
                ? "Link da Steam, Steam ID64, Account ID ou @handle..."
                : "Digite o ID da partida (ex.: 31849201)..."
            }
            className="flex-1 rounded-[4px] border border-white/15 bg-black/55 px-4 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={resolving}
            className="rounded-[4px] bg-amber-500 px-5 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {resolving ? "Buscando..." : "Rastrear"}
          </button>
        </form>

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

      {highMmr.length > 0 && (
        <div className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
              Partidas Recentes de Alto MMR ({highMmr[0].playerName})
            </h3>
            <Link href="/leaderboard" className="text-[11px] font-bold text-neutral-400 hover:text-amber-400">
              Ver Leaderboard →
            </Link>
          </div>

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
        </div>
      )}
    </section>
  );
}