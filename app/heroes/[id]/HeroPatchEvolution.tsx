"use client";

import { useState } from "react";
import type { PatchWinRatePoint } from "@/lib/deadlock";

const PLATE = "rounded-[3px] border border-black/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]";

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

  // Arredonda a escala para números pares de 2 em 2%
  let minY = Math.max(0, Math.floor((rawMin - 1.2) / 2) * 2);
  let maxY = Math.min(100, Math.ceil((rawMax + 1.2) / 2) * 2);

  // Garante amplitude mínima para não achatar o gráfico em variações pequenas
  while (maxY - minY < 6) {
    if (minY > 0) minY -= 2;
    if (maxY < 100) maxY += 2;
  }
  const rangeY = maxY - minY || 1;

  const width = 760;
  const height = 230;
  const padX = 58;
  const padY = 28;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const stepX = chartW / (history.length - 1);

  const points = history.map((h, i) => {
    const x = padX + i * stepX;
    const y = padY + ((maxY - h.winRate) / rangeY) * chartH;
    return { ...h, x, y };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  // Linhas guias horizontais geradas estritamente de 2 em 2%
  const gridTicks: number[] = [];
  for (let val = minY; val <= maxY; val += 2) {
    gridTicks.push(val);
  }

  const fiftyY = 50 >= minY && 50 <= maxY ? padY + ((maxY - 50) / rangeY) * chartH : null;
  const active = activeIdx !== null ? points[activeIdx] : points[points.length - 1];

  return (
    <div
      className="dl-noise dl-halftone relative overflow-hidden rounded-[3px_8px_3px_6px] border-2 p-5 sm:p-6 space-y-5"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 45%, #1b2621)`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 20%, #0c1110), #0c1110 70%)`,
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.65), 0 10px 28px rgba(0,0,0,0.85)",
      }}
    >
      {/* Cabeçalho no padrão das seções de combate */}
      <div className="border-b border-black/30 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="font-deadlock text-base font-black uppercase tracking-wider"
              style={{ color: `color-mix(in srgb, ${accent} 60%, #ffffff)` }}
            >
              Histórico de Desempenho
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[#d6c9b4]/80">
            Variação da taxa de vitória e impacto dos balanceamentos ao longo dos patches
          </p>
        </div>
      </div>

      {/* Gráfico Vetorial em Placa Interna Estilizada */}
      <div className={`relative overflow-hidden ${PLATE} p-3 sm:p-4`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="patchPlateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="85%" stopColor={accent} stopOpacity="0.05" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
            </linearGradient>

            <filter id="patchGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Linhas Guias Horizontais */}
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
                  x={padX - 8}
                  y={yPos + 3.5}
                  fill="#8a9994"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {tickVal}%
                </text>
              </g>
            );
          })}

          {/* Linha Guia de 50% Win Rate */}
          {fiftyY !== null && (
            <g>
              <line
                x1={padX}
                y1={fiftyY}
                x2={width - padX}
                y2={fiftyY}
                stroke="rgba(245, 158, 11, 0.55)"
                strokeDasharray="5 4"
                strokeWidth="1.2"
              />
              <text
                x={width - padX + 8}
                y={fiftyY + 3.5}
                fill="#f59e0b"
                fontSize="9"
                fontWeight="bold"
                textAnchor="start"
              >
                50% (Meta)
              </text>
            </g>
          )}

          {/* Colunas pontilhadas dos patches */}
          {points.map((p) => (
            <line
              key={`drop-${p.patchId}`}
              x1={p.x}
              y1={p.y}
              x2={p.x}
              y2={height - padY}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
          ))}

          {/* Crosshair no patch ativo */}
          <line
            x1={active.x}
            y1={padY - 8}
            x2={active.x}
            y2={height - padY}
            stroke={accent}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeOpacity="0.85"
          />

          {/* Área com gradiente */}
          <path d={areaD} fill="url(#patchPlateGrad)" />

          {/* Linha reta linear */}
          <path
            d={lineD}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#patchGlow)"
          />

          {/* Faixas Verticais Invisíveis de Interação (Captura em qualquer altura da coluna) */}
          {points.map((p, i) => {
            const isFirst = i === 0;
            const isLast = i === points.length - 1;
            const colW = isFirst || isLast ? stepX / 2 + padX : stepX;
            const colX = isFirst ? 0 : p.x - stepX / 2;

            return (
              <rect
                key={`hitbox-${p.patchId}`}
                x={colX}
                y={0}
                width={colW}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i)}
              />
            );
          })}

          {/* Pontos e Rótulos Visuais */}
          {points.map((p, i) => {
            const isSelected = active.patchId === p.patchId;
            return (
              <g
                key={p.patchId}
                className="cursor-pointer pointer-events-none"
              >
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="10"
                    fill={accent}
                    fillOpacity="0.25"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? "6" : "4"}
                  fill={isSelected ? "#ffffff" : accent}
                  stroke="#0c1110"
                  strokeWidth="2.5"
                />
                <text
                  x={p.x}
                  y={height - padY + 16}
                  fill={isSelected ? "#f4efe6" : "#8a9994"}
                  fontSize="10"
                  fontWeight={isSelected ? "900" : "600"}
                  textAnchor="middle"
                >
                  {p.dateLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Painel Tático do Patch Selecionado */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 ${PLATE}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="font-deadlock text-[10px] font-black uppercase tracking-wider"
              style={{ color: accent }}
            >
              Patch Selecionado
            </span>
            <span className="text-[10px] text-[#d6c9b4]/70 font-mono">({active.dateLabel})</span>
          </div>
          <h4 className="font-deadlock text-2xl font-black text-[#f4efe6]">
            {active.label}
          </h4>
          <p className="text-xs text-[#d6c9b4]/80">
            Amostra competitiva auditada:{" "}
            <strong className="text-[#f4efe6]">{active.matches.toLocaleString()} partidas</strong>
          </p>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 pt-2 md:pt-0 border-t md:border-t-0 border-black/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80 block">
              Taxa de Vitória
            </span>
            <p
              className={`font-deadlock text-4xl font-black ${
                active.winRate >= 50 ? "text-[#99f051]" : "text-[#ff5a47]"
              }`}
            >
              {active.winRate.toFixed(2)}%
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80 block">
              Vs. Patch Anterior
            </span>
            <p className="font-deadlock text-4xl font-black">
              {active.delta === null ? (
                <span className="text-neutral-500 text-2xl">Base</span>
              ) : active.delta > 0 ? (
                <span className="text-[#99f051]">+{active.delta}%</span>
              ) : active.delta < 0 ? (
                <span className="text-[#ff5a47]">{active.delta}%</span>
              ) : (
                <span className="text-[#f4efe6]">0.0%</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Botões dos Patches em Placas Militares */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {history.map((item, idx) => {
          const isSelected = active.patchId === item.patchId;
          return (
            <button
              key={item.patchId}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`text-left p-3 transition-all cursor-pointer ${PLATE} ${
                isSelected
                  ? "border-amber-400 bg-black/85 shadow-[0_0_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "hover:border-white/20 hover:bg-black/60"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80 block">
                {item.dateLabel}
              </span>
              <span className="font-deadlock text-lg font-black text-[#f4efe6] block mt-0.5">
                {item.winRate.toFixed(1)}%
              </span>
              <span
                className={`text-[10px] font-black block mt-0.5 ${
                  item.delta === null
                    ? "text-[#d6c9b4]/60"
                    : item.delta > 0
                      ? "text-[#99f051]"
                      : item.delta < 0
                        ? "text-[#ff5a47]"
                        : "text-[#d6c9b4]/80"
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