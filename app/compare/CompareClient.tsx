"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";

const COMPARE_STORAGE_KEY = "lp_compare_last";
const RECENT_PROFILES_KEY = "lp_recent_compare_profiles";

interface RecentCompareProfile {
  label: string;
  raw: string;
  avatarUrl?: string | null;
  accountId?: string;
}

export interface CompareHeroMeta {
  id: number;
  name: string;
  image: string | null;
  banner?: string | null;
  art?: string | null;
  rgb?: [number, number, number] | null;
}

interface NormalizedHeroStat {
  heroId: number;
  matches: number;
  wins: number;
  winRate: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  kda: number;
  soulsPerMin: number;
  damagePerMin: number;
  accuracy?: number;
  timePlayedSec?: number;
}

interface NormalizedPlayerSummary {
  accountId: string;
  personaName: string | null;
  avatarUrl: string | null;
  rankBadge: number | null;
  matches: number;
  wins: number;
  winRate: number;
  kda: number;
  soulsPerMin: number;
  damagePerMin: number;
  topHeroes: NormalizedHeroStat[];
}

export default function CompareClient({
  heroes,
  initialA = "",
  initialB = "",
}: {
  heroes: CompareHeroMeta[];
  initialA?: string;
  initialB?: string;
}) {
  const heroMap = new Map(heroes.map((h) => [h.id, h]));

  const [idA, setIdA] = useState(initialA);
  const [idB, setIdB] = useState(initialB);
  const [playerA, setPlayerA] = useState<NormalizedPlayerSummary | null>(null);
  const [playerB, setPlayerB] = useState<NormalizedPlayerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<RecentCompareProfile[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<{
    side: "A" | "B";
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const isUnloadingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PROFILES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentCompareProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentProfiles(parsed.filter((p) => p?.label && p?.raw).slice(0, 6));
          return;
        }
      }

      const trackerRaw = localStorage.getItem("lp_recent_tracker_searches");
      if (trackerRaw) {
        const parsed = JSON.parse(trackerRaw) as Array<{ label?: string; href?: string }>;
        if (Array.isArray(parsed)) {
          const fromTracker = parsed
            .filter((p) => p?.label && p?.href?.startsWith("/player/"))
            .map((p) => ({
              label: p.label!,
              raw: p.href!.replace("/player/", ""),
            }))
            .slice(0, 6);
          if (fromTracker.length > 0) setRecentProfiles(fromTracker);
        }
      }
    } catch {}
  }, []);

  const saveRecentProfiles = (entries: RecentCompareProfile[]) => {
    setRecentProfiles((prev) => {
      const merged = [...entries, ...prev];
      const unique: RecentCompareProfile[] = [];
      const seen = new Set<string>();
      for (const item of merged) {
        const key = item.raw.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
        if (unique.length >= 6) break;
      }
      try {
        localStorage.setItem(RECENT_PROFILES_KEY, JSON.stringify(unique));
      } catch {}
      return unique;
    });
  };

  const resolvePlayerId = async (rawInput: string): Promise<string> => {
    const clean = rawInput.trim().replace(/^@+/, "");
    if (/^\d{5,20}$/.test(clean)) return clean;

    const isUrlOrSteamId =
      /steamcommunity\.com\/(id|profiles)\//i.test(clean) ||
      /s\.team\/p\//i.test(clean) ||
      /^STEAM_[01]:[01]:\d+$/i.test(clean) ||
      /^\[U:1:\d+\]$/i.test(clean);

    const qs = isUrlOrSteamId
      ? `q=${encodeURIComponent(clean)}`
      : `mode=vanity&q=${encodeURIComponent(clean)}`;

    const res = await fetch(`/api/resolve-steam?${qs}`);
    const data = (await res.json().catch(() => null)) as { steamId?: string; error?: string } | null;
    if (!res.ok || !data?.steamId) {
      throw new Error(data?.error || `Steam ID / Link inválido: "${rawInput}"`);
    }
    return data.steamId;
  };

  const fetchPlayer = async (rawId: string): Promise<NormalizedPlayerSummary> => {
    const clean = await resolvePlayerId(rawId);
    const res = await fetch(`/api/backend/external-data/player/${encodeURIComponent(clean)}/summary`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || `Erro ao buscar jogador ${clean}.`);
    }
    return (await res.json()) as NormalizedPlayerSummary;
  };

  const runCompare = async (rawA: string, rawB: string) => {
    if (!rawA.trim() || !rawB.trim()) {
      setError("Informe os dois links da Steam, Steam IDs ou Account IDs para comparar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([fetchPlayer(rawA), fetchPlayer(rawB)]);
      setPlayerA(a);
      setPlayerB(b);
      saveRecentProfiles([
        {
          label: a.personaName || `#${a.accountId}`,
          raw: rawA.trim(),
          avatarUrl: a.avatarUrl,
          accountId: a.accountId,
        },
        {
          label: b.personaName || `#${b.accountId}`,
          raw: rawB.trim(),
          avatarUrl: b.avatarUrl,
          accountId: b.accountId,
        },
      ]);
      try {
        sessionStorage.setItem(
          COMPARE_STORAGE_KEY,
          JSON.stringify({ a: rawA.trim(), b: rawB.trim() }),
        );
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao comparar jogadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onBeforeUnload = () => {
      isUnloadingRef.current = true;
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    if (initialA.trim() && initialB.trim()) {
      void runCompare(initialA, initialB);
    } else {
      try {
        const navEntry = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        if (navEntry?.type === "reload") {
          const raw = sessionStorage.getItem(COMPARE_STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as { a?: string; b?: string };
            if (saved.a && saved.b) {
              setIdA(saved.a);
              setIdB(saved.b);
              void runCompare(saved.a, saved.b);
            }
          }
        } else {
          sessionStorage.removeItem(COMPARE_STORAGE_KEY);
        }
      } catch {}
    }

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (!isUnloadingRef.current) {
        try {
          sessionStorage.removeItem(COMPARE_STORAGE_KEY);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialA, initialB]);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCompare(idA, idB);
  };

  const metrics: Array<{
    label: string;
    valA: number;
    valB: number;
    fmt: (v: number) => string;
  }> = playerA && playerB
    ? [
        { label: "Win Rate", valA: playerA.winRate, valB: playerB.winRate, fmt: (v) => `${v.toFixed(2)}%` },
        { label: "Partidas", valA: playerA.matches, valB: playerB.matches, fmt: (v) => v.toLocaleString("pt-BR") },
        { label: "KDA Médio", valA: playerA.kda, valB: playerB.kda, fmt: (v) => v.toFixed(2) },
        { label: "Almas / min", valA: playerA.soulsPerMin, valB: playerB.soulsPerMin, fmt: (v) => v.toFixed(1) },
        { label: "Dano / min", valA: playerA.damagePerMin, valB: playerB.damagePerMin, fmt: (v) => v.toFixed(1) },
      ]
    : [];

  const summarizePlayer = (p: NormalizedPlayerSummary) => {
    const totalKills = p.topHeroes.reduce((acc, h) => acc + (h.kills ?? 0), 0);
    const totalAssists = p.topHeroes.reduce((acc, h) => acc + (h.assists ?? 0), 0);
    const totalSec = p.topHeroes.reduce((acc, h) => acc + (h.timePlayedSec ?? 0), 0);
    const accMatches = p.topHeroes.reduce((acc, h) => acc + (h.accuracy ? h.matches : 0), 0);
    const weightedAcc =
      accMatches > 0
        ? p.topHeroes.reduce((acc, h) => acc + (h.accuracy ?? 0) * (h.accuracy ? h.matches : 0), 0) / accMatches
        : 0;
    const heroGames = Math.max(1, p.topHeroes.reduce((acc, h) => acc + h.matches, 0));

    return {
      wins: p.wins,
      totalKills,
      killsPerMatch: totalKills / heroGames,
      assistsPerMatch: totalAssists / heroGames,
      accuracy: weightedAcc,
      hoursPlayed: totalSec / 3600,
    };
  };

  const extraMetrics: Array<{
    label: string;
    valA: number;
    valB: number;
    fmt: (v: number) => string;
  }> =
    playerA && playerB
      ? (() => {
          const sA = summarizePlayer(playerA);
          const sB = summarizePlayer(playerB);
          return [
            { label: "Vitórias", valA: sA.wins, valB: sB.wins, fmt: (v) => v.toLocaleString("pt-BR") },
            { label: "Abates Totais", valA: sA.totalKills, valB: sB.totalKills, fmt: (v) => v.toLocaleString("pt-BR") },
            { label: "Abates / Partida", valA: sA.killsPerMatch, valB: sB.killsPerMatch, fmt: (v) => v.toFixed(1) },
            { label: "Assist. / Partida", valA: sA.assistsPerMatch, valB: sB.assistsPerMatch, fmt: (v) => v.toFixed(1) },
            { label: "Precisão Média", valA: sA.accuracy, valB: sB.accuracy, fmt: (v) => `${v.toFixed(1)}%` },
            { label: "Tempo Jogado", valA: sA.hoursPlayed, valB: sB.hoursPlayed, fmt: (v) => `${v.toFixed(1)}h` },
          ];
        })()
      : [];

  const allMetrics = [...metrics, ...extraMetrics];

  const comparisonSummary = (() => {
    if (!playerA || !playerB || allMetrics.length === 0) return null;

    let winsA = 0;
    let winsB = 0;
    let shareSumA = 0;

    for (const m of allMetrics) {
      if (m.valA > m.valB) winsA += 1;
      else if (m.valB > m.valA) winsB += 1;

      const total = m.valA + m.valB;
      shareSumA += total > 0 ? m.valA / total : 0.5;
    }

    const scoreA = (shareSumA / allMetrics.length) * 100;
    const scoreB = 100 - scoreA;
    const diff = Math.abs(scoreA - scoreB);
    const isTie = diff < 0.05 && winsA === winsB;

    const winnerSide: "A" | "B" | "TIE" = isTie
      ? "TIE"
      : scoreA >= scoreB
        ? "A"
        : "B";

    const winnerScore = Math.max(scoreA, scoreB);
    const loserScore = Math.min(scoreA, scoreB);
    const advantagePct = winnerScore - loserScore;

    return {
      scoreA,
      scoreB,
      winsA,
      winsB,
      winnerSide,
      advantagePct,
      winnerId: winnerSide === "A" ? playerA.accountId : playerB.accountId,
      winnerName:
        winnerSide === "A"
          ? playerA.personaName || `#${playerA.accountId}`
          : playerB.personaName || `#${playerB.accountId}`,
    };
  })();

  return (
    <div className="space-y-8">
      <SlantFrame
        shape="narrowTop"
        border="linear-gradient(90deg, #22d3ee 0%, #3897a1 35%, #d97706 65%, #f59e0b 100%)"
        background="linear-gradient(90deg, rgba(14,74,92,0.92) 0%, rgba(12,16,18,0.94) 50%, rgba(96,46,10,0.92) 100%)"
      >
        <form onSubmit={handleCompare} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="block font-deadlock text-[11px] font-black uppercase tracking-wider text-cyan-300">
              Jogador 1 (Link da Steam ou ID)
            </label>
            <input
              type="text"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveDropdown({ side: "A", top: r.bottom + 6, left: r.left, width: r.width });
              }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveDropdown({ side: "A", top: r.bottom + 6, left: r.left, width: r.width });
              }}
              onBlur={() => setActiveDropdown(null)}
              placeholder="Ex.: steamcommunity.com/id/... ou 7656119..."
              className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[4px] bg-amber-500 py-2.5 px-4 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Comparando..." : "Comparar 1v1"}
            </button>
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <label className="block font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-300">
              Jogador 2 (Link da Steam ou ID)
            </label>
            <input
              type="text"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveDropdown({ side: "B", top: r.bottom + 6, left: r.left, width: r.width });
              }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveDropdown({ side: "B", top: r.bottom + 6, left: r.left, width: r.width });
              }}
              onBlur={() => setActiveDropdown(null)}
              placeholder="Ex.: steamcommunity.com/id/... ou 7656119..."
              className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </form>

        {activeDropdown && recentProfiles.length > 0 && typeof document !== "undefined" &&
          createPortal(
            <div
              style={{
                top: activeDropdown.top,
                left: activeDropdown.left,
                width: activeDropdown.width,
              }}
              className="fixed z-50 overflow-hidden rounded-[5px] border border-white/20 bg-[#0a0d0c]/98 shadow-[0_16px_40px_rgba(0,0,0,0.95)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                <span className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Perfis Recentes
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setRecentProfiles([]);
                    setActiveDropdown(null);
                    try {
                      localStorage.removeItem(RECENT_PROFILES_KEY);
                    } catch {}
                  }}
                  className="text-[10px] font-semibold text-neutral-500 hover:text-rose-400 cursor-pointer"
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 lp-scroll">
                {recentProfiles.map((item) => (
                  <button
                    key={`${activeDropdown.side}-${item.raw}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (activeDropdown.side === "A") setIdA(item.raw);
                      else setIdB(item.raw);
                      setActiveDropdown(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-[4px] border border-transparent bg-black/35 px-2.5 py-2 text-left transition-colors hover:border-amber-500/35 hover:bg-amber-500/10 cursor-pointer"
                  >
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-[4px] border border-white/15 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-white/15 bg-neutral-900 font-deadlock text-sm font-black text-amber-400">
                        {item.label.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-deadlock text-xs font-black tracking-wide text-[#f4efe6]">
                        {item.label}
                      </p>
                      <p className="truncate font-mono text-[10px] text-neutral-400">
                        {item.accountId ? `ID: ${item.accountId}` : item.raw}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )}
      </SlantFrame>

      {error && (
        <div className="rounded-[5px] border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {playerA && playerB && (
        <div className="space-y-6">
          {/* Cabeçalhos dos dois jogadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { p: playerA, shape: "slantLeft" as const, border: "#3897a1", bg: "linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))" },
              { p: playerB, shape: "slantRight" as const, border: "#c97a2e", bg: "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))" },
            ].map(({ p, shape, border, bg }) => (
              <SlantFrame key={p.accountId} shape={shape} border={border} background={bg}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-[4px] border border-white/15 object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-white/15 bg-black/50 font-deadlock text-lg font-black text-amber-400">
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/player/${p.accountId}`}
                        className="block truncate font-deadlock text-lg font-black text-[#f4efe6] hover:text-amber-400"
                      >
                        {p.personaName || `Jogador #${p.accountId}`}
                      </Link>
                      <p className="font-mono text-[11px] text-neutral-400">ID: {p.accountId}</p>
                    </div>
                  </div>
                  <Link
                    href={`/player/${p.accountId}`}
                    className="shrink-0 rounded-[4px] border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-bold text-neutral-200 hover:border-amber-400 hover:text-amber-400"
                  >
                    Ver Perfil
                  </Link>
                </div>
              </SlantFrame>
            ))}
          </div>

          {/* Tela de Win / Veredito 1v1 */}
          {comparisonSummary && (
            <SlantFrame
              shape="narrowTop"
              border={
                comparisonSummary.winnerSide === "A"
                  ? "#3897a1"
                  : comparisonSummary.winnerSide === "B"
                    ? "#f59e0b"
                    : "#525252"
              }
              background={
                comparisonSummary.winnerSide === "A"
                  ? "linear-gradient(135deg, rgba(16,44,48,0.94), rgba(6,10,12,0.98))"
                  : comparisonSummary.winnerSide === "B"
                    ? "linear-gradient(135deg, rgba(56,34,10,0.94), rgba(8,10,10,0.98))"
                    : "linear-gradient(135deg, rgba(24,24,27,0.94), rgba(8,10,10,0.98))"
              }
              className="space-y-5 px-5 sm:px-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  {comparisonSummary.winnerSide !== "TIE" && (() => {
                    const winner = comparisonSummary.winnerSide === "A" ? playerA : playerB;
                    const isA = comparisonSummary.winnerSide === "A";
                    return (
                      <Link
                        href={`/player/${winner.accountId}`}
                        className="relative shrink-0 transition-transform hover:scale-105"
                      >
                        {winner.avatarUrl ? (
                          <img
                            src={winner.avatarUrl}
                            alt=""
                            className={`h-20 w-20 sm:h-24 sm:w-24 rounded-[5px] object-cover border-2 ${
                              isA
                                ? "border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.3)]"
                                : "border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.3)]"
                            }`}
                          />
                        ) : (
                          <div
                            className={`flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[5px] border-2 bg-black/60 font-deadlock text-2xl font-black ${
                              isA ? "border-cyan-400 text-cyan-300" : "border-amber-400 text-amber-400"
                            }`}
                          >
                            ★
                          </div>
                        )}
                      </Link>
                    );
                  })()}

                  <div className="min-w-0">
                    {comparisonSummary.winnerSide === "TIE" ? (
                      <h2 className="font-deadlock text-3xl sm:text-4xl font-black text-[#f4efe6]">
                        Empate Técnico
                      </h2>
                    ) : (
                      <h2 className="truncate font-deadlock text-3xl sm:text-4xl font-black leading-tight text-[#f4efe6]">
                        <Link
                          href={`/player/${comparisonSummary.winnerId}`}
                          className="hover:underline"
                        >
                          Vitória de{" "}
                          <span
                            className={
                              comparisonSummary.winnerSide === "A" ? "text-cyan-300" : "text-amber-400"
                            }
                          >
                            {comparisonSummary.winnerName}
                          </span>
                        </Link>
                      </h2>
                    )}
                  </div>
                </div>

                {comparisonSummary.winnerSide !== "TIE" && (
                  <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 flex-col items-center justify-center rounded-full border-2 border-emerald-400/75 bg-gradient-to-b from-emerald-950/60 to-black/85 p-2 text-center shadow-[0_0_26px_rgba(16,185,129,0.24)]">
                    <p className="font-mono text-2xl sm:text-[26px] font-black leading-tight text-emerald-400">
                      {Math.max(comparisonSummary.scoreA, comparisonSummary.scoreB).toFixed(1)}%
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                      {comparisonSummary.winnerSide === "A"
                        ? comparisonSummary.winsA
                        : comparisonSummary.winsB}
                      /{allMetrics.length} métricas
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-2 text-xs font-mono font-black">
                  <span className="truncate text-cyan-300">
                    {playerA.personaName || `#${playerA.accountId}`}{" "}
                    <span className="ml-1 rounded-[3px] bg-cyan-500/15 px-1.5 py-0.5 text-[11px]">
                      {comparisonSummary.scoreA.toFixed(1)}%
                    </span>
                  </span>
                  <span className="truncate text-right text-amber-400">
                    <span className="mr-1 rounded-[3px] bg-amber-500/15 px-1.5 py-0.5 text-[11px]">
                      {comparisonSummary.scoreB.toFixed(1)}%
                    </span>{" "}
                    {playerB.personaName || `#${playerB.accountId}`}
                  </span>
                </div>

                <div className="relative flex h-4 w-full items-center overflow-visible rounded-[3px] border border-white/15 bg-black/70">
                  <div
                    className="h-full rounded-l-[2px] bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-500"
                    style={{ width: `${comparisonSummary.scoreA}%` }}
                  />
                  <div
                    className="h-full rounded-r-[2px] bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${comparisonSummary.scoreB}%` }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${comparisonSummary.scoreA}%` }}
                  >
                    <svg viewBox="0 0 20 32" className="h-6 w-4">
                      <polygon
                        points="12,0 2,18 9,18 7,32 18,13 11,13"
                        fill="#070908"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </SlantFrame>
          )}

          {/* Comparação métrica a métrica */}
          <div className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-5 space-y-3 shadow-2xl">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
              Comparativo Direto
            </h2>

            <div className="divide-y divide-white/10">
              {allMetrics.map((m) => {
                const aWins = m.valA > m.valB;
                const bWins = m.valB > m.valA;
                const minVal = Math.min(m.valA, m.valB);
                const maxVal = Math.max(m.valA, m.valB);
                const edgePct =
                  maxVal > minVal && minVal > 0
                    ? ((maxVal - minVal) / minVal) * 100
                    : null;

                return (
                  <div key={m.label} className="grid grid-cols-3 items-center py-3 text-xs sm:text-sm">
                    <span className={`font-mono font-black ${aWins ? "text-emerald-400" : "text-neutral-300"}`}>
                      {m.fmt(m.valA)}
                      {aWins && edgePct !== null && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-300/80">
                          +{edgePct.toFixed(1)}%
                        </span>
                      )}
                    </span>
                    <span className="text-center font-deadlock text-[11px] uppercase tracking-wider text-neutral-400">
                      {m.label}
                    </span>
                    <span className={`text-right font-mono font-black ${bWins ? "text-emerald-400" : "text-neutral-300"}`}>
                      {bWins && edgePct !== null && (
                        <span className="mr-2 text-[10px] font-bold text-emerald-300/80">
                          +{edgePct.toFixed(1)}%
                        </span>
                      )}
                      {m.fmt(m.valB)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Melhores Heróis lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { p: playerA, shape: "slantLeft" as const, border: "#3897a1", bg: "linear-gradient(160deg, rgba(16,44,48,0.86), rgba(7,12,14,0.97))" },
              { p: playerB, shape: "slantRight" as const, border: "#c97a2e", bg: "linear-gradient(160deg, rgba(44,28,12,0.86), rgba(8,10,10,0.97))" },
            ].map(({ p, shape, border, bg }, idx) => (
              <SlantFrame
                key={`heroes-${p.accountId}-${idx}`}
                shape={shape}
                border={border}
                background={bg}
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                    Melhores Heróis — {p.personaName || `#${p.accountId}`}
                  </h3>
                  <span className="font-mono text-[10px] text-neutral-400">Top 5</span>
                </div>

                {p.topHeroes.length === 0 ? (
                  <p className="text-xs text-neutral-500">Sem histórico de heróis disponível.</p>
                ) : (
                  <div className="space-y-2">
                    {p.topHeroes.slice(0, 5).map((h, heroIdx) => {
                      const meta = heroMap.get(h.heroId);
                      const [r, g, b] = meta?.rgb ?? [245, 158, 11];
                      const heroRgb = `${r}, ${g}, ${b}`;
                      const roundedWr = Number(h.winRate.toFixed(1));
                      const isWin = roundedWr > 50;
                      const isLoss = roundedWr < 50;
                      const wrTextClass = isWin
                        ? "text-emerald-400"
                        : isLoss
                          ? "text-rose-400"
                          : "text-neutral-400";
                      const wrBarClass = isWin
                        ? "bg-emerald-400"
                        : isLoss
                          ? "bg-rose-400"
                          : "bg-neutral-400";
                      const hours = ((h.timePlayedSec ?? 0) / 3600).toFixed(1);

                      return (
                        <Link
                          key={h.heroId}
                          href={`/player/${p.accountId}?heroId=${h.heroId}`}
                          className="group relative z-0 hover:z-30 flex items-center justify-between gap-3 rounded-[4px] border border-white/10 bg-black/45 p-2.5 transition-all hover:border-white/25 hover:bg-black/60"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {meta?.image && (
                              <img
                                src={meta.image}
                                alt=""
                                style={{
                                  filter: `drop-shadow(0 0 7px rgba(${heroRgb}, 0.75))`,
                                }}
                                className="h-10 w-10 shrink-0 object-contain"
                              />
                            )}
                            <p className="truncate font-deadlock text-sm font-black tracking-wide text-[#f4efe6]">
                              {meta?.name ?? `Herói #${h.heroId}`}
                            </p>
                          </div>

                          <div className="shrink-0 text-right space-y-1">
                            <span className={`block font-mono text-xs font-black leading-none ${wrTextClass}`}>
                              {roundedWr.toFixed(1)}%
                            </span>
                            <div className="ml-auto h-1 w-14 overflow-hidden rounded-full bg-black/60">
                              <div
                                className={`h-full rounded-full ${wrBarClass}`}
                                style={{ width: `${Math.min(100, Math.max(0, h.winRate))}%` }}
                              />
                            </div>
                            <p className="font-mono text-[10px] leading-none text-neutral-400">
                              {h.matches} jogos
                            </p>
                          </div>

                          <div
                            style={{
                              borderColor: `rgba(${heroRgb}, 0.6)`,
                              backgroundColor: "#070908",
                              boxShadow: `0 20px 44px rgba(0, 0, 0, 0.96), 0 0 26px rgba(${heroRgb}, 0.2)`,
                            }}
                            className={`dl-noise pointer-events-none absolute left-1 right-1 z-40 overflow-hidden rounded-[5px] border p-3.5 scale-95 translate-y-1 opacity-0 transition-all duration-200 ease-out group-hover:scale-100 group-hover:translate-y-0 group-hover:opacity-100 ${
                              heroIdx < 2 ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
                            }`}
                          >
                            {(meta?.banner || meta?.image) && (
                              <img
                                src={meta.banner || meta.image!}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover object-center opacity-50"
                              />
                            )}
                            {meta?.art && (
                              <img
                                src={meta.art}
                                alt=""
                                onError={(e) => {
                                  if (meta.image && e.currentTarget.src !== meta.image) {
                                    e.currentTarget.src = meta.image;
                                  } else {
                                    e.currentTarget.style.display = "none";
                                  }
                                }}
                                style={{
                                  filter: `drop-shadow(0 0 14px rgba(${heroRgb}, 0.65))`,
                                  transform: "scaleX(-1.15) scaleY(1.15)",
                                }}
                                className="absolute -left-2 -top-2 h-40 w-auto object-contain opacity-80"
                              />
                            )}
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(100deg, rgba(7,9,8,0.52) 0%, rgba(7,9,8,0.84) 48%, rgba(7,9,8,0.95) 100%)`,
                              }}
                            />
                            <div
                              className="absolute inset-x-0 top-0 h-[2px]"
                              style={{ backgroundColor: `rgb(${heroRgb})` }}
                            />

                            <div className="relative flex items-center justify-between gap-2 border-b border-white/15 pb-2.5 mb-2.5">
                              <div className="min-w-0">
                                <p className="truncate font-deadlock text-base font-black uppercase tracking-wide text-[#f4efe6] drop-shadow">
                                  {meta?.name ?? `Herói #${h.heroId}`}
                                </p>
                                <p className="font-mono text-[10px] text-neutral-300">
                                  {h.matches} partidas jogadas
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-black">
                                <span className="rounded-[3px] border border-emerald-500/35 bg-[#070908]/85 px-1.5 py-0.5 text-emerald-400">
                                  {h.wins}V
                                </span>
                                <span className="rounded-[3px] border border-rose-500/35 bg-[#070908]/85 px-1.5 py-0.5 text-rose-400">
                                  {Math.max(0, h.matches - h.wins)}D
                                </span>
                              </div>
                            </div>

                            <div className="relative grid grid-cols-3 gap-1.5 text-[11px]">
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">KDA</p>
                                <p className="font-mono text-xs font-black text-amber-400">{h.kda.toFixed(2)}</p>
                              </div>
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Almas/min</p>
                                <p className="font-mono text-xs font-black text-[#f4efe6]">{h.soulsPerMin.toFixed(1)}</p>
                              </div>
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Dano/min</p>
                                <p className="font-mono text-xs font-black text-[#f4efe6]">{h.damagePerMin.toFixed(1)}</p>
                              </div>
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Precisão</p>
                                <p className="font-mono text-xs font-black text-cyan-300">
                                  {(h.accuracy ?? 0).toFixed(1)}%
                                </p>
                              </div>
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Abates</p>
                                <p className="font-mono text-xs font-black text-[#f4efe6]">
                                  {(h.kills ?? 0).toLocaleString("pt-BR")}
                                </p>
                              </div>
                              <div className="rounded-[4px] border border-white/10 bg-[#070908]/80 px-2.5 py-1.5 backdrop-blur-xs">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Tempo</p>
                                <p className="font-mono text-xs font-black text-[#f4efe6]">{hours}h</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </SlantFrame>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}