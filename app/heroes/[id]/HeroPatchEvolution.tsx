"use client";

import { useState } from "react";
import type { PatchWinRatePoint } from "@/lib/deadlock";

export default function HeroPatchEvolution({
  history,
  accent,
}: {
  history: PatchWinRatePoint[];
  accent: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (history.length < 2) {
    return null;
  }

  const winRates = history.map((h) => h.winRate);
  const rawMin = Math.min(...winRates);
  const rawMax = Math.max(...winRates);
  const pad = Math.max(1, (rawMax - rawMin) * 0.25);
  const minY = Math.floor((rawMin - pad) * 10) / 10;
  const maxY = Math.ceil((rawMax + pad) * 10) / 10;
  const rangeY = maxY - minY || 1;

  const width = 640;
  const height = 200;
  const padX = 45;
  const padY = 25;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = history.map((h, i) => {
    const x = padX + i * (chartW / (history.length - 1));
    const y = padY + ((maxY - h.winRate) / rangeY) * chartH;
    return { ...h, x, y };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  const fiftyY = 50 >= minY && 50 <= maxY ? padY + ((maxY - 50) / rangeY) * chartH : null;
  const active = activeIdx !== null ? points[activeIdx] : points[points.length - 1];

  const firstWR = history[0].winRate;
  const lastWR = history[history.length - 1].winRate;
  const totalChange = Number((lastWR - firstWR).toFixed(2));

  return (
    <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-5 sm:p-6 shadow-2xl backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            Impacto Histórico dos Patches
          </span>
          <p className="text-sm font-semibold text-neutral-200 mt-0.5">
            Evolução do win rate ao longo das últimas atualizações do jogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium">Balanço do período:</span>
          <span
            className={`font-deadlock text-base font-black px-2.5 py-0.5 rounded ${
              totalChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {totalChange > 0 ? `+${totalChange}%` : `${totalChange}%`}
          </span>
        </div>
      </div>

      {/* Gráfico Vetorial SVG Responsivo */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="patchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linha de Referência de 50% Win Rate */}
          {fiftyY !== null && (
            <g>
              <line
                x1={padX}
                y1={fiftyY}
                x2={width - padX}
                y2={fiftyY}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={padX - 8} y={fiftyY + 3.5} fill="#737373" fontSize="10" fontWeight="bold" textAnchor="end">
                50%
              </text>
            </g>
          )}

          {/* Área preenchida */}
          <path d={areaD} fill="url(#patchGrad)" />

          {/* Linha principal de tendência */}
          <path d={pathD} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pontos clicáveis / hover */}
          {points.map((p, i) => {
            const isSelected = activeIdx === i || (activeIdx === null && i === points.length - 1);
            return (
              <g
                key={p.patchId}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "6" : "4"}
                  fill={isSelected ? "#ffffff" : accent}
                  stroke="#0a0d0c"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={height - 6}
                  fill={isSelected ? "#f4efe6" : "#737373"}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.dateLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Destaque do Patch Ativo */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Patch Selecionado
          </span>
          <h4 className="font-deadlock text-base font-black text-[#f4efe6]">{active.label}</h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Amostra coletada: <strong className="text-neutral-200">{active.matches.toLocaleString()} partidas</strong>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Win Rate</span>
            <p
              className={`font-deadlock text-2xl font-black ${
                active.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {active.winRate.toFixed(2)}%
            </p>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Variação vs Anterior
            </span>
            <p className="font-deadlock text-2xl font-black">
              {active.delta === null ? (
                <span className="text-neutral-500 text-lg">Início</span>
              ) : active.delta > 0 ? (
                <span className="text-emerald-400">+{active.delta}%</span>
              ) : active.delta < 0 ? (
                <span className="text-rose-400">{active.delta}%</span>
              ) : (
                <span className="text-neutral-300">0.0%</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Grid com a linha do tempo de todos os patches */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
        {history.map((item, idx) => {
          const isSelected = active.patchId === item.patchId;
          return (
            <button
              key={item.patchId}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`text-left p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/60"
                  : "border-neutral-800/80 bg-black/40 hover:border-neutral-700"
              }`}
            >
              <span className="text-[10px] font-bold text-neutral-400 block">{item.dateLabel}</span>
              <span className="font-deadlock text-sm font-black text-[#f4efe6] block mt-0.5">
                {item.winRate.toFixed(1)}%
              </span>
              <span
                className={`text-[10px] font-extrabold block mt-0.5 ${
                  item.delta === null
                    ? "text-neutral-500"
                    : item.delta > 0
                      ? "text-emerald-400"
                      : item.delta < 0
                        ? "text-rose-400"
                        : "text-neutral-400"
                }`}
              >
                {item.delta === null ? "Base" : item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}