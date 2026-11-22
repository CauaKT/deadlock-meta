"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WORLD_PATHS } from "./worldMapData";

interface DailyPoint {
  date: string;
  players: number;
  matches: number;
}

interface RankTier {
  tier: number;
  uniquePlayers: number;
}

interface PlayerbaseData {
  daily: DailyPoint[];
  rankedDistribution: {
    totalPlayers: number;
    tiers: RankTier[];
  };
  regions: Array<{ region: string; players: number }>;
  fetchedAt: string;
}

const PLATE =
  "rounded-[3px] border border-black/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]";

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

const REGION_LABELS: Record<string, string> = {
  Europe: "Europa",
  Row: "América do Norte",
  SAmerica: "América do Sul",
  SEAsia: "Ásia",
  Oceania: "Oceania",
  Desconhecida: "Outras / N/D",
};

const MAP_REGIONS: Array<{
  id: string;
  label: string;
  pinX: number;
  pinY: number;
}> = [
  { id: "Row", label: "América do Norte", pinX: 228, pinY: 141 },
  { id: "SAmerica", label: "América do Sul", pinX: 344, pinY: 315 },
  { id: "Europe", label: "Europa", pinX: 542, pinY: 105 },
  { id: "SEAsia", label: "Ásia", pinX: 792, pinY: 164 },
  { id: "Oceania", label: "Oceania", pinX: 875, pinY: 352 },
];

