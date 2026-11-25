"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import type { MetaScoreBreakdownItem, TierMetricId } from "@/lib/data/config";
import { TIER_BY_KEY, type TierKey } from "@/app/tiers";

export interface TierHeroCardData {
  id: number;
  name: string;
  image: string;
  bgImage: string;
  bannerImage: string;
  rgb?: [number, number, number] | null;
  tags?: string[];
  matches: number;
  winRate: number;
  pickRate: number;
  metricValue: number;
  scoreBreakdown: MetaScoreBreakdownItem[];
  tier: TierKey;
}

interface Props {
  hero: TierHeroCardData;
  href: string;
  metricId: TierMetricId;
  metricShortLabel: string;
  customBadge?: { label: string; color: string };
  showCardMetric?: boolean;
}

function tagColors(rgb?: [number, number, number] | null) {
  const bg = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : "#f1d36b";
  const lum = rgb ? 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] : 200;
  return { backgroundColor: bg, color: lum > 150 ? "#1a1608" : "#ffffff" };
}

function badgeTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#070908";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#070908";
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? "#070908" : "#ffffff";
}

const TAG_TILTS = ["-rotate-[3deg]", "rotate-[3deg]", "-rotate-[2deg]"];

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function TierHeroCard({
  hero,
  href,
  metricId,
  metricShortLabel,
  customBadge,
  showCardMetric = true,
}: Props) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const updateTipPosition = () => {
    const cardEl = cardRef.current;
    const tipEl = tipRef.current;
    if (!cardEl || !tipEl) return;

    const cardRect = cardEl.getBoundingClientRect();
    const cardW = cardEl.offsetWidth || cardRect.width;
    const tipW = tipEl.offsetWidth || 384;
    if (!cardW || !tipW) return;

    // Compensa o hover:scale-105 do Link (transform-origin: center) para evitar cortes nas bordas.
    const hoverScale = 1.05;
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const scaledCardLeft = cardCenterX - (cardW * hoverScale) / 2;
    const scaledCardRight = cardCenterX + (cardW * hoverScale) / 2;
    const scaledTipW = tipW * hoverScale;
    const gap = 14;
    const pad = 12;

    const vw = document.documentElement.clientWidth;
    const mainLeft = cardEl.closest("main")?.getBoundingClientRect().left ?? 0;
    const minX = Math.max(pad, mainLeft + pad);
    const maxX = vw - pad;

    const rightSideX = scaledCardRight + gap;
    const leftSideX = scaledCardLeft - gap - scaledTipW;

    let targetX: number;
    if (rightSideX + scaledTipW <= maxX) {
      targetX = rightSideX;
    } else if (leftSideX >= minX) {
      targetX = leftSideX;
    } else {
      const spaceLeft = scaledCardLeft - minX;
      const spaceRight = maxX - scaledCardRight;
      targetX =
        spaceLeft > spaceRight
          ? minX
          : Math.max(minX, maxX - scaledTipW);
    }

    const localLeft = cardW / 2 + (targetX - cardCenterX) / hoverScale;
    tipEl.style.left = `${localLeft}px`;
  };

  return (
    <Link
      ref={cardRef}
      href={href}
      onMouseEnter={updateTipPosition}
      className="group relative flex flex-col items-center bg-neutral-900/40 border border-neutral-800/70 rounded-xl w-[76px] sm:w-[84px] hover:border-amber-500/80 hover:scale-105 hover:z-30 transition-all duration-150 shadow-md cursor-pointer"
      style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
    >
      {/* Imagem do Herói (QUADRADA) */}
      <div className="hero-card-art w-full aspect-square relative flex items-center justify-center overflow-hidden rounded-t-xl">
        {hero.image ? (
          <img
            src={hero.image}
            alt={hero.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          />
        ) : (
          <span className="font-extrabold text-neutral-500 text-sm">
            {hero.name.slice(0, 2).toUpperCase()}
          </span>
        )}

        {/* Tag da Métrica Selecionada */}
        {showCardMetric && hero.matches > 0 && (
          <div
            className={`absolute bottom-0 inset-x-0 bg-[radial-gradient(ellipse_75%_95%_at_50%_100%,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.52)_55%,transparent_100%)] pt-3 pb-0.5 text-center text-[10px] sm:text-[11px] font-black [paint-order:stroke_fill] [-webkit-text-stroke:2px_rgba(0,0,0,0.9)] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_6px_rgba(0,0,0,0.9)] ${
              metricId === "winrate"
                ? hero.winRate >= 50
                  ? "text-emerald-400"
                  : "text-rose-400"
                : metricId === "metascore" && (hero.tier === "D" || hero.tier === "F")
                  ? "text-rose-400"
                  : hero.tier === "META" || hero.tier === "A" || hero.tier === "B"
                    ? metricId === "banrate"
                      ? "text-rose-400"
                      : metricId === "metascore"
                        ? "text-cyan-300"
                        : "text-amber-300"
                    : "text-[#f4efe6]"
            }`}
          >
            {metricId === "metascore"
              ? hero.metricValue.toFixed(1)
              : `${hero.metricValue.toFixed(1)}%`}
          </div>
        )}
      </div>

      {/* Nome do Herói */}
      <div className="hero-card-name w-full overflow-hidden rounded-b-xl px-1.5 py-1.5 text-center transition-all duration-150">
        <p className="truncate text-[11px] font-extrabold leading-tight text-white transition-colors group-hover:text-amber-300 [paint-order:stroke_fill] [-webkit-text-stroke:2px_rgba(0,0,0,0.95)] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_6px_rgba(0,0,0,0.9)]">
          {hero.name}
        </p>
      </div>

      {/* BANNER 16:9 COM A ARTE OFICIAL DE CORPO INTEIRO */}
      <div
        ref={tipRef}
        className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-50 w-80 sm:w-96 max-w-[calc(100vw-24px)]"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden border hero-tip-box shadow-[0_25px_50px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4">
          {hero.bannerImage && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 z-0">
                <i className="hero-tip-puff hero-tip-puff-a" />
                <i className="hero-tip-puff hero-tip-puff-b" />
                <i className="hero-tip-puff hero-tip-puff-c" />
              </div>
              <img
                src={hero.bannerImage}
                alt={hero.name}
                className="absolute right-0 bottom-0 z-[1] h-full w-auto object-contain object-right drop-shadow-[0_0_20px_rgba(0,0,0,0.9)] opacity-90 transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_100%_0%,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.32)_45%,transparent_100%)] z-10" />
            </div>
          )}

          <div className="relative z-20 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {customBadge ? (
                <span
                  style={{
                    backgroundColor: customBadge.color,
                    color: badgeTextColor(customBadge.color),
                  }}
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                >
                  {customBadge.label}
                </span>
              ) : (
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${TIER_BY_KEY[hero.tier].badgeBg} ${TIER_BY_KEY[hero.tier].badgeText} ${
                    hero.tier === "META" ? "tier-meta-glow" : ""
                  }`}
                >
                  Tier {hero.tier}
                </span>
              )}
              <h4 className="font-deadlock text-2xl text-[#f4efe6] tracking-wide leading-none mt-1.5 truncate">
                {hero.name}
              </h4>
              {hero.tags && hero.tags.length > 0 && (
                <div className="mt-2 flex w-fit flex-col items-center gap-1">
                  {[
                    hero.tags.slice(0, Math.ceil(hero.tags.length / 2)),
                    hero.tags.slice(Math.ceil(hero.tags.length / 2)),
                  ].map(
                    (row, rowIndex) =>
                      row.length > 0 && (
                        <div key={rowIndex} className="flex gap-1.5">
                          {row.map((tag, tagIndex) => (
                            <span
                              key={tag}
                              style={tagColors(hero.rgb)}
                              className={`font-deadlock shrink-0 px-2 py-0.5 font-black text-[10px] tracking-wider uppercase shadow -skew-x-6 ${
                                TAG_TILTS[(rowIndex * 2 + tagIndex) % TAG_TILTS.length]
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ),
                  )}
                </div>
              )}
            </div>

            {hero.matches > 0 && (
              <div className="shrink-0 text-right [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)]">
                <span
                  className={`font-deadlock text-xl font-black ${
                    metricId === "winrate"
                      ? hero.winRate >= 50
                        ? "text-emerald-400"
                        : "text-rose-400"
                      : metricId === "metascore" && (hero.tier === "D" || hero.tier === "F")
                        ? "text-rose-400"
                        : hero.tier === "META" || hero.tier === "A" || hero.tier === "B"
                          ? metricId === "banrate"
                            ? "text-rose-400"
                            : metricId === "metascore"
                              ? "text-cyan-300"
                              : "text-amber-300"
                          : "text-neutral-200"
                  }`}
                >
                  {metricId === "metascore"
                    ? hero.metricValue.toFixed(1)
                    : `${hero.metricValue.toFixed(1)}%`}
                </span>
                <p className="text-[9px] text-neutral-200 uppercase tracking-widest font-bold">
                  {metricShortLabel}
                </p>
              </div>
            )}
          </div>

          {hero.matches > 0 && (
            <div className="relative z-20 flex items-center gap-2">
              <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                <span className="font-deadlock text-xs font-black text-[#f4efe6]">
                  {fmt(hero.matches)}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Partidas
                </span>
              </div>
              {metricId === "winrate" ? (
                <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                  <span className="font-deadlock text-xs font-black text-amber-300">
                    {hero.pickRate.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                    Pick
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                  <span
                    className={`font-deadlock text-xs font-black ${
                      hero.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {hero.winRate.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                    Win
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {metricId === "metascore" && hero.scoreBreakdown.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden border hero-tip-box shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
            style={{
              background:
                "linear-gradient(225deg, color-mix(in srgb, rgb(var(--hc)) 14%, #0b0c0c), #0b0c0c 70%)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 z-0 -scale-x-100">
                <i className="hero-tip-puff hero-tip-puff-a" />
                <i className="hero-tip-puff hero-tip-puff-b" />
                <i className="hero-tip-puff hero-tip-puff-c" />
              </div>
              {hero.bgImage && (
                <div className="absolute inset-0 z-[1]">
                  <img
                    src={hero.bgImage}
                    alt=""
                    className="h-full w-full object-cover object-center opacity-60 blur-[1px]"
                    style={{ transform: "scale(-1, -1)" }}
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/25 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
            </div>

            <div className="relative z-20 flex items-center border-b border-white/10 bg-black/45 px-3.5 py-2 backdrop-blur-[2px]">
              <span className="font-deadlock text-[10px] font-black uppercase tracking-wider text-[#f4efe6]">
                Composição do Meta Score
              </span>
            </div>
            <div className="relative z-20 grid grid-cols-3 gap-1.5 p-2.5">
              {hero.scoreBreakdown.map((item) => {
                const fillPct = `${Math.min(100, Math.max(0, item.pct)).toFixed(1)}%`;
                return (
                  <div
                    key={item.key}
                    className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/65 px-2 py-1.5 text-[10px] leading-none"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-neutral-100 font-medium truncate">
                        {item.label}
                      </span>
                      <span
                        className={`font-deadlock font-black tabular-nums shrink-0 ${
                          item.points < 0 ? "text-rose-400" : "text-cyan-300"
                        }`}
                      >
                        {item.points >= 0 ? "+" : ""}
                        {item.points.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        aria-hidden
                        className="h-full rounded-full"
                        style={{
                          width: fillPct,
                          background:
                            item.points < 0
                              ? "linear-gradient(90deg, rgba(244,63,94,0.7), #fb7185)"
                              : "linear-gradient(90deg, color-mix(in srgb, rgb(var(--hc)) 85%, white 15%), color-mix(in srgb, rgb(var(--hc)) 60%, white 40%))",
                          boxShadow:
                            item.points < 0
                              ? "0 0 8px rgba(251,113,133,0.45)"
                              : "0 0 8px rgb(var(--hc) / 0.45)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}