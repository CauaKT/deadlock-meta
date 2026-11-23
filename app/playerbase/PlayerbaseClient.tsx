"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PLAYERBASE_MAP_REGIONS,
  PLAYERBASE_REGION_LABELS,
  RANK_COLORS,
  RANK_NAMES,
  getRankIconUrl,
} from "@/lib/data/config";
import { TACTICAL_PLATE_CLASS } from "@/components/ui/TacticalPlate";
import { WORLD_PATHS } from "./worldMapData";

interface DailyPoint {
  date: string;
  players: number;
  matches: number;
}

interface RankTier {
  tier: number;
  uniquePlayers: number;
  subranks?: Array<{ subrank: number; uniquePlayers: number }>;
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

const PLATE = TACTICAL_PLATE_CLASS;

const REGION_LABELS = PLAYERBASE_REGION_LABELS;
const MAP_REGIONS = PLAYERBASE_MAP_REGIONS;
const tierIconUrl = getRankIconUrl;

function formatAxisTick(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const text = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${text}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function buildNiceTicks(rawMin: number, rawMax: number): {
  minY: number;
  maxY: number;
  ticks: number[];
} {
  const span = Math.max(1000, rawMax - rawMin);
  const roughStep = span / 4;
  const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / pow10;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * pow10;
  const tickMin = Math.max(0, Math.floor((rawMin - span * 0.08) / step) * step);
  const tickMax = Math.ceil((rawMax + span * 0.08) / step) * step;
  const ticks: number[] = [];
  for (let v = tickMin; v <= tickMax + step * 0.001; v += step) {
    ticks.push(Math.round(v));
  }
  return {
    minY: ticks[0] ?? 0,
    maxY: ticks[ticks.length - 1] ?? tickMax,
    ticks,
  };
}

export default function PlayerbaseClient() {
  const router = useRouter();
  const [data, setData] = useState<PlayerbaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<"players" | "matches">("players");
  const [range, setRange] = useState<"7d" | "14d" | "30d" | "90d" | "all">("all");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredDiv, setHoveredDiv] = useState<{
    tier: number;
    subrank: number;
    uniquePlayers: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
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

  const allDaily = data?.daily ?? [];
  const daily =
    range === "7d"
      ? allDaily.slice(-7)
      : range === "14d"
        ? allDaily.slice(-14)
        : range === "30d"
          ? allDaily.slice(-30)
          : range === "90d"
            ? allDaily.slice(-90)
            : allDaily;
  const lastClosed = allDaily.length >= 2 ? allDaily[allDaily.length - 2] : allDaily[allDaily.length - 1] ?? null;
  const peakPlayers = allDaily.reduce((max, d) => (d.players > max ? d.players : max), 0);

  const regionsList = data?.regions ?? [];
  const totalRegions = regionsList.reduce((s, r) => s + r.players, 0) || 1;
  const maxRegionCount = regionsList.reduce((m, r) => (r.players > m ? r.players : m), 1);
  const regionCountMap = new Map(regionsList.map((r) => [r.region, r.players]));

  const orderedTiers = [...(data?.rankedDistribution.tiers ?? [])].sort((a, b) => a.tier - b.tier);
  const maxSubrankPlayers = orderedTiers.reduce((max, t) => {
    const subMax = (t.subranks ?? []).reduce(
      (m, s) => (s.uniquePlayers > m ? s.uniquePlayers : m),
      0,
    );
    return subMax > max ? subMax : max;
  }, 1);

  // Geometria do gráfico vetorial no padrão HeroPatchEvolution
  const accent = metric === "players" ? "#f59e0b" : "#34d399";
  const series = daily.map((d) => (metric === "players" ? d.players : d.matches));
  const rawMin = series.length > 0 ? Math.min(...series) : 0;
  const rawMax = series.length > 0 ? Math.max(...series) : 100;
  const { minY, maxY, ticks: gridTicks } = buildNiceTicks(rawMin, rawMax);
  const rangeY = maxY - minY || 1;
  const avgVal = series.length > 0 ? Math.round(series.reduce((s, v) => s + v, 0) / series.length) : 0;

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
    return { ...d, idx: i, val, label, x, y };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
      : "";

  const avgY = padY + ((maxY - avgVal) / rangeY) * chartH;
  const activePoint =
    points.length > 0
      ? activeIdx !== null && points[activeIdx]
        ? points[activeIdx]
        : points[points.length - 1]
      : null;
  const prevPoint = activePoint && activePoint.idx > 0 ? points[activePoint.idx - 1] : null;
  const deltaPct =
    activePoint && prevPoint && prevPoint.val > 0
      ? ((activePoint.val - prevPoint.val) / prevPoint.val) * 100
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
                    Evolução Diária ({daily.length} {daily.length === 1 ? "dia" : "dias"})
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

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-[4px] border border-white/12 bg-black/55 p-0.5">
                    {(
                      [
                        ["7d", "7D", allDaily.length >= 2],
                        ["14d", "14D", allDaily.length > 7],
                        ["30d", "30D", allDaily.length > 14],
                        ["90d", "90D", allDaily.length > 30],
                        ["all", "Tudo", true],
                      ] as const
                    ).map(([key, label, enabled]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={!enabled}
                        title={enabled ? undefined : "Disponível conforme o histórico acumular mais dias"}
                        onClick={() => {
                          setRange(key);
                          setActiveIdx(null);
                        }}
                        className={`px-2.5 py-1 rounded-[3px] font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors ${
                          !enabled
                            ? "text-neutral-600 cursor-not-allowed"
                            : range === key
                              ? "bg-white/15 text-white cursor-pointer"
                              : "text-neutral-400 hover:text-white cursor-pointer"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
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
                          {formatAxisTick(tickVal)}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={padX}
                    y1={avgY}
                    x2={width - padX}
                    y2={avgY}
                    stroke="rgba(245, 158, 11, 0.35)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={width - padX + 6}
                    y={avgY + 3.5}
                    className="fill-amber-400/80 font-mono text-[9px] font-bold"
                  >
                    Média ({formatAxisTick(avgVal)})
                  </text>

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
                        <line
                          x1={p.x}
                          y1={padY}
                          x2={p.x}
                          y2={height - padY}
                          stroke={isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.06)"}
                          strokeDasharray="2 3"
                        />
                        <rect
                          x={p.x - (stepX > 0 ? stepX / 2 : 24)}
                          y={0}
                          width={stepX > 0 ? stepX : 48}
                          height={height}
                          fill="transparent"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isActive ? 5.5 : 3.8}
                          fill={isActive ? "#ffffff" : accent}
                          stroke="#0a0d0c"
                          strokeWidth="2"
                        />
                        {(points.length <= 16 ||
                          idx === 0 ||
                          idx === points.length - 1 ||
                          idx % Math.ceil(points.length / 10) === 0 ||
                          isActive) && (
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
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {activePoint && (
                <div className={`${PLATE} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                  <div className="space-y-1">
                    <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Dia Selecionado ({activePoint.label})
                    </p>
                    <p className="font-deadlock text-lg font-black text-[#f4efe6]">
                      {activePoint.date.split("-").reverse().join("/")}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {metric === "players" ? (
                        <>
                          Partidas registradas no dia:{" "}
                          <span className="font-mono font-bold text-neutral-200">
                            {activePoint.matches.toLocaleString("pt-BR")}
                          </span>
                        </>
                      ) : (
                        <>
                          Jogadores únicos no dia:{" "}
                          <span className="font-mono font-bold text-neutral-200">
                            {activePoint.players.toLocaleString("pt-BR")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        {metric === "players" ? "Jogadores Únicos" : "Partidas"}
                      </p>
                      <p className="font-mono text-2xl font-black" style={{ color: accent }}>
                        {activePoint.val.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        Vs. Dia Anterior
                      </p>
                      {deltaPct === null ? (
                        <p className="font-mono text-xl font-black text-neutral-400">Base</p>
                      ) : (
                        <p
                          className={`font-mono text-2xl font-black ${
                            deltaPct >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {deltaPct >= 0 ? "+" : ""}
                          {deltaPct.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

                {/* Países neutros (África, Groenlândia, etc.) — contorno só externo */}
                <path
                  d={WORLD_PATHS.neutral}
                  fill="none"
                  stroke="#080b0a"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <path
                  d={WORLD_PATHS.neutral}
                  fill="#151c19"
                  stroke="#151c19"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                />

                {MAP_REGIONS.map((reg) => {
                  const count = regionCountMap.get(reg.id) ?? 0;
                  const ratio = count / maxRegionCount;
                  const pct = ((count / totalRegions) * 100).toFixed(1);
                  const active = hoveredRegion === reg.id;
                  const alpha = active ? Math.min(0.95, 0.22 + ratio * 0.68 + 0.15) : 0.22 + ratio * 0.68;
                  // Cor opaca sobre #080b0a para cobrir totalmente as divisas internas
                  const solidFill = `rgb(${Math.round(8 + 237 * alpha)}, ${Math.round(11 + 147 * alpha)}, ${Math.round(10 + 1 * alpha)})`;
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
                        fill="none"
                        stroke={active ? "#fef3c7" : "#080b0a"}
                        strokeWidth={active ? 2.4 : 2}
                        strokeLinejoin="round"
                        className="transition-all duration-150"
                      />
                      <path
                        d={d}
                        fill={solidFill}
                        stroke={solidFill}
                        strokeWidth={0.7}
                        strokeLinejoin="round"
                        className="transition-all duration-150"
                      />
                      <text
                        x={reg.pinX}
                        y={reg.pinY - 14}
                        textAnchor="middle"
                        paintOrder="stroke"
                        stroke="#080b0a"
                        strokeWidth="4.2"
                        strokeLinejoin="round"
                        className="pointer-events-none font-deadlock uppercase tracking-wider fill-[#f4efe6] text-[17px] font-black"
                      >
                        {reg.label}
                      </text>
                      <text
                        x={reg.pinX}
                        y={reg.pinY + 3}
                        textAnchor="middle"
                        paintOrder="stroke"
                        stroke="#080b0a"
                        strokeWidth="3.8"
                        strokeLinejoin="round"
                        className="pointer-events-none font-deadlock tracking-wide fill-amber-300 text-[14px] font-black"
                      >
                        {pct}%
                      </text>
                      <text
                        x={reg.pinX}
                        y={reg.pinY + 17}
                        textAnchor="middle"
                        paintOrder="stroke"
                        stroke="#080b0a"
                        strokeWidth="3.2"
                        strokeLinejoin="round"
                        className="pointer-events-none fill-neutral-400 font-mono text-[11px] font-semibold tracking-tight"
                      >
                        {count.toLocaleString("pt-BR")}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5">
            <section className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-5 flex flex-col justify-between gap-4">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400">
                Jogadores por Região (Snapshot)
              </h2>
              <div>
                <div className="h-52 flex items-end gap-2.5 pt-8 border-b border-white/10">
                  {regionsList.map((r) => {
                    const pct = ((r.players / totalRegions) * 100).toFixed(1);
                    const barH = Math.max(3, Math.round((r.players / maxRegionCount) * 100));
                    const active = hoveredRegion === r.region;
                    return (
                      <div
                        key={r.region}
                        onMouseEnter={() => setHoveredRegion(r.region)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        title={`${REGION_LABELS[r.region] ?? r.region}: ${r.players.toLocaleString("pt-BR")} (${pct}%)`}
                        className={`flex-1 min-w-0 h-full flex flex-col justify-end items-center rounded-t-[4px] px-1 transition-colors ${
                          active ? "bg-white/5" : ""
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold text-amber-300 leading-none mb-0.5">
                          {pct}%
                        </span>
                        <span className="font-mono text-[9px] text-neutral-400 leading-none mb-1.5 truncate max-w-full">
                          {r.players.toLocaleString("pt-BR")}
                        </span>
                        <div
                          className={`w-full max-w-[40px] rounded-t-[3px] transition-all ${
                            active ? "bg-amber-400" : "bg-amber-500/85"
                          }`}
                          style={{ height: `${barH}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-start gap-2.5 pt-2">
                  {regionsList.map((r) => (
                    <div
                      key={r.region}
                      className="flex-1 min-w-0 text-center text-[10px] font-semibold text-neutral-300 leading-tight"
                    >
                      {REGION_LABELS[r.region] ?? r.region}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-5 flex flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 min-h-[28px]">
                <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400">
                  Distribuição de Patentes (14d)
                </h2>
                {hoveredDiv && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                    <img
                      src={tierIconUrl(hoveredDiv.tier, hoveredDiv.subrank)}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                    <span
                      className="font-semibold"
                      style={{ color: RANK_COLORS[hoveredDiv.tier] ?? "#f4efe6" }}
                    >
                      {RANK_NAMES[hoveredDiv.tier] ?? `Tier ${hoveredDiv.tier}`} {hoveredDiv.subrank}
                    </span>
                    <span className="font-mono font-bold text-[#f4efe6]">
                      {hoveredDiv.uniquePlayers.toLocaleString("pt-BR")}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="h-52 flex items-end gap-1.5 pt-8 border-b border-white/10">
                  {orderedTiers.map((t) => {
                    const subs =
                      t.subranks && t.subranks.length === 6
                        ? t.subranks
                        : [1, 2, 3, 4, 5, 6].map((subrank) => ({
                            subrank,
                            uniquePlayers: Math.round(t.uniquePlayers / 6),
                          }));
                    const name = RANK_NAMES[t.tier] ?? `Tier ${t.tier}`;
                    const rankColor = RANK_COLORS[t.tier] ?? "#34d399";
                    return (
                      <div key={t.tier} className="flex-1 min-w-0 h-full flex items-end gap-[2px]">
                        {subs.map((s) => {
                          const barH = Math.max(
                            3,
                            Math.round((s.uniquePlayers / maxSubrankPlayers) * 100),
                          );
                          const isHover =
                            hoveredDiv?.tier === t.tier && hoveredDiv?.subrank === s.subrank;
                          return (
                            <div
                              key={s.subrank}
                              onMouseEnter={() =>
                                setHoveredDiv({
                                  tier: t.tier,
                                  subrank: s.subrank,
                                  uniquePlayers: s.uniquePlayers,
                                })
                              }
                              onMouseLeave={() => setHoveredDiv(null)}
                              title={`${name} ${s.subrank}: ${s.uniquePlayers.toLocaleString("pt-BR")}`}
                              className="flex-1 min-w-0 h-full flex flex-col justify-end items-center cursor-pointer"
                            >
                              <div
                                className="w-full rounded-t-[2px] transition-all"
                                style={{
                                  height: `${barH}%`,
                                  backgroundColor: rankColor,
                                  opacity: isHover ? 1 : 0.78,
                                  boxShadow: isHover ? `0 0 10px ${rankColor}` : undefined,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  {orderedTiers.map((t) => (
                    <div
                      key={t.tier}
                      title={RANK_NAMES[t.tier] ?? `Tier ${t.tier}`}
                      className="flex-1 min-w-0 flex justify-center"
                    >
                      <img
                        src={tierIconUrl(t.tier)}
                        alt={RANK_NAMES[t.tier] ?? `Tier ${t.tier}`}
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}