function tierIconUrl(tier: number): string {
  return `https://api.deadlock-api.com/v1/assets/ranks/${tier}/6/image?format=webp`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default function PlayerbaseClient() {
  const router = useRouter();
  const [data, setData] = useState<PlayerbaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<"players" | "matches">("players");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/backend/external-data/playerbase", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Não foi possível carregar os dados da playerbase.");
        return res.json();
      })
      .then((json: PlayerbaseData) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar playerbase.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const daily = data?.daily ?? [];
  const lastClosed = daily.length >= 2 ? daily[daily.length - 2] : daily[daily.length - 1] ?? null;
  const peakPlayers = daily.reduce((max, d) => (d.players > max ? d.players : max), 0);

  const regionsList = data?.regions ?? [];
  const totalRegions = regionsList.reduce((s, r) => s + r.players, 0) || 1;
  const maxRegionCount = regionsList.reduce((m, r) => (r.players > m ? r.players : m), 1);
  const regionCountMap = new Map(regionsList.map((r) => [r.region, r.players]));

  const maxTierPlayers = (data?.rankedDistribution.tiers ?? []).reduce(
    (max, t) => (t.uniquePlayers > max ? t.uniquePlayers : max),
    1,
  );

  // Geometria do gráfico vetorial no padrão HeroPatchEvolution
  const accent = metric === "players" ? "#f59e0b" : "#34d399";
  const series = daily.map((d) => (metric === "players" ? d.players : d.matches));
  const rawMin = series.length > 0 ? Math.min(...series) : 0;
  const rawMax = series.length > 0 ? Math.max(...series) : 100;
  const padMargin = Math.max(1000, Math.round((rawMax - rawMin) * 0.18));
  const minY = Math.max(0, rawMin - padMargin);
  const maxY = rawMax + padMargin;
  const rangeY = maxY - minY || 1;

  const width = 760;
  const height = 240;
  const padX = 58;
  const padY = 26;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const stepX = daily.length > 1 ? chartW / (daily.length - 1) : 0;

  const points = daily.map((d, i) => {
    const val = metric === "players" ? d.players : d.matches;
    const x = padX + i * stepX;
    const y = padY + ((maxY - val) / rangeY) * chartH;
    const label = `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`;
    return { ...d, val, label, x, y };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
      : "";

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minY + rangeY * t));
  const activePoint =
    points.length > 0
      ? activeIdx !== null && points[activeIdx]
        ? points[activeIdx]
        : points[points.length - 1]
      : null;

  return (
    <div className="space-y-6">
      <header className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-400 hover:text-amber-400 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            Voltar ao Leaderboard
          </Link>
          <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Player<span className="text-amber-500">base</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
            Atividade diária de jogadores, partidas, distribuição regional e patentes dos últimos 14 dias.
          </p>
        </div>

        <a
          href="https://steamdb.info/app/1422450/charts/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start md:self-auto rounded-[5px] border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500 hover:text-black transition-colors"
        >
          Abrir no SteamDB
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </header>

      {error && (
        <div className="rounded-[5px] border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[5px] border border-white/10 bg-[#0a0d0c]/80 animate-pulse" />
          ))}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Jogadores Únicos (Último Dia)
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#f4efe6]">
                {(lastClosed?.players ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Partidas (Último Dia)
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-amber-400">
                {(lastClosed?.matches ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Pico Diário (14d)
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-emerald-400">
                {peakPlayers.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Ranqueados (14d)
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#f4efe6]">
                {data.rankedDistribution.totalPlayers.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* GRÁFICO VETORIAL NO PADRÃO DA ABA DE HERÓIS */}
          {points.length >= 2 && (
            <section
              className="dl-noise dl-halftone relative overflow-hidden rounded-[3px_8px_3px_6px] border-2 p-5 sm:p-6 space-y-5"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 45%, #1b2621)`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 16%, #0c1110), #0c1110 70%)`,
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.65), 0 10px 28px rgba(0,0,0,0.85)",
              }}
            >
              <div className="border-b border-black/30 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className="font-deadlock text-base font-black uppercase tracking-wider"
                    style={{ color: `color-mix(in srgb, ${accent} 65%, #ffffff)` }}
                  >
                    Evolução Diária (14 dias)
                  </span>
                  {activePoint && (
                    <p className="text-[11px] font-semibold text-[#d6c9b4]/85">
                      {activePoint.label}:{" "}
                      <span className="font-mono font-bold text-[#f4efe6]">
                        {activePoint.val.toLocaleString("pt-BR")}
                      </span>{" "}
                      {metric === "players" ? "jogadores únicos" : "partidas"}
                    </p>
                  )}
                </div>

                <div className="inline-flex rounded-[4px] border border-white/12 bg-black/55 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMetric("players")}
                    className={`px-3 py-1 rounded-[3px] font-deadlock text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      metric === "players" ? "bg-amber-500 text-black" : "text-neutral-300 hover:text-white"
                    }`}
                  >
                    Jogadores
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetric("matches")}
                    className={`px-3 py-1 rounded-[3px] font-deadlock text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      metric === "matches" ? "bg-emerald-400 text-black" : "text-neutral-300 hover:text-white"
                    }`}
                  >
                    Partidas
                  </button>
                </div>
              </div>

              <div className={`relative overflow-hidden ${PLATE} p-3 sm:p-4`}>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="pbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity="0.38" />
                      <stop offset="85%" stopColor={accent} stopOpacity="0.06" />
                      <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="pbGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2.8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {gridTicks.map((tickVal, idx) => {
                    const yPos = padY + ((maxY - tickVal) / rangeY) * chartH;
                    return (
                      <g key={idx}>
                        <line
                          x1={padX}
                          y1={yPos}
                          x2={width - padX}
                          y2={yPos}
                          stroke="rgba(255, 255, 255, 0.08)"
                          strokeWidth="1"
                        />
                        <text
                          x={padX - 10}
                          y={yPos + 3.5}
                          textAnchor="end"
                          className="fill-neutral-400 font-mono text-[10px]"
                        >
                          {formatCompact(tickVal)}
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaD} fill="url(#pbAreaGrad)" />
                  <path
                    d={lineD}
                    fill="none"
                    stroke={accent}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#pbGlow)"
                  />

                  {points.map((p, idx) => {
                    const isActive = activePoint?.date === p.date;
                    return (
                      <g
                        key={p.date}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseLeave={() => setActiveIdx(null)}
                        className="cursor-pointer"
                      >
                        {isActive && (
                          <line
                            x1={p.x}
                            y1={padY}
                            x2={p.x}
                            y2={height - padY}
                            stroke="rgba(255,255,255,0.22)"
                            strokeDasharray="3 3"
                          />
                        )}
                        <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isActive ? 5.5 : 3.5}
                          fill={isActive ? "#ffffff" : accent}
                          stroke="#0a0d0c"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={height - 6}
                          textAnchor="middle"
                          className={`font-mono text-[10px] ${
                            isActive ? "fill-[#f4efe6] font-bold" : "fill-neutral-400"
                          }`}
                        >
                          {p.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>
          )}

          {/* MAPA MUNDI COM REGIÕES BRILHANDO POR DENSIDADE DE JOGADORES */}
          <section
            className="dl-noise dl-halftone relative overflow-hidden rounded-[3px_8px_3px_6px] border-2 p-5 sm:p-6 space-y-4"
            style={{
              borderColor: "color-mix(in srgb, #f59e0b 35%, #1b2621)",
              background: "linear-gradient(135deg, color-mix(in srgb, #f59e0b 12%, #0c1110), #0c1110 72%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.65), 0 10px 28px rgba(0,0,0,0.85)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/30 pb-3">
              <div>
                <h2 className="font-deadlock text-base font-black uppercase tracking-wider text-amber-400">
                  Mapa Global de Jogadores
                </h2>
                <p className="text-[11px] text-[#d6c9b4]/80">
                  Concentração de jogadores por região em destaque
                </p>
              </div>
              <span className="font-mono text-xs text-neutral-300">
                Total mapeado: {totalRegions.toLocaleString("pt-BR")}
              </span>
            </div>

            <div className={`relative overflow-hidden ${PLATE} p-3 sm:p-4`}>
              <svg viewBox="0 0 1000 460" className="w-full h-auto max-h-[420px] select-none">

                {/* Grade discreta do mapa */}
                {[115, 230, 345].map((y) => (
                  <line
                    key={`h-${y}`}
                    x1="0"
                    y1={y}
                    x2="1000"
                    y2={y}
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="1"
                  />
                ))}
                {[200, 400, 600, 800].map((x) => (
                  <line
                    key={`v-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="460"
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="1"
                  />
                ))}

                {/* Países neutros (África, Groenlândia, etc.) */}
                <path
                  d={WORLD_PATHS.neutral}
                  fill="#151c19"
                  stroke="#0a0d0c"
                  strokeWidth="0.6"
                />

                {MAP_REGIONS.map((reg) => {
                  const count = regionCountMap.get(reg.id) ?? 0;
                  const ratio = count / maxRegionCount;
                  const pct = ((count / totalRegions) * 100).toFixed(1);
                  const active = hoveredRegion === reg.id;
                  const fillOpacity = 0.22 + ratio * 0.68;
                  const d = WORLD_PATHS[reg.id] ?? "";

                  return (
                    <g
                      key={reg.id}
                      onMouseEnter={() => setHoveredRegion(reg.id)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => router.push(`/leaderboard?region=${encodeURIComponent(reg.id)}`)}
                      className="cursor-pointer"
                    >
                      <path
                        d={d}
                        fill={`rgba(245, 158, 11, ${active ? Math.min(0.95, fillOpacity + 0.15) : fillOpacity})`}
                        stroke={active ? "#fef3c7" : "#0a0d0c"}
                        strokeWidth={active ? 1 : 0.6}
                        className="transition-all duration-150"
                      />
                      <circle
                        cx={reg.pinX}
                        cy={reg.pinY}
                        r={active ? 6 : 4.5}
                        fill="#fef3c7"
                        stroke="#92400e"
                        strokeWidth="1.8"
                        className="pointer-events-none"
                      />
                      <text
                        x={reg.pinX}
                        y={reg.pinY - 11}
                        textAnchor="middle"
                        paintOrder="stroke"
                        stroke="#080b0a"
                        strokeWidth="3.5"
                        className="pointer-events-none fill-[#f4efe6] text-[12px] font-bold"
                      >
                        {reg.label}
                      </text>
                      <text
                        x={reg.pinX}
                        y={reg.pinY + 17}
                        textAnchor="middle"
                        paintOrder="stroke"
                        stroke="#080b0a"
                        strokeWidth="3.5"
                        className="pointer-events-none fill-amber-300 font-mono text-[11px] font-bold"
                      >
                        {count.toLocaleString("pt-BR")} ({pct}%)
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-5 space-y-3">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400">
                Jogadores por Região (Snapshot)
              </h2>
              <div className="space-y-2.5">
                {regionsList.map((r) => {
                  const pct = ((r.players / totalRegions) * 100).toFixed(1);
                  const active = hoveredRegion === r.region;
                  return (
                    <div
                      key={r.region}
                      onMouseEnter={() => setHoveredRegion(r.region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      className={`space-y-1 rounded-[4px] p-1.5 transition-colors ${
                        active ? "bg-white/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-200 font-semibold">
                          {REGION_LABELS[r.region] ?? r.region}
                        </span>
                        <span className="font-mono text-neutral-300">
                          {r.players.toLocaleString("pt-BR")} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
                        <div className="h-full bg-amber-500/85" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-5 space-y-3">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400">
                Distribuição de Patentes (14d)
              </h2>
              <div className="space-y-2">
                {[...data.rankedDistribution.tiers]
                  .sort((a, b) => b.tier - a.tier)
                  .map((t) => {
                    const pct = Math.max(2, Math.round((t.uniquePlayers / maxTierPlayers) * 100));
                    return (
                      <div key={t.tier} className="flex items-center gap-2.5 text-xs">
                        <img
                          src={tierIconUrl(t.tier)}
                          alt={RANK_NAMES[t.tier] ?? `Tier ${t.tier}`}
                          className="h-5 w-5 object-contain shrink-0"
                        />
                        <span className="w-24 text-neutral-200 truncate">
                          {RANK_NAMES[t.tier] ?? `Tier ${t.tier}`}
                        </span>
                        <div className="flex-1 h-2 rounded bg-white/10 overflow-hidden">
                          <div className="h-full bg-emerald-400/80" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-16 text-right font-mono text-neutral-300">
                          {t.uniquePlayers.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}