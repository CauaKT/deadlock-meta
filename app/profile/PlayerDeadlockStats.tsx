"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DEADLOCK_DATA_CONFIG, getRankIconUrl } from "@/lib/data/config";

interface HeroOption {
  id: number;
  name: string;
  image: string;
  banner?: string;
  art?: string;
  rgb?: [number, number, number];
}

interface PlayerHeroStat {
  hero_id: number;
  matches_played?: number;
  matches?: number;
  wins?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  networth_per_min?: number;
  damage_per_min?: number;
  obj_damage_per_min?: number;
  damage_mitigated_per_min?: number;
  damage_taken_per_min?: number;
  damage_per_soul?: number;
  last_hits_per_min?: number;
  denies_per_match?: number;
  accuracy?: number;
  crit_shot_rate?: number;
  mvp_rank_counts?: number[];
  mvp_rated_matches?: number;
  time_played?: number;
}

interface MatchHistoryEntry {
  match_id: number;
  hero_id: number;
  match_duration_s: number;
  match_result: number;
  player_team: number;
  player_match_outcome?: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  net_worth: number;
  last_hits?: number;
  denies?: number;
  hero_level?: number;
  game_mode?: number | string;
  match_mode?: number | string;
  start_time: number;
  ranked_display_badge?: number | null;
  ranked_delta?: number | null;
}

interface MateStatEntry {
  mate_id: number;
  matches_played?: number;
  matches?: number;
  wins?: number;
}

interface EnemyStatEntry {
  enemy_id: number;
  matches_played?: number;
  matches?: number;
  wins?: number;
}

interface SteamSummary {
  account_id: number;
  personaname?: string;
  avatar?: string;
}

interface PlayerRankInfo {
  badge?: number | null;
  rank?: number | null;
  subrank?: number | null;
  last_match?: {
    player_rank_final_flat_progress?: number;
    player_rank_desired_progress_change?: number;
  } | null;
}

interface RankAsset {
  tier: number;
  name: string;
  color?: string;
  images?: Record<string, string>;
}

interface PlayerRegionInfo {
  region?: string;
  history?: Array<{
    region?: string;
    datacenter?: string;
    matches?: number;
  }>;
}

interface ItemPropertyMeta {
  value?: string | number;
  disable_value?: string | number;
  label?: string;
  prefix?: string;
  postfix?: string;
  icon?: string;
  tooltip_section?: string;
  tooltip_is_elevated?: boolean;
}

function contrastTextOn(color: string): string {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  let r = 245;
  let g = 158;
  let b = 11;
  if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16);
    g = parseInt(hex[1].slice(2, 4), 16);
    b = parseInt(hex[1].slice(4, 6), 16);
  } else {
    const rgb = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      r = Number(rgb[1]);
      g = Number(rgb[2]);
      b = Number(rgb[3]);
    }
  }
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? "#070908" : "#f4efe6";
}

interface ItemTooltipSectionMeta {
  section_type?: string;
  section_attributes?: Array<{
    properties?: string[];
    elevated_properties?: string[];
    important_properties?: string[];
  }>;
}

interface UpgradeAssetItem {
  id: number;
  name: string;
  class_name: string;
  shop_image?: string;
  image?: string;
  item_slot_type?: string;
  item_tier?: number;
  cost?: number;
  is_active_item?: boolean;
  description?: {
    desc?: string;
    active?: string;
    passive?: string;
  };
  properties?: Record<string, ItemPropertyMeta>;
  tooltip_sections?: ItemTooltipSectionMeta[];
}

function itemSlotBorder(slot?: string): string {
  if (slot === "weapon") return "border-amber-500/60";
  if (slot === "vitality") return "border-emerald-500/60";
  if (slot === "spirit") return "border-purple-500/60";
  return "border-neutral-700";
}

function cleanItemText(raw: string | undefined, props?: Record<string, ItemPropertyMeta>): string {
  if (!raw) return "";
  const replaced = raw.replace(/\{s:([^}]+)\}/g, (_, key: string) =>
    String(props?.[key]?.value ?? ""),
  );
  return replaced.replace(/<[^>]+>/g, "").trim();
}

function BuildItemTooltip({
  item,
  x,
  y,
  above,
}: {
  item: UpgradeAssetItem;
  x: number;
  y: number;
  above: boolean;
}) {
  const slot = item.item_slot_type;
  const color = slot === "weapon" ? "#c97a33" : slot === "vitality" ? "#70a33b" : "#9d6de8";
  const slotLabel = slot === "weapon" ? "Arma" : slot === "vitality" ? "Vitalidade" : "Espírito";
  const cdVal = Number(item.properties?.AbilityCooldown?.value ?? 0);
  const thumb = item.shop_image || item.image;

  const sectionEntries: Array<{ key: string; elevated: boolean }> = [];
  const seenKeys = new Set<string>();
  for (const sec of item.tooltip_sections ?? []) {
    for (const attr of sec.section_attributes ?? []) {
      for (const k of attr.elevated_properties ?? []) {
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          sectionEntries.push({ key: k, elevated: true });
        }
      }
      for (const k of [...(attr.important_properties ?? []), ...(attr.properties ?? [])]) {
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          sectionEntries.push({ key: k, elevated: false });
        }
      }
    }
  }
  if (sectionEntries.length === 0) {
    for (const [k, p] of Object.entries(item.properties ?? {})) {
      if (p?.tooltip_section) {
        sectionEntries.push({ key: k, elevated: Boolean(p.tooltip_is_elevated) });
      }
    }
  }

  const stats = sectionEntries
    .map(({ key, elevated }) => {
      const p = item.properties?.[key];
      const rawVal = p?.value;
      if (!p?.label || rawVal === undefined || rawVal === null || rawVal === "") return null;
      const valStr = String(rawVal);
      const num = Number(valStr);
      const dis = Number(p.disable_value ?? 0);
      if (Number.isFinite(num) ? num === dis || num === 0 : valStr === "0") return null;
      const prefix = (p.prefix ?? "").replace(
        /\{s:sign\}/g,
        Number.isFinite(num) && num >= 0 && !valStr.startsWith("-") ? "+" : "",
      );
      return {
        valueText: `${prefix}${valStr}${p.postfix ?? ""}`,
        label: p.label,
        icon: p.icon,
        elevated,
      };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const descParts = [
    cleanItemText(item.description?.desc, item.properties),
    cleanItemText(item.description?.passive, item.properties),
    cleanItemText(item.description?.active, item.properties),
  ].filter(Boolean);

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[80] w-[300px] overflow-hidden rounded-[4px] border-2 bg-[#14110d] text-left text-[#e9e2d3] shadow-[0_14px_36px_rgba(0,0,0,0.92)]"
      style={{
        left: x,
        top: y,
        borderColor: color,
        transform: above ? "translateY(-100%)" : "none",
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-black/40 px-3 py-2">
        {thumb && <img src={thumb} alt="" className="h-9 w-9 shrink-0 rounded-[3px] object-contain" />}
        <div className="min-w-0 flex-1">
          <p className="font-deadlock text-sm font-black uppercase leading-tight tracking-wide text-[#f4efe6]">
            {item.name}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
            {slotLabel}
            {item.item_tier ? ` • Tier ${item.item_tier}` : ""}
            {item.is_active_item ? ` • Ativo${cdVal > 0 ? ` (${cdVal}s)` : ""}` : ""}
          </p>
        </div>
        {typeof item.cost === "number" && item.cost > 0 && (
          <span className="shrink-0 font-deadlock text-base font-black text-[#6fd3b3]">
            ${item.cost.toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <div className="space-y-2.5 px-3 py-2.5">
        {stats.length > 0 && (
          <ul className="space-y-1">
            {stats.slice(0, 7).map((st, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                {st.icon ? (
                  <img src={st.icon} alt="" className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" />
                )}
                <span
                  className={`font-black ${st.elevated ? "text-sm" : "text-xs"}`}
                  style={{ color }}
                >
                  {st.valueText}
                </span>
                <span className="text-[#e9e2d3]/75">{st.label}</span>
              </li>
            ))}
          </ul>
        )}

        {descParts.length > 0 && (
          <div
            className={`space-y-1 text-[11px] leading-relaxed text-[#b7b1a5] ${
              stats.length > 0 ? "border-t border-white/10 pt-2" : ""
            }`}
          >
            {descParts.map((text, idx) => (
              <p key={idx}>{text}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MatchPlayerSnapshot {
  account_id: number;
  hero_id?: number;
  level?: number;
  team?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  net_worth?: number;
  last_hits?: number;
  mvp_rank?: number;
  items?: Array<{
    item_id: number;
    sold_time_s?: number;
    game_time_s?: number;
  }>;
  stats?: Array<{
    player_damage?: number;
    boss_damage?: number;
    player_healing?: number;
    teammate_healing?: number;
    damage_mitigated?: number;
    player_damage_taken?: number;
    shots_hit?: number;
    shots_missed?: number;
    hero_bullets_hit?: number;
    hero_bullets_hit_crit?: number;
    headshot_kills?: number;
    melee_kills?: number;
    ability_kills?: number;
    bullet_kills?: number;
  }>;
}

interface AnalyticsHeroStatRow {
  hero_id: number;
  matches: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_net_worth: number;
  total_last_hits: number;
  total_player_damage: number;
  total_player_damage_taken: number;
  total_boss_damage: number;
  total_shots_hit: number;
  total_shots_missed: number;
}

interface EloHeroBaseline {
  avgDamage: number;
  avgNetWorth: number;
  avgObjDamage: number;
  avgDamageTaken: number;
  avgLastHits: number;
  avgKda: number;
  avgAccuracy: number;
}

interface PlayerGradeBadge {
  grade: string;
  gradeColor: string;
  placement: number;
}

interface MatchComputedInfo {
  player: MatchPlayerSnapshot;
  allPlayers: MatchPlayerSnapshot[];
  ranksByAccount: Record<number, PlayerGradeBadge>;
  grade: string;
  gradeColor: string;
  placement: number;
  totalPlayers: number;
  score100: number;
  kpPct: number;
  heroDmg: number;
  objDmg: number;
  netWorth: number;
  dmgTaken: number;
  mitigated: number;
  lastHits: number;
  accuracyPct: number | null;
}

function gradeFromPlacement(
  placement: number,
  selfScore: number,
): { grade: string; gradeColor: string } {
  let grade = "C";
  if (placement === 1) grade = selfScore >= 0.8 ? "S+" : "S";
  else if (placement === 2) grade = "S-";
  else if (placement === 3) grade = "A+";
  else if (placement === 4) grade = "A";
  else if (placement === 5) grade = "A-";
  else if (placement === 6) grade = "B+";
  else if (placement === 7) grade = "B";
  else if (placement === 8) grade = "B-";
  else if (placement === 9) grade = "C+";
  else if (placement === 10) grade = "C";
  else if (placement === 11) grade = "D+";
  else grade = "D";

  const gradeColor = grade.startsWith("S")
    ? "#f59e0b"
    : grade.startsWith("A")
      ? "#38bdf8"
      : grade.startsWith("B")
        ? "#34d399"
        : grade.startsWith("C")
          ? "#a3a3a3"
          : "#fb7185";

  return { grade, gradeColor };
}

function computeMatchPerformance(
  players: MatchPlayerSnapshot[],
  accountId: number,
): MatchComputedInfo | null {
  const target = players.find((p) => p.account_id === accountId);
  if (!target) return null;

  const targetSt =
    target.stats && target.stats.length > 0 ? target.stats[target.stats.length - 1] : undefined;
  const teamKills = players
    .filter((p) => p.team === target.team)
    .reduce((sum, p) => sum + (p.kills ?? 0), 0);
  const kpPct =
    teamKills > 0
      ? Math.min(100, (((target.kills ?? 0) + (target.assists ?? 0)) / teamKills) * 100)
      : 0;

  const shotsTotal = (targetSt?.shots_hit ?? 0) + (targetSt?.shots_missed ?? 0);
  const accuracyPct =
    shotsTotal > 0 ? ((targetSt?.shots_hit ?? 0) / shotsTotal) * 100 : null;

  const rows = players.map((p) => {
    const st = p.stats && p.stats.length > 0 ? p.stats[p.stats.length - 1] : undefined;
    const k = p.kills ?? 0;
    const d = p.deaths ?? 0;
    const a = p.assists ?? 0;
    return {
      account_id: p.account_id,
      mvp_rank: p.mvp_rank ?? 0,
      kda: (k + a * 0.7) / Math.max(1, d),
      dmg: st?.player_damage ?? 0,
      nw: p.net_worth ?? 0,
      obj: st?.boss_damage ?? 0,
      heal: (st?.player_healing ?? 0) + (st?.teammate_healing ?? 0),
    };
  });

  const maxKda = Math.max(1, ...rows.map((r) => r.kda));
  const maxDmg = Math.max(1, ...rows.map((r) => r.dmg));
  const maxNw = Math.max(1, ...rows.map((r) => r.nw));
  const maxObj = Math.max(1, ...rows.map((r) => r.obj));
  const maxHeal = Math.max(1, ...rows.map((r) => r.heal));

  const scored = rows
    .map((r) => {
      const baseScore =
        (r.kda / maxKda) * 0.34 +
        (r.dmg / maxDmg) * 0.26 +
        (r.nw / maxNw) * 0.2 +
        (r.obj / maxObj) * 0.12 +
        (r.heal / maxHeal) * 0.08;
      const mvpBonus =
        r.mvp_rank === 1 ? 0.35 : r.mvp_rank === 2 ? 0.25 : r.mvp_rank === 3 ? 0.15 : 0;
      return { account_id: r.account_id, baseScore, totalScore: baseScore + mvpBonus };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  const ranksByAccount: Record<number, PlayerGradeBadge> = {};
  scored.forEach((s, i) => {
    const pos = i + 1;
    const { grade, gradeColor } = gradeFromPlacement(pos, s.baseScore);
    ranksByAccount[s.account_id] = { grade, gradeColor, placement: pos };
  });

  const idx = scored.findIndex((s) => s.account_id === accountId);
  const placement = idx >= 0 ? idx + 1 : scored.length;
  const totalPlayers = scored.length;
  const selfScore = idx >= 0 ? scored[idx].baseScore : 0;
  const score100 = Math.min(100, Math.max(10, selfScore * 100));
  const { grade, gradeColor } = gradeFromPlacement(placement, selfScore);

  return {
    player: target,
    allPlayers: players,
    ranksByAccount,
    grade,
    gradeColor,
    placement,
    totalPlayers,
    score100,
    kpPct,
    heroDmg: targetSt?.player_damage ?? 0,
    objDmg: targetSt?.boss_damage ?? 0,
    netWorth: target.net_worth ?? 0,
    dmgTaken: targetSt?.player_damage_taken ?? 0,
    mitigated: targetSt?.damage_mitigated ?? 0,
    lastHits: target.last_hits ?? 0,
    accuracyPct,
  };
}

function eloScoreBar(value: number, eloAvg: number | undefined): number {
  if (!eloAvg || eloAvg <= 0) return 50;
  return Math.min(100, Math.max(5, Math.round((value / eloAvg) * 50)));
}

type ModeFilter = "all" | "standard" | "ranked" | "brawl";
type ResultFilter = "all" | "win" | "loss";

const STEAM64_BASE = BigInt("76561197960265728");

let upgradeItemsPromise: Promise<Map<number, UpgradeAssetItem>> | null = null;
function loadUpgradeItemsMap(): Promise<Map<number, UpgradeAssetItem>> {
  if (!upgradeItemsPromise) {
    upgradeItemsPromise = fetch(
      `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/assets/items/by-type/upgrade?language=${DEADLOCK_DATA_CONFIG.language}`,
      { cache: "force-cache" },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: unknown) => {
        const map = new Map<number, UpgradeAssetItem>();
        if (Array.isArray(arr)) {
          for (const it of arr as UpgradeAssetItem[]) {
            if (typeof it?.id === "number") map.set(it.id, it);
          }
        }
        return map;
      })
      .catch(() => new Map<number, UpgradeAssetItem>());
  }
  return upgradeItemsPromise;
}

function toAccountId(raw: string): string | null {
  const clean = raw.trim();
  if (!/^\d{3,20}$/.test(clean)) return null;
  try {
    const val = BigInt(clean);
    if (val > STEAM64_BASE) return (val - STEAM64_BASE).toString();
    return val > BigInt(0) ? val.toString() : null;
  } catch {
    return null;
  }
}

function isMatchWon(m: MatchHistoryEntry): boolean {
  return typeof m.player_match_outcome === "number"
    ? m.player_match_outcome === 1
    : m.match_result === m.player_team;
}

function resolveModeKey(m: MatchHistoryEntry): Exclude<ModeFilter, "all"> {
  if (typeof m.game_mode === "number" || typeof m.match_mode === "number") {
    if (m.game_mode === 4) return "brawl";
    if (m.game_mode === 1 && m.match_mode === 4) return "ranked";
    return "standard";
  }
  const raw = `${m.match_mode ?? ""} ${m.game_mode ?? ""}`.toLowerCase();
  if (raw.includes("brawl")) return "brawl";
  if (raw.includes("ranked")) return "ranked";
  return "standard";
}

function formatModeLabel(m: MatchHistoryEntry): string {
  const key = resolveModeKey(m);
  if (key === "brawl") return "Street Brawl";
  if (key === "ranked") return "Ranked";
  return "Standard";
}

function formatRelativeTime(unixSec: number): string {
  const diffS = Math.max(0, Math.floor(Date.now() / 1000) - unixSec);
  if (diffS < 3600) return `${Math.max(1, Math.floor(diffS / 60))}m atrás`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h atrás`;
  const days = Math.floor(diffS / 86400);
  if (days < 30) return `${days}d atrás`;
  return new Date(unixSec * 1000).toLocaleDateString("pt-BR");
}

function formatRegionLabel(region?: string): string {
  if (!region) return "Global";
  const map: Record<string, string> = {
    south_america: "América do Sul",
    north_america: "América do Norte",
    europe: "Europa",
    asia: "Ásia",
    oceania: "Oceania",
  };
  return map[region] ?? region.replace(/_/g, " ");
}

function romanSubrank(sub?: number | null): string {
  const romans = ["", "I", "II", "III", "IV", "V", "VI"];
  if (!sub || sub < 1 || sub > 6) return "";
  return romans[sub];
}

function resolveRankBadge(
  badge: number | null | undefined,
  ranksMap: Map<number, RankAsset>,
): { label: string; icon: string | null; color: string } | null {
  if (typeof badge !== "number" || badge < 0) return null;
  const tier = Math.floor(badge / 10);
  const sub = badge % 10;
  const asset = ranksMap.get(tier);
  const name = asset?.name ?? `Patente ${tier}`;
  const color = asset?.color ?? "#f59e0b";
  const icon =
    tier > 0 && sub >= 1 && sub <= 6
      ? asset?.images?.[`small_subrank${sub}_webp`] || getRankIconUrl(tier, sub)
      : asset?.images?.small_webp || asset?.images?.large_webp || null;
  return {
    label: tier > 0 && sub >= 1 && sub <= 6 ? `${name} ${romanSubrank(sub)}` : name,
    icon,
    color,
  };
}

function HitSilhouetteCard({
  accuracy,
  headshotRate,
  damagePerSoul,
  damageMitigatedPerMin,
  heroColor,
}: {
  accuracy: number | null;
  headshotRate: number | null;
  damagePerSoul: number | null;
  damageMitigatedPerMin: number | null;
  heroColor: string;
}) {
  const critPct = headshotRate !== null ? Math.min(100, Math.max(0, headshotRate)) : null;
  const bodyPct = critPct !== null ? Math.max(0, 100 - critPct) : null;

  return (
    <section
      className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-3.5 shadow-xl"
      style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          className="border-l-2 pl-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300"
          style={{ borderColor: heroColor }}
        >
          Precisão & Zonas de Acerto
        </h3>
        <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] font-black text-sky-400">
          {accuracy !== null ? `${accuracy.toFixed(1)}% Precisão` : "—"}
        </span>
      </div>

      <div className="flex items-center gap-4 rounded-[5px] border border-neutral-800/80 bg-[#070908] p-3.5">
        {/* Bonequinho SVG adaptado ao sistema de dano do Deadlock (Crítico/Cabeça vs Corpo Normal) */}
        <div className="relative flex h-36 w-20 shrink-0 items-center justify-center">
          <svg viewBox="0 0 100 180" className="h-full w-full" aria-label="Silhueta de zonas de acerto no Deadlock">
            <defs>
              <radialGradient id="head-crit-glow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.45" />
              </radialGradient>
              <linearGradient id="body-normal-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Zona 1: Cabeça (Crítico / Headshot) */}
            <circle
              cx="50"
              cy="22"
              r="14"
              fill={critPct !== null ? "url(#head-crit-glow)" : "#262626"}
              stroke="#fb7185"
              strokeWidth="2"
            />

            {/* Zona 2: Corpo & Membros unificados (Acerto Normal) */}
            <path
              d="M32 42 C25 42 20 47 18 55 L11 94 C10 98 13 102 17 102 C21 102 23 99 24 94 L29 64 L31 104 L25 164 C24 169 28 173 33 173 C38 173 41 169 42 164 L48 114 L52 114 L58 164 C59 169 62 173 67 173 C72 173 76 169 75 164 L69 104 L71 64 L76 94 C77 99 79 102 83 102 C87 102 90 98 89 94 L82 55 C80 47 75 42 68 42 Z"
              fill={bodyPct !== null ? "url(#body-normal-fill)" : "#1f2937"}
              stroke="#38bdf8"
              strokeOpacity="0.7"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Quebra percentual das duas zonas reais */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-bold text-rose-300">Cabeça (Crítico)</span>
              <span className="font-mono font-black text-rose-400">
                {critPct !== null ? `${critPct.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-900">
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{ width: `${critPct ?? 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-bold text-sky-300">Corpo (Normal)</span>
              <span className="font-mono font-black text-sky-400">
                {bodyPct !== null ? `${bodyPct.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-900">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${bodyPct ?? 0}%` }}
              />
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-neutral-500">
            No Deadlock, a API separa acertos críticos na cabeça de acertos normais no corpo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Dano / Alma</p>
          <p className="font-mono font-black text-[#f4efe6]">
            {damagePerSoul !== null ? damagePerSoul.toFixed(2) : "—"}
          </p>
        </div>
        <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Mitigado / min</p>
          <p className="font-mono font-black text-emerald-400">
            {damageMitigatedPerMin !== null
              ? Math.round(damageMitigatedPerMin).toLocaleString("pt-BR")
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

function SoulsSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 180;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-36 shrink-0" aria-hidden>
      <polygon points={area} fill="rgba(92,225,182,0.14)" />
      <polyline
        points={line}
        fill="none"
        stroke="#5ce1b6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PlayerDeadlockStats({
  steamId,
  heroes,
  heroColor,
  accountSidebar,
}: {
  steamId: string;
  heroes: HeroOption[];
  heroColor: string;
  accountSidebar?: ReactNode;
}) {
  const accountId = useMemo(() => toAccountId(steamId), [steamId]);
  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const statsCacheRef = useRef<Record<string, PlayerHeroStat[]>>({});
  const matchDetailsCacheRef = useRef<Record<number, MatchComputedInfo | null>>({});
  const fetchingMatchIdsRef = useRef<Set<number>>(new Set());
  const itemsMapRef = useRef<Map<number, UpgradeAssetItem>>(new Map());
  const activeAccountRef = useRef<string | null>(null);

  const [stats, setStats] = useState<PlayerHeroStat[] | null>(null);
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [mates, setMates] = useState<MateStatEntry[]>([]);
  const [enemies, setEnemies] = useState<EnemyStatEntry[]>([]);
  const [steamNames, setSteamNames] = useState<Record<number, SteamSummary>>({});
  const [rankInfo, setRankInfo] = useState<PlayerRankInfo | null>(null);
  const [regionInfo, setRegionInfo] = useState<PlayerRegionInfo | null>(null);
  const [ranksMap, setRanksMap] = useState<Map<number, RankAsset>>(new Map());
  const [eloBaselines, setEloBaselines] = useState<Map<number, EloHeroBaseline>>(new Map());

  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [heroFilter, setHeroFilter] = useState<number | "all">("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = new URLSearchParams(window.location.search).get("heroId");
        const id = raw ? Number(raw) : NaN;
        if (Number.isInteger(id) && id > 0) {
          setHeroFilter(id);
        }
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [visibleMatchesCount, setVisibleMatchesCount] = useState(12);
  const [showAllHeroes, setShowAllHeroes] = useState(false);

  const [matchDetailsMap, setMatchDetailsMap] = useState<Record<number, MatchComputedInfo | null>>({});
  const [itemsMap, setItemsMap] = useState<Map<number, UpgradeAssetItem>>(new Map());
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [hoveredItemTip, setHoveredItemTip] = useState<{
    item: UpgradeAssetItem;
    x: number;
    y: number;
    above: boolean;
  } | null>(null);

  const toggleMatchExpand = (matchId: number, detailInfo?: MatchComputedInfo | null) => {
    setExpandedMatchId((prev) => {
      const next = prev === matchId ? null : matchId;
      if (next !== null && detailInfo?.allPlayers?.length) {
        const missingIds = detailInfo.allPlayers
          .map((p) => p.account_id)
          .filter((id) => Number.isFinite(id) && !(id in steamNames));
        if (missingIds.length > 0) {
          fetch(
            `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/steam?account_ids=${missingIds.join(",")}`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : []))
            .then((profiles: unknown) => {
              if (!Array.isArray(profiles)) return;
              setSteamNames((cur) => {
                const updated = { ...cur };
                for (const p of profiles as SteamSummary[]) {
                  if (p.account_id) updated[p.account_id] = p;
                }
                return updated;
              });
            })
            .catch(() => {});
        }
      }
      return next;
    });
  };

  const showItemTip = (item: UpgradeAssetItem, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const above = rect.top > 240;
    const x = Math.min(Math.max(8, rect.left + rect.width / 2 - 140), window.innerWidth - 288);
    const y = above ? rect.top - 8 : rect.bottom + 8;
    setHoveredItemTip({ item, x, y, above });
  };

  const [baseLoading, setBaseLoading] = useState(() => Boolean(accountId));
  const [statsLoading, setStatsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prevAccountId, setPrevAccountId] = useState(accountId);

  if (accountId !== prevAccountId) {
    setPrevAccountId(accountId);
    setMatchDetailsMap({});
    if (!accountId) {
      setStats(null);
      setMatches([]);
      setMates([]);
      setEnemies([]);
      setSteamNames({});
      setRankInfo(null);
      setRegionInfo(null);
      setBaseLoading(false);
      setFailed(false);
    } else {
      setBaseLoading(true);
      setFailed(false);
    }
  }

  // Dados gerais da conta (histórico, patente, região, aliados, inimigos)
  useEffect(() => {
    activeAccountRef.current = accountId;
    statsCacheRef.current = {};
    matchDetailsCacheRef.current = {};
    fetchingMatchIdsRef.current.clear();

    if (!accountId) return;

    let cancelled = false;

    Promise.all([
      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/match-history`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/mate-stats`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/enemy-stats`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/rank`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/region`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(
        `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/assets/ranks?language=${DEADLOCK_DATA_CONFIG.language}`,
        { cache: "force-cache" },
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([matchData, mateData, enemyData, rkData, rgData, ranksArr]) => {
      if (cancelled) return;
      const matchList = Array.isArray(matchData) ? (matchData as MatchHistoryEntry[]) : [];
      const mateList = Array.isArray(mateData) ? (mateData as MateStatEntry[]) : [];
      const enemyList = Array.isArray(enemyData) ? (enemyData as EnemyStatEntry[]) : [];

      setMatches(matchList);
      setMates(mateList);
      setEnemies(enemyList);
      setRankInfo(rkData && typeof rkData === "object" ? (rkData as PlayerRankInfo) : null);
      setRegionInfo(rgData && typeof rgData === "object" ? (rgData as PlayerRegionInfo) : null);

      if (Array.isArray(ranksArr)) {
        const rm = new Map<number, RankAsset>();
        for (const r of ranksArr as RankAsset[]) {
          if (typeof r?.tier === "number") rm.set(r.tier, r);
        }
        setRanksMap(rm);
      }

      const rankTier =
        rkData && typeof rkData === "object" && typeof (rkData as PlayerRankInfo).rank === "number"
          ? ((rkData as PlayerRankInfo).rank as number)
          : null;
      const eloQuery =
        rankTier && rankTier > 0
          ? `?min_average_badge=${rankTier * 10}&max_average_badge=${rankTier * 10 + 9}`
          : "";

      fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/analytics/hero-stats${eloQuery}`, {
        cache: "force-cache",
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: unknown) => {
          if (cancelled || !Array.isArray(rows)) return;
          const map = new Map<number, EloHeroBaseline>();
          for (const row of rows as AnalyticsHeroStatRow[]) {
            const m = Math.max(1, row.matches || 0);
            const shots = (row.total_shots_hit || 0) + (row.total_shots_missed || 0);
            map.set(row.hero_id, {
              avgDamage: (row.total_player_damage || 0) / m,
              avgNetWorth: (row.total_net_worth || 0) / m,
              avgObjDamage: (row.total_boss_damage || 0) / m,
              avgDamageTaken: (row.total_player_damage_taken || 0) / m,
              avgLastHits: (row.total_last_hits || 0) / m,
              avgKda: ((row.total_kills || 0) + (row.total_assists || 0)) / Math.max(1, row.total_deaths || 0),
              avgAccuracy: shots > 0 ? ((row.total_shots_hit || 0) / shots) * 100 : 45,
            });
          }
          setEloBaselines(map);
        })
        .catch(() => {});

      setBaseLoading(false);

      const mateIds = [...mateList]
        .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0))
        .slice(0, 6)
        .map((m) => m.mate_id);

      const enemyIds = [...enemyList]
        .filter((e) => (e.matches_played ?? e.matches ?? 0) >= 2)
        .sort((a, b) => {
          const ma = a.matches_played ?? a.matches ?? 1;
          const mb = b.matches_played ?? b.matches ?? 1;
          const wra = (a.wins ?? 0) / ma;
          const wrb = (b.wins ?? 0) / mb;
          return wra - wrb || mb - ma;
        })
        .slice(0, 6)
        .map((e) => e.enemy_id);

      const allSteamIds = Array.from(new Set([...mateIds, ...enemyIds])).filter((id) =>
        Number.isFinite(id),
      );

      if (allSteamIds.length > 0) {
        fetch(
          `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/steam?account_ids=${allSteamIds.join(",")}`,
          { cache: "no-store" },
        )
          .then((r) => (r.ok ? r.json() : []))
          .then((profiles: unknown) => {
            if (cancelled || !Array.isArray(profiles)) return;
            const map: Record<number, SteamSummary> = {};
            for (const p of profiles as SteamSummary[]) {
              if (p.account_id) map[p.account_id] = p;
            }
            setSteamNames(map);
          })
          .catch(() => {});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Estatísticas por herói filtradas pelo modo selecionado
  useEffect(() => {
    if (!accountId) return;

    const cached = statsCacheRef.current[modeFilter];
    if (cached) {
      setStats(cached);
      setStatsLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);
    setFailed(false);

    const url =
      modeFilter === "all"
        ? `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/${accountId}/hero-stats`
        : modeFilter === "ranked"
          ? `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/hero-stats?account_ids=${accountId}&game_mode=1&match_mode=4`
          : modeFilter === "brawl"
            ? `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/hero-stats?account_ids=${accountId}&game_mode=4&match_mode=1`
            : `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/players/hero-stats?account_ids=${accountId}&game_mode=1&match_mode=1`;

    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((heroData: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(heroData) ? (heroData as PlayerHeroStat[]) : [];
        statsCacheRef.current[modeFilter] = list;
        setStats(list);
        setStatsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (modeFilter !== "all") {
          setStats([]);
        } else {
          setFailed(true);
        }
        setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, modeFilter]);

  const modeCounts = useMemo(() => {
    const counts = { all: matches.length, standard: 0, ranked: 0, brawl: 0 };
    for (const m of matches) {
      counts[resolveModeKey(m)] += 1;
    }
    return counts;
  }, [matches]);

  const modeMatches = useMemo(() => {
    if (modeFilter === "all") return matches;
    return matches.filter((m) => resolveModeKey(m) === modeFilter);
  }, [matches, modeFilter]);

  const playedHeroIdsInMode = useMemo(() => {
    const ids = new Set<number>();
    for (const m of modeMatches) ids.add(m.hero_id);
    return Array.from(ids).sort((a, b) =>
      (heroesById.get(a)?.name ?? "").localeCompare(heroesById.get(b)?.name ?? "", "pt-BR"),
    );
  }, [modeMatches, heroesById]);

const filteredMatches = useMemo(() => {
    return modeMatches.filter((m) => {
      if (heroFilter !== "all" && m.hero_id !== heroFilter) return false;
      if (resultFilter === "win" && !isMatchWon(m)) return false;
      if (resultFilter === "loss" && isMatchWon(m)) return false;
      return true;
    });
  }, [modeMatches, heroFilter, resultFilter]);

  const visibleMatches = useMemo(
    () => filteredMatches.slice(0, visibleMatchesCount),
    [filteredMatches, visibleMatchesCount],
  );

  // Carrega em lote os itens (build final) das partidas visíveis no histórico sem abortar por troca de estado de itemsMap
  useEffect(() => {
    if (!accountId || visibleMatches.length === 0) return;

    const pendingIds = visibleMatches
      .map((m) => m.match_id)
      .filter((id) => !(id in matchDetailsCacheRef.current));

    if (pendingIds.length === 0 && itemsMapRef.current.size > 0) return;

    let cancelled = false;
    const numericId = Number(accountId);

    const run = async () => {
      if (itemsMapRef.current.size === 0) {
        const loadedItems = await loadUpgradeItemsMap();
        if (cancelled) return;
        if (loadedItems.size > 0) {
          itemsMapRef.current = loadedItems;
          setItemsMap(loadedItems);
        }
      }

      const toFetch = pendingIds.filter((id) => !fetchingMatchIdsRef.current.has(id));
      for (let i = 0; i < toFetch.length; i += 3) {
        if (cancelled) break;
        const chunk = toFetch.slice(i, i + 3);
        chunk.forEach((id) => fetchingMatchIdsRef.current.add(id));

        const results = await Promise.all(
          chunk.map(async (matchId) => {
            try {
              const res = await fetch(
                `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/matches/${matchId}/metadata`,
                {
                cache: "force-cache",
              });
              if (!res.ok) return { matchId, snap: null };
              const meta = await res.json();
              const players = meta?.match_info?.players;
              const computed = Array.isArray(players)
                ? computeMatchPerformance(players as MatchPlayerSnapshot[], numericId)
                : null;
              return { matchId, snap: computed };
            } catch {
              return { matchId, snap: null };
            } finally {
              fetchingMatchIdsRef.current.delete(matchId);
            }
          }),
        );

        if (activeAccountRef.current !== accountId) break;
        setMatchDetailsMap((prev) => {
          const next = { ...prev };
          for (const { matchId, snap } of results) {
            matchDetailsCacheRef.current[matchId] = snap;
            next[matchId] = snap;
          }
          return next;
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [accountId, visibleMatches]);

  const streaks = useMemo(() => {
    if (modeMatches.length === 0) return { current: 0, currentIsWin: true, longestWin: 0 };
    const firstWon = isMatchWon(modeMatches[0]);
    let current = 0;
    for (const m of modeMatches) {
      if (isMatchWon(m) === firstWon) current += 1;
      else break;
    }

    let longestWin = 0;
    let run = 0;
    for (const m of modeMatches) {
      if (isMatchWon(m)) {
        run += 1;
        if (run > longestWin) longestWin = run;
      } else {
        run = 0;
      }
    }
    return { current, currentIsWin: firstWon, longestWin };
  }, [modeMatches]);

  const last20Summary = useMemo(() => {
    const slice = modeMatches.slice(0, 20);
    if (slice.length === 0) return null;
    const wins = slice.filter(isMatchWon).length;
    const kills = slice.reduce((sum, m) => sum + m.player_kills, 0);
    const deaths = slice.reduce((sum, m) => sum + m.player_deaths, 0);
    const assists = slice.reduce((sum, m) => sum + m.player_assists, 0);
    const avgSouls = slice.reduce((sum, m) => sum + m.net_worth, 0) / slice.length;
    const spmSeries = [...slice]
      .reverse()
      .map((m) => m.net_worth / Math.max(1, m.match_duration_s / 60));
    const avgSpm = spmSeries.reduce((s, v) => s + v, 0) / spmSeries.length;
    return {
      items: slice,
      wins,
      losses: slice.length - wins,
      winRate: (wins / slice.length) * 100,
      avgKda: (kills + assists) / Math.max(1, deaths),
      avgSouls,
      avgSpm,
      spmSeries,
    };
  }, [modeMatches]);

  // Heatmap das últimas 12 semanas (84 dias)
  const activityGrid = useMemo(() => {
    const daysCount = 84;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const countsByDay = new Map<string, number>();

    for (const m of matches) {
      if (!m.start_time) continue;
      const d = new Date(m.start_time * 1000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const weeks: Array<Array<{ date: string; count: number }>> = [];
    for (let w = 11; w >= 0; w--) {
      const col: Array<{ date: string; count: number }> = [];
      for (let d = 6; d >= 0; d--) {
        const offset = w * 7 + d;
        const dt = new Date(today);
        dt.setDate(today.getDate() - offset);
        const key = dt.toISOString().slice(0, 10);
        col.push({ date: key, count: countsByDay.get(key) ?? 0 });
      }
      weeks.push(col);
    }
    return {
      weeks,
      total84Days: matches.filter((m) => m.start_time * 1000 >= today.getTime() - daysCount * 86400000)
        .length,
    };
  }, [matches]);

  const summary = useMemo(() => {
    const sourceRows =
      stats && stats.length > 0
        ? stats
        : modeFilter !== "all" && modeMatches.length > 0
          ? // Fallback a partir do histórico se o endpoint filtrado de hero-stats não retornar linhas
            Array.from(
              modeMatches.reduce((acc, m) => {
                const cur = acc.get(m.hero_id) ?? {
                  hero_id: m.hero_id,
                  matches_played: 0,
                  wins: 0,
                  kills: 0,
                  deaths: 0,
                  assists: 0,
                  networth_per_min: 0,
                  last_hits_per_min: 0,
                  denies_per_match: 0,
                };
                const mins = Math.max(1, m.match_duration_s / 60);
                const prevN = cur.matches_played ?? 0;
                const nextN = prevN + 1;
                cur.matches_played = nextN;
                cur.wins = (cur.wins ?? 0) + (isMatchWon(m) ? 1 : 0);
                cur.kills = (cur.kills ?? 0) + m.player_kills;
                cur.deaths = (cur.deaths ?? 0) + m.player_deaths;
                cur.assists = (cur.assists ?? 0) + m.player_assists;
                cur.networth_per_min = ((cur.networth_per_min ?? 0) * prevN + m.net_worth / mins) / nextN;
                cur.last_hits_per_min =
                  ((cur.last_hits_per_min ?? 0) * prevN + (m.last_hits ?? 0) / mins) / nextN;
                cur.denies_per_match =
                  ((cur.denies_per_match ?? 0) * prevN + (m.denies ?? 0)) / nextN;
                acc.set(m.hero_id, cur);
                return acc;
              }, new Map<number, PlayerHeroStat>()).values(),
            )
          : [];

    if (sourceRows.length === 0) return null;

    let totalMatches = 0;
    let totalWins = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let weightedSouls = 0;
    let weightedDamage = 0;
    let dmgWeight = 0;
    let weightedObjDmg = 0;
    let objWeight = 0;
    let weightedMitigated = 0;
    let mitWeight = 0;
    let weightedDmgPerSoul = 0;
    let dpsWeight = 0;
    let weightedLastHits = 0;
    let weightedDenies = 0;
    let weightedAcc = 0;
    let accWeight = 0;
    let weightedHs = 0;
    let hsWeight = 0;
    let totalMvpTop3 = 0;
    let totalMvp1 = 0;
    let totalMvpRated = 0;

    for (const row of sourceRows) {
      const m = row.matches_played ?? row.matches ?? 0;
      if (m <= 0) continue;
      totalMatches += m;
      totalWins += row.wins ?? 0;
      totalKills += row.kills ?? 0;
      totalDeaths += row.deaths ?? 0;
      totalAssists += row.assists ?? 0;
      if (typeof row.networth_per_min === "number") weightedSouls += row.networth_per_min * m;
      if (typeof row.damage_per_min === "number") {
        weightedDamage += row.damage_per_min * m;
        dmgWeight += m;
      }
      if (typeof row.obj_damage_per_min === "number") {
        weightedObjDmg += row.obj_damage_per_min * m;
        objWeight += m;
      }
      if (typeof row.damage_mitigated_per_min === "number") {
        weightedMitigated += row.damage_mitigated_per_min * m;
        mitWeight += m;
      }
      if (typeof row.damage_per_soul === "number") {
        weightedDmgPerSoul += row.damage_per_soul * m;
        dpsWeight += m;
      }
      if (typeof row.last_hits_per_min === "number") weightedLastHits += row.last_hits_per_min * m;
      if (typeof row.denies_per_match === "number") weightedDenies += row.denies_per_match * m;
      if (typeof row.accuracy === "number" && row.accuracy > 0) {
        weightedAcc += row.accuracy * m;
        accWeight += m;
      }
      if (typeof row.crit_shot_rate === "number" && row.crit_shot_rate > 0) {
        weightedHs += row.crit_shot_rate * m;
        hsWeight += m;
      }
      if (typeof row.mvp_rated_matches === "number" && row.mvp_rated_matches > 0) {
        totalMvpRated += row.mvp_rated_matches;
        const c = row.mvp_rank_counts ?? [];
        totalMvp1 += c[0] ?? 0;
        totalMvpTop3 += (c[0] ?? 0) + (c[1] ?? 0) + (c[2] ?? 0);
      }
    }

    if (totalMatches === 0) return null;

    const winRate = (totalWins / totalMatches) * 100;
    const kda = (totalKills + totalAssists) / Math.max(1, totalDeaths);
    const soulsPerMin = weightedSouls / totalMatches;
    const damagePerMin = dmgWeight > 0 ? weightedDamage / dmgWeight : null;
    const objDamagePerMin = objWeight > 0 ? weightedObjDmg / objWeight : null;
    const damageMitigatedPerMin = mitWeight > 0 ? weightedMitigated / mitWeight : null;
    const damagePerSoul = dpsWeight > 0 ? weightedDmgPerSoul / dpsWeight : null;
    const lastHitsPerMin = weightedLastHits / totalMatches;
    const deniesPerMatch = weightedDenies / totalMatches;
    const accuracy = accWeight > 0 ? (weightedAcc / accWeight) * 100 : null;
    const headshotRate = hsWeight > 0 ? (weightedHs / hsWeight) * 100 : null;
    const mvpTop3Rate = totalMvpRated > 0 ? (totalMvpTop3 / totalMvpRated) * 100 : null;
    const mvp1Rate = totalMvpRated > 0 ? (totalMvp1 / totalMvpRated) * 100 : null;

    const allHeroesSorted = [...sourceRows]
      .filter((r) => (r.matches_played ?? r.matches ?? 0) > 0)
      .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0));

    const badges: Array<{ label: string; tone: string }> = [];
    const mainHeroRow = allHeroesSorted[0];
    const mainMatches = mainHeroRow ? (mainHeroRow.matches_played ?? mainHeroRow.matches ?? 0) : 0;
    const mainHero = mainHeroRow ? heroesById.get(mainHeroRow.hero_id) : null;
    if (mainHero && mainMatches >= 15) {
      badges.push({
        label: `Main ${mainHero.name}`,
        tone: "border-amber-500/45 bg-amber-500/15 text-amber-300",
      });
    }
    if (totalMatches >= 500) {
      badges.push({
        label: "Veterano 500+ Partidas",
        tone: "border-purple-500/45 bg-purple-500/15 text-purple-300",
      });
    } else if (totalMatches >= 100) {
      badges.push({
        label: "Experiente 100+ Partidas",
        tone: "border-sky-500/45 bg-sky-500/15 text-sky-300",
      });
    }
    if (totalMatches >= 20 && winRate >= 60) {
      badges.push({
        label: "60%+ Win Rate",
        tone: "border-emerald-500/45 bg-emerald-500/15 text-emerald-300",
      });
    } else if (totalMatches >= 20 && winRate >= 55) {
      badges.push({
        label: "55%+ Win Rate",
        tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      });
    }
    if (totalMatches >= 20 && kda >= 3.0) {
      badges.push({
        label: `KDA ${kda.toFixed(1)}+`,
        tone: "border-cyan-500/45 bg-cyan-500/15 text-cyan-300",
      });
    }
    if (soulsPerMin >= 1050) {
      badges.push({
        label: "Farm Eficiente",
        tone: "border-[#5ce1b6]/45 bg-[#5ce1b6]/10 text-[#5ce1b6]",
      });
    }

    return {
      totalMatches,
      totalWins,
      winRate,
      kda,
      avgKdaTuple: `${(totalKills / totalMatches).toFixed(1)} / ${(totalDeaths / totalMatches).toFixed(1)} / ${(totalAssists / totalMatches).toFixed(1)}`,
      soulsPerMin,
      damagePerMin,
      objDamagePerMin,
      damageMitigatedPerMin,
      damagePerSoul,
      lastHitsPerMin,
      deniesPerMatch,
      accuracy,
      headshotRate,
      mvpTop3Rate,
      mvp1Rate,
      allHeroesSorted,
      badges,
    };
  }, [stats, heroesById, modeFilter, modeMatches]);

  const topMates = useMemo(
    () =>
      [...mates]
        .filter((m) => (m.matches_played ?? m.matches ?? 0) >= 2)
        .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0))
        .slice(0, 5),
    [mates],
  );

  const worstEnemies = useMemo(
    () =>
      [...enemies]
        .filter((e) => (e.matches_played ?? e.matches ?? 0) >= 2)
        .sort((a, b) => {
          const ma = a.matches_played ?? a.matches ?? 1;
          const mb = b.matches_played ?? b.matches ?? 1;
          const wra = (a.wins ?? 0) / ma;
          const wrb = (b.wins ?? 0) / mb;
          return wra - wrb || mb - ma;
        })
        .slice(0, 5),
    [enemies],
  );

  const currentRankBadge = useMemo(() => {
    if (!rankInfo) return null;
    const badgeCode =
      typeof rankInfo.badge === "number"
        ? rankInfo.badge
        : typeof rankInfo.rank === "number"
          ? rankInfo.rank * 10 + (rankInfo.subrank ?? 0)
          : null;
    return resolveRankBadge(badgeCode, ranksMap);
  }, [rankInfo, ranksMap]);

  if (!steamId.trim()) return null;

  if (!accountId) {
    return (
      <div className="rounded-[6px] border border-neutral-800 bg-[#0a0d0c] p-5 text-xs text-neutral-400">
        Steam ID inválido. Informe seu SteamID64 (ex.: 76561198...) ou Account ID nas configurações.
      </div>
    );
  }

  const loading = baseLoading && stats === null;

  const activityAndSocialPanels = (
    <>
      {/* Heatmap 12 semanas */}
      <section
        className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-2.5 shadow-xl"
        style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="border-l-2 pl-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300"
            style={{ borderColor: heroColor }}
          >
            Atividade (12 Semanas)
          </h3>
          <span className="font-mono text-[11px] font-bold" style={{ color: heroColor }}>
            {activityGrid.total84Days} jogos
          </span>
        </div>
        <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-2.5 flex items-center justify-between gap-1 overflow-x-auto">
          {activityGrid.weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => {
                const alpha =
                  day.count === 0 ? 0 : day.count === 1 ? 0.35 : day.count <= 3 ? 0.65 : 1;
                return (
                  <span
                    key={day.date}
                    title={`${day.date}: ${day.count} partida(s)`}
                    className="h-3 w-3 rounded-[2px] bg-neutral-900"
                    style={
                      alpha > 0
                        ? { backgroundColor: heroColor, opacity: alpha }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Aliados Frequentes */}
      <section
        className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-2.5 shadow-xl"
        style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
      >
        <h3
          className="border-l-2 pl-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300"
          style={{ borderColor: heroColor }}
        >
          Com Quem Mais Jogou
        </h3>
        {topMates.length === 0 ? (
          <p className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3 text-xs text-neutral-500">
            Nenhum aliado frequente registrado ainda.
          </p>
        ) : (
          <div className="space-y-1.5">
            {topMates.map((mate) => {
              const total = mate.matches_played ?? mate.matches ?? 0;
              const wins = mate.wins ?? 0;
              const wr = total > 0 ? (wins / total) * 100 : 0;
              const steam = steamNames[mate.mate_id];
              return (
                <Link
                  key={mate.mate_id}
                  href={`/player/${mate.mate_id}`}
                  className="flex items-center justify-between gap-2.5 rounded-[4px] border border-neutral-800 bg-[#070908] px-3 py-2 text-xs hover:border-amber-500/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {steam?.avatar ? (
                      <img
                        src={steam.avatar}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-full object-cover border border-neutral-700"
                      />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400">
                        S
                      </span>
                    )}
                    <span className="truncate font-semibold text-[#f4efe6] hover:text-amber-400 transition-colors">
                      {steam?.personaname || `Jogador #${mate.mate_id}`}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-neutral-300">
                    {total}j •{" "}
                    <strong className={wr >= 50 ? "text-emerald-400" : "text-rose-400"}>
                      {wr.toFixed(0)}%
                    </strong>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );

  const worstEnemiesPanel = (
    <section
      className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-2.5 shadow-xl"
      style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
    >
      <h3
        className="border-l-2 pl-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300"
        style={{ borderColor: heroColor }}
      >
        Piores Inimigos
      </h3>
      {worstEnemies.length === 0 ? (
        <p className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3 text-xs text-neutral-500">
          Ainda não há confrontos repetidos suficientes.
        </p>
      ) : (
        <div className="space-y-1.5">
          {worstEnemies.map((enemy) => {
            const total = enemy.matches_played ?? enemy.matches ?? 0;
            const wins = enemy.wins ?? 0;
            const wr = total > 0 ? (wins / total) * 100 : 0;
            const steam = steamNames[enemy.enemy_id];
            return (
              <Link
                key={enemy.enemy_id}
                href={`/player/${enemy.enemy_id}`}
                className="flex items-center justify-between gap-2.5 rounded-[4px] border border-neutral-800 bg-[#070908] px-3 py-2 text-xs hover:border-rose-500/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {steam?.avatar ? (
                    <img
                      src={steam.avatar}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover border border-neutral-700"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400">
                      E
                    </span>
                  )}
                  <span className="truncate font-semibold text-[#f4efe6]">
                    {steam?.personaname || `Jogador #${enemy.enemy_id}`}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-neutral-300">
                  {total}j •{" "}
                  <strong className={wr >= 50 ? "text-emerald-400" : "text-rose-400"}>
                    {wr.toFixed(0)}%
                  </strong>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );

  const filteredHeroStatsList =
    heroFilter === "all"
      ? (summary?.allHeroesSorted ?? [])
      : (summary?.allHeroesSorted ?? []).filter((row) => row.hero_id === heroFilter);

  const visibleHeroes = showAllHeroes
    ? filteredHeroStatsList
    : filteredHeroStatsList.slice(0, 7);

  return (
    <div className="space-y-4">
      {/* 1. BARRA SUPERIOR DE MODOS + REGIÃO + BADGES */}
      <div
        className="rounded-[6px] border bg-[#0a0d0c]/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl"
        style={{ borderColor: `color-mix(in srgb, ${heroColor} 25%, #262626)` }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "all", label: "Todos", count: modeCounts.all },
              { id: "standard", label: "Standard", count: modeCounts.standard },
              { id: "ranked", label: "Ranked", count: modeCounts.ranked },
              { id: "brawl", label: "Street Brawl", count: modeCounts.brawl },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setModeFilter(tab.id);
                setHeroFilter("all");
                setVisibleMatchesCount(12);
              }}
              className={`flex items-center gap-2 rounded-[4px] px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                modeFilter === tab.id
                  ? ""
                  : "border border-neutral-800 bg-[#070908] text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
              style={
                modeFilter === tab.id
                  ? { backgroundColor: heroColor, color: contrastTextOn(heroColor) }
                  : undefined
              }
            >
              <span>{tab.label}</span>
              <span
                className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                  modeFilter === tab.id ? "bg-black/20 text-black" : "bg-neutral-900 text-neutral-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {regionInfo?.region && (
            <span className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-1 font-mono text-[11px] text-neutral-300">
              {formatRegionLabel(regionInfo.region)}
              {regionInfo.history?.[0]?.datacenter ? ` • ${regionInfo.history[0].datacenter}` : ""}
            </span>
          )}
          <span
            className="rounded-[4px] border px-2.5 py-1 font-mono text-[11px] font-black"
            style={{
              borderColor: `${heroColor}55`,
              color: heroColor,
              backgroundColor: `${heroColor}15`,
            }}
          >
            ID {accountId}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-[6px] bg-neutral-900/80 animate-pulse" />
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-[6px] border border-rose-900/50 bg-[#0a0d0c] p-5 text-xs text-rose-400">
          Não foi possível carregar os dados da Deadlock API agora.
        </div>
      ) : (
        <>
          {/* 2. FAIXA SUPERIOR DE VISÃO GERAL (PATENTE + WIN RATE + MÉTRICAS DE COMBATE) */}
          <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
            {/* Bloco Patente Atual */}
            <section className="rounded-[6px] border border-neutral-800/90 bg-[#0a0d0c]/95 p-4 flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3.5 min-w-0">
                {currentRankBadge?.icon ? (
                  <img
                    src={currentRankBadge.icon}
                    alt={currentRankBadge.label}
                    className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 font-deadlock text-xs font-black text-neutral-500">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Patente Atual
                  </p>
                  <p
                    className="truncate font-deadlock text-lg font-black uppercase"
                    style={{ color: currentRankBadge?.color ?? "#f4efe6" }}
                  >
                    {currentRankBadge?.label ?? "Sem patente"}
                  </p>
                  {typeof rankInfo?.last_match?.player_rank_final_flat_progress === "number" && (
                    <p className="font-mono text-xs text-neutral-400">
                      {rankInfo.last_match.player_rank_final_flat_progress.toLocaleString("pt-BR")} pts
                      {typeof rankInfo.last_match.player_rank_desired_progress_change === "number" && (
                        <span
                          className={`ml-2 font-bold ${
                            rankInfo.last_match.player_rank_desired_progress_change >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {rankInfo.last_match.player_rank_desired_progress_change >= 0 ? "+" : ""}
                          {rankInfo.last_match.player_rank_desired_progress_change}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {summary?.mvpTop3Rate !== null && summary && (
                <div className="shrink-0 rounded-[4px] border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                    MVP Top 3
                  </p>
                  <p className="font-mono text-sm font-black text-amber-300">
                    {summary.mvpTop3Rate.toFixed(0)}%
                  </p>
                </div>
              )}
            </section>

            {/* Bloco Win Rate + Combate */}
            <section className="rounded-[6px] border border-neutral-800/90 bg-[#0a0d0c]/95 p-4 space-y-3 shadow-xl">
              {!summary ? (
                <div className="flex h-full items-center justify-center py-4 text-xs text-neutral-400">
                  {statsLoading
                    ? "Carregando estatísticas deste modo..."
                    : "Nenhuma partida pública encontrada neste filtro."}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xl font-black text-emerald-400">
                        {summary.winRate.toFixed(1)}% WR
                      </span>
                      <span className="font-mono text-xs text-neutral-400">
                        {summary.totalWins}V — {summary.totalMatches - summary.totalWins}D (
                        {summary.totalMatches} jogos)
                      </span>
                      {summary.badges.map((b) => (
                        <span
                          key={b.label}
                          className={`rounded-[4px] border px-2 py-0.5 font-deadlock text-[10px] font-black uppercase tracking-wider ${b.tone}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 font-mono text-xs">
                      <span>
                        Seq. Atual:{" "}
                        <strong className={streaks.currentIsWin ? "text-emerald-400" : "text-rose-400"}>
                          {streaks.current}
                          {streaks.currentIsWin ? "V" : "D"}
                        </strong>
                      </span>
                      <span>
                        Maior Seq.: <strong className="text-amber-400">{streaks.longestWin}V</strong>
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-500/70">
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, summary.winRate))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">KDA Médio</p>
                      <p className="font-mono text-sm font-black text-[#f4efe6]">{summary.kda.toFixed(2)}</p>
                      <p className="truncate font-mono text-[9px] text-neutral-500">{summary.avgKdaTuple}</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Almas/min</p>
                      <p className="font-mono text-sm font-black text-[#5ce1b6]">
                        {Math.round(summary.soulsPerMin).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[9px] text-neutral-500">Patrimônio</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Dano/min</p>
                      <p className="font-mono text-sm font-black text-amber-400">
                        {summary.damagePerMin !== null
                          ? Math.round(summary.damagePerMin).toLocaleString("pt-BR")
                          : "—"}
                      </p>
                      <p className="text-[9px] text-neutral-500">Heróis</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Obj/min</p>
                      <p className="font-mono text-sm font-black text-orange-400">
                        {summary.objDamagePerMin !== null
                          ? Math.round(summary.objDamagePerMin).toLocaleString("pt-BR")
                          : "—"}
                      </p>
                      <p className="text-[9px] text-neutral-500">Torres/Patrono</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Precisão</p>
                      <p className="font-mono text-sm font-black text-sky-400">
                        {summary.accuracy !== null ? `${summary.accuracy.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[9px] text-neutral-500">Disparos</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Crítico / HS</p>
                      <p className="font-mono text-sm font-black text-rose-400">
                        {summary.headshotRate !== null ? `${summary.headshotRate.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[9px] text-neutral-500">Na cabeça</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Last Hits</p>
                      <p className="font-mono text-sm font-black text-[#f4efe6]">
                        {summary.lastHitsPerMin.toFixed(1)}/m
                      </p>
                      <p className="text-[9px] text-neutral-500">Tropas</p>
                    </div>
                    <div className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">Denies</p>
                      <p className="font-mono text-sm font-black text-[#f4efe6]">
                        {summary.deniesPerMatch.toFixed(1)}
                      </p>
                      <p className="text-[9px] text-neutral-500">Por partida</p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* 3. GRADE PRINCIPAL DE PÁGINA INTEIRA (ESQUERDA + CENTRO + DIREITA) */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px] gap-4 items-start">
            {/* COLUNA ESQUERDA: BONEQUINHO + TOP HERÓIS (+ INIMIGOS quando em /profile) */}
            <div className="space-y-4">
              <HitSilhouetteCard
                accuracy={summary?.accuracy ?? null}
                headshotRate={summary?.headshotRate ?? null}
                damagePerSoul={summary?.damagePerSoul ?? null}
                damageMitigatedPerMin={summary?.damageMitigatedPerMin ?? null}
                heroColor={heroColor}
              />

              <section
                className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-3 shadow-xl"
                style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className="border-l-2 pl-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300"
                    style={{ borderColor: heroColor }}
                  >
                    Heróis Mais Jogados
                  </h3>
                  {summary && summary.allHeroesSorted.length > 7 && (
                    <button
                      type="button"
                      onClick={() => setShowAllHeroes((v) => !v)}
                      className="cursor-pointer font-deadlock text-[10px] font-black uppercase hover:underline"
                      style={{ color: heroColor }}
                    >
                      {showAllHeroes ? "Menos" : `Ver todos (${summary.allHeroesSorted.length})`}
                    </button>
                  )}
                </div>

                {visibleHeroes.length === 0 ? (
                  <p className="text-xs text-neutral-500">Sem heróis registrados neste modo.</p>
                ) : (
                  <div className="space-y-1.5">
                    {visibleHeroes.map((row) => {
                      const m = row.matches_played ?? row.matches ?? 0;
                      const w = row.wins ?? 0;
                      const wr = m > 0 ? (w / m) * 100 : 0;
                      const kda = ((row.kills ?? 0) + (row.assists ?? 0)) / Math.max(1, row.deaths ?? 0);
                      const hero = heroesById.get(row.hero_id);
                      return (
                        <Link
                          key={row.hero_id}
                          href={`/heroes/${row.hero_id}`}
                          className="block rounded-[4px] border border-neutral-800 bg-[#070908] p-2.5 hover:border-amber-500/60 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {hero?.image ? (
                                <img
                                  src={hero.image}
                                  alt=""
                                  className="h-9 w-9 shrink-0 rounded-[3px] object-cover border border-neutral-700"
                                />
                              ) : (
                                <span className="h-9 w-9 shrink-0 rounded-[3px] bg-neutral-800" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[#f4efe6]">
                                  {hero?.name ?? `Herói #${row.hero_id}`}
                                </p>
                                <p className="font-mono text-[10px] text-neutral-400">
                                  {w}V-{m - w}D • KDA {kda.toFixed(1)}
                                  {typeof row.networth_per_min === "number"
                                    ? ` • ${Math.round(row.networth_per_min)}/m`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-xs font-black ${
                                wr >= 52 ? "text-emerald-400" : wr <= 48 ? "text-rose-400" : "text-amber-300"
                              }`}
                            >
                              {wr.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-rose-500/40">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${Math.min(100, Math.max(0, wr))}%` }}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              {accountSidebar && worstEnemiesPanel}
            </div>

            {/* COLUNA CENTRAL: ÚLTIMAS 20 + HISTÓRICO DETALHADO (EXPANSÍVEL COM ITENS) */}
            <div className="space-y-4 min-w-0">
              {last20Summary && (
                <section className="rounded-[6px] border border-neutral-800/90 bg-[#0a0d0c]/95 p-4 space-y-3 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Últimas {last20Summary.items.length} Partidas
                        </p>
                        <p className="font-mono text-base font-black text-emerald-400">
                          {last20Summary.winRate.toFixed(0)}% WR{" "}
                          <span className="text-xs font-normal text-neutral-400">
                            ({last20Summary.wins}V / {last20Summary.losses}D)
                          </span>
                        </p>
                      </div>
                      <div className="border-l border-neutral-800 pl-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          KDA Médio
                        </p>
                        <p className="font-mono text-sm font-black text-[#f4efe6]">
                          {last20Summary.avgKda.toFixed(2)}
                        </p>
                      </div>
                      <div className="border-l border-neutral-800 pl-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Almas/min
                        </p>
                        <p className="font-mono text-sm font-black text-[#5ce1b6]">
                          {Math.round(last20Summary.avgSpm).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <SoulsSparkline values={last20Summary.spmSeries} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {last20Summary.items.map((m) => {
                      const won = isMatchWon(m);
                      return (
                        <span
                          key={`dot-${m.match_id}`}
                          title={`${heroesById.get(m.hero_id)?.name ?? "Herói"} • ${m.player_kills}/${m.player_deaths}/${m.player_assists}`}
                          className={`flex h-5 w-5 items-center justify-center rounded-[3px] font-mono text-[10px] font-black ${
                            won
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {won ? "V" : "D"}
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}

              <section
                className="rounded-[6px] border bg-[#0a0d0c]/95 p-4 space-y-3 shadow-xl"
                style={{ borderColor: `color-mix(in srgb, ${heroColor} 22%, #262626)` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <h3
                      className="border-l-2 pl-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]"
                      style={{ borderColor: heroColor }}
                    >
                      Histórico de Partidas
                    </h3>
                    <span className="font-mono text-[11px] text-neutral-500">
                      Mostrando {visibleMatches.length} de {filteredMatches.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Filtrar por herói"
                      value={heroFilter === "all" ? "all" : String(heroFilter)}
                      onChange={(e) => {
                        setHeroFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                        setVisibleMatchesCount(12);
                      }}
                      className="rounded-[4px] border border-neutral-800 bg-[#070908] px-2.5 py-1 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="all">Todos os heróis</option>
                      {playedHeroIdsInMode.map((hid) => (
                        <option key={hid} value={hid}>
                          {heroesById.get(hid)?.name ?? `Herói #${hid}`}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center rounded-[4px] border border-neutral-800 bg-[#070908] p-0.5">
                      {(
                        [
                          { id: "all", label: "Todas" },
                          { id: "win", label: "Vitórias" },
                          { id: "loss", label: "Derrotas" },
                        ] as const
                      ).map((rf) => (
                        <button
                          key={rf.id}
                          type="button"
                          onClick={() => {
                            setResultFilter(rf.id);
                            setVisibleMatchesCount(12);
                          }}
                          className={`cursor-pointer rounded-[3px] px-2 py-0.5 text-[11px] font-bold transition-colors ${
                            resultFilter === rf.id
                              ? ""
                              : "text-neutral-400 hover:text-white"
                          }`}
                          style={
                            resultFilter === rf.id
                              ? { backgroundColor: heroColor, color: contrastTextOn(heroColor) }
                              : undefined
                          }
                        >
                          {rf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredMatches.length === 0 ? (
                  <p className="rounded-[4px] border border-neutral-800 bg-[#070908] p-6 text-center text-xs text-neutral-500">
                    Nenhuma partida encontrada com os filtros selecionados.
                  </p>
                ) : (
                 <div className="space-y-2">
                    {visibleMatches.map((m) => {
                      const won = isMatchWon(m);
                      const hero = heroesById.get(m.hero_id);
                      const mins = Math.max(1, Math.floor(m.match_duration_s / 60));
                      const secs = m.match_duration_s % 60;
                      const spm = Math.round(m.net_worth / Math.max(1, m.match_duration_s / 60));
                      const kda = (m.player_kills + m.player_assists) / Math.max(1, m.player_deaths);
                      const matchRank = resolveRankBadge(m.ranked_display_badge, ranksMap);
                      const hasLoadedDetail = m.match_id in matchDetailsMap;
                      const detailInfo = matchDetailsMap[m.match_id];
                      const finalItems = (detailInfo?.player.items ?? [])
                        .filter((it) => (it.sold_time_s ?? 0) === 0)
                        .map((it) => itemsMap.get(it.item_id))
                        .filter((it): it is UpgradeAssetItem => Boolean(it))
                        .filter((it, idx, arr) => arr.findIndex((x) => x.id === it.id) === idx);

                      const heroBg = hero?.banner || "";
                      const heroArt = hero?.art || hero?.image || "";
                      const heroFallback = hero?.image || "";
                      const ringPct = detailInfo
                        ? Math.max(10, Math.round(((detailInfo.totalPlayers + 1 - detailInfo.placement) / detailInfo.totalPlayers) * 100))
                        : 0;
                      const ringCirc = 2 * Math.PI * 16;

                      const eloBase = eloBaselines.get(m.hero_id);
                      const eloBars = detailInfo
                        ? [
                            {
                              label: "Dano a Heróis",
                              score: eloScoreBar(detailInfo.heroDmg, eloBase?.avgDamage),
                              detail: eloBase
                                ? `${(detailInfo.heroDmg / 1000).toFixed(1)}k vs ${(eloBase.avgDamage / 1000).toFixed(1)}k`
                                : `${(detailInfo.heroDmg / 1000).toFixed(1)}k`,
                              color: "#3b82f6",
                            },
                            {
                              label: "Partic. Abates",
                              score: eloScoreBar(kda, eloBase?.avgKda),
                              detail: `${detailInfo.kpPct.toFixed(0)}% KP • ${kda.toFixed(2)} KDA`,
                              color: "#f43f5e",
                            },
                            {
                              label: "Almas Ganhas",
                              score: eloScoreBar(detailInfo.netWorth, eloBase?.avgNetWorth),
                              detail: eloBase
                                ? `${(detailInfo.netWorth / 1000).toFixed(1)}k vs ${(eloBase.avgNetWorth / 1000).toFixed(1)}k`
                                : `${(detailInfo.netWorth / 1000).toFixed(1)}k`,
                              color: "#5ce1b6",
                            },
                            {
                              label: "Dano a Objetivos",
                              score: eloScoreBar(detailInfo.objDmg, eloBase?.avgObjDamage),
                              detail: eloBase
                                ? `${(detailInfo.objDmg / 1000).toFixed(1)}k vs ${(eloBase.avgObjDamage / 1000).toFixed(1)}k`
                                : `${(detailInfo.objDmg / 1000).toFixed(1)}k`,
                              color: "#f97316",
                            },
                            {
                              label: "Dano Absorvido",
                              score: eloScoreBar(detailInfo.dmgTaken, eloBase?.avgDamageTaken),
                              detail: eloBase
                                ? `${(detailInfo.dmgTaken / 1000).toFixed(1)}k vs ${(eloBase.avgDamageTaken / 1000).toFixed(1)}k`
                                : `${(detailInfo.dmgTaken / 1000).toFixed(1)}k`,
                              color: "#818cf8",
                            },
                            {
                              label: "Farm (Last Hits)",
                              score: eloScoreBar(
                                detailInfo.lastHits || m.last_hits || 0,
                                eloBase?.avgLastHits,
                              ),
                              detail: eloBase
                                ? `${detailInfo.lastHits || m.last_hits || 0} vs ${Math.round(eloBase.avgLastHits)}`
                                : `${detailInfo.lastHits || m.last_hits || 0} LH`,
                              color: "#eab308",
                            },
                            ...(detailInfo.accuracyPct !== null
                              ? [
                                  {
                                    label: "Precisão",
                                    score: eloScoreBar(detailInfo.accuracyPct, eloBase?.avgAccuracy),
                                    detail: eloBase
                                      ? `${detailInfo.accuracyPct.toFixed(1)}% vs ${eloBase.avgAccuracy.toFixed(1)}%`
                                      : `${detailInfo.accuracyPct.toFixed(1)}%`,
                                    color: "#c084fc",
                                  },
                                ]
                              : []),
                          ]
                        : [];

                      const isMvp = Boolean(
                        detailInfo && (detailInfo.player.mvp_rank === 1 || detailInfo.placement === 1),
                      );
                      const isMvpWin = won && isMvp;

                      return (
                        <div
                          key={m.match_id}
                          className={`relative rounded-[6px] border border-l-[3px] transition-colors ${
                            isMvpWin
                              ? "border-yellow-400/50 border-l-yellow-400 bg-[#171508] hover:border-yellow-400/75"
                              : won
                                ? "border-emerald-500/25 border-l-emerald-400 bg-[#0a0f0d] hover:border-emerald-500/45"
                                : "border-rose-500/25 border-l-rose-400 bg-[#100a0c] hover:border-rose-500/45"
                          }`}
                        >
                          <div
                            onClick={() => toggleMatchExpand(m.match_id, detailInfo)}
                            title="Clique para ver detalhes e placar completo da partida"
                            className="grid cursor-pointer grid-cols-1 md:grid-cols-[260px_minmax(130px,1fr)_124px_auto] items-center gap-3 text-xs"
                          >
                            {/* Coluna 1: Textura de fundo sutil + Render full-body do Herói na direita */}
                            <div className="relative flex min-h-[90px] items-center overflow-hidden rounded-l-[4px] px-3.5 py-2.5">
                              {heroBg && (
                                <img
                                  src={heroBg}
                                  alt=""
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-25"
                                />
                              )}
                              {heroArt && (
                                <img
                                  src={heroArt}
                                  alt=""
                                  aria-hidden
                                  onError={(e) => {
                                    if (e.currentTarget.dataset.fb || !heroFallback) {
                                      e.currentTarget.style.display = "none";
                                      return;
                                    }
                                    e.currentTarget.dataset.fb = "1";
                                    e.currentTarget.src = heroFallback;
                                  }}
                                  className="pointer-events-none absolute right-1 top-0.5 h-[185%] w-[160px] object-contain object-top opacity-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                                  style={{
                                    maskImage: "linear-gradient(to bottom, black 55%, transparent 98%)",
                                    WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 98%)",
                                  }}
                                />
                              )}
                              <div
                                aria-hidden
                                className={`pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r ${
                                  isMvpWin
                                    ? "from-[#171508] via-[#171508]/85"
                                    : won
                                      ? "from-[#0a0f0d] via-[#0a0f0d]/85"
                                      : "from-[#100a0c] via-[#100a0c]/85"
                                } to-transparent`}
                              />
                              <div className="relative z-10 min-w-0 space-y-0.5">
                                <p
                                  className={`font-deadlock text-xl font-black uppercase leading-none tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                                    won ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {won ? "Vitória" : "Derrota"}
                                </p>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <p className="truncate font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                                    {hero?.name ?? `Herói #${m.hero_id}`}
                                  </p>
                                  {typeof m.hero_level === "number" && m.hero_level > 0 && (
                                    <span className="shrink-0 rounded bg-black/75 px-1 py-0.2 font-mono text-[9px] font-black text-amber-300 border border-neutral-700/80">
                                      Nv.{m.hero_level}
                                    </span>
                                  )}
                                </div>
                                <p className="font-mono text-[10px] text-neutral-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                                  {formatModeLabel(m)} • {mins}:{String(secs).padStart(2, "0")} •{" "}
                                  {formatRelativeTime(m.start_time)}
                                </p>
                              </div>
                            </div>

                            {/* Coluna 2: K/D/A, KDA, Almas e Farm */}
                            <div className="px-3.5 md:px-1 py-1.5 font-mono space-y-0.5">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                                K / D / A
                              </p>
                              <p className="text-sm font-black text-[#f4efe6] leading-tight">
                                {m.player_kills} <span className="text-neutral-600">/</span>{" "}
                                <span className="text-rose-400">{m.player_deaths}</span>{" "}
                                <span className="text-neutral-600">/</span> {m.player_assists}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px]">
                                <span className="text-neutral-300 font-bold">{kda.toFixed(2)} KDA</span>
                                <span className="text-[#5ce1b6] font-bold">
                                  {(m.net_worth / 1000).toFixed(1)}k ({spm}/m)
                                </span>
                                {(typeof m.last_hits === "number" || typeof m.denies === "number") && (
                                  <span className="text-neutral-500">
                                    {m.last_hits ?? 0}/{m.denies ?? 0} LH
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Coluna 3: Apenas Nota (S/A/B/C/D) + Colocação (#X) */}
                            <div className="relative group/mvp flex items-center px-3.5 md:px-1 py-1.5 font-mono">
                              {detailInfo ? (() => {
                                const isTop3Mvp =
                                  isMvp ||
                                  (typeof detailInfo.player.mvp_rank === "number" &&
                                    detailInfo.player.mvp_rank >= 1 &&
                                    detailInfo.player.mvp_rank <= 3);
                                const activeColor = isMvp ? "#facc15" : detailInfo.gradeColor;

                                return (
                                <>
                                  <div className="flex items-center gap-2 cursor-default">
                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                      <svg viewBox="0 0 40 40" className="h-9 w-9 -rotate-90">
                                        <circle
                                          cx="20"
                                          cy="20"
                                          r="16"
                                          fill="none"
                                          stroke="rgba(255,255,255,0.08)"
                                          strokeWidth="3"
                                        />
                                        <circle
                                          cx="20"
                                          cy="20"
                                          r="16"
                                          fill="none"
                                          stroke={activeColor}
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeDasharray={ringCirc}
                                          strokeDashoffset={ringCirc * (1 - ringPct / 100)}
                                        />
                                      </svg>
                                      <span
                                        className="absolute font-deadlock text-xs font-black"
                                        style={{ color: activeColor }}
                                      >
                                        {detailInfo.grade}
                                      </span>
                                    </div>
                                    <div
                                      className={`flex items-center gap-1 text-xs font-black ${
                                        isMvp
                                          ? "text-yellow-400"
                                          : detailInfo.placement <= 3
                                            ? "text-amber-300"
                                            : "text-neutral-200"
                                      }`}
                                    >
                                      {isTop3Mvp && (
                                        <svg
                                          aria-hidden
                                          viewBox="0 0 24 24"
                                          className="h-3.5 w-3.5 shrink-0"
                                          fill="currentColor"
                                        >
                                          <path d="M5 3a1 1 0 0 0-1 1v2a5 5 0 0 0 4 4.9V13a3 3 0 0 0 2 2.83V18H7a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2h-3v-2.17A3 3 0 0 0 16 13v-2.1A5 5 0 0 0 20 6V4a1 1 0 0 0-1-1H5Zm1 3V5h2v4a3 3 0 0 1-2-3Zm10 3V5h2v1a3 3 0 0 1-2 3Z" />
                                        </svg>
                                      )}
                                      <span>#{detailInfo.placement}</span>
                                    </div>
                                  </div>

                                  {/* Popover comparativo ao elo ao passar o mouse */}
                                  <div className="pointer-events-none invisible opacity-0 group-hover/mvp:visible group-hover/mvp:opacity-100 transition-opacity duration-150 absolute left-0 top-full z-50 mt-2 w-80 rounded-[6px] border border-neutral-700/90 bg-[#0d1110]/98 p-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.95)]">
                                    <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2.5">
                                      <div>
                                        <p
                                          className="font-deadlock text-sm font-black uppercase"
                                          style={{ color: detailInfo.gradeColor }}
                                        >
                                          Nota {detailInfo.grade}
                                        </p>
                                        <p className="text-xs font-bold text-[#f4efe6]">
                                          {detailInfo.player.mvp_rank === 1 ? "MVP da Partida • " : ""}
                                          {detailInfo.placement}º de {detailInfo.totalPlayers}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">
                                          Pontuação {detailInfo.score100.toFixed(1)} de 100
                                        </p>
                                      </div>

                                      {matchRank && (
                                        <div className="flex items-center gap-1.5 rounded bg-black/50 border border-neutral-800 px-2 py-1">
                                          {matchRank.icon && (
                                            <img
                                              src={matchRank.icon}
                                              alt={matchRank.label}
                                              className="h-5 w-5 object-contain"
                                            />
                                          )}
                                          <div className="text-right leading-tight">
                                            <p className="text-[10px] font-bold text-neutral-200">
                                              {matchRank.label}
                                            </p>
                                            {typeof m.ranked_delta === "number" && m.ranked_delta !== 0 && (
                                              <p
                                                className={`text-[9px] font-black ${
                                                  m.ranked_delta > 0 ? "text-emerald-400" : "text-rose-400"
                                                }`}
                                              >
                                                {m.ranked_delta > 0 ? "+" : ""}
                                                {m.ranked_delta} pts
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-2.5 space-y-2">
                                      {eloBars.map((bar) => (
                                        <div key={bar.label} className="space-y-0.5">
                                          <div className="flex items-center justify-between gap-2 text-[11px]">
                                            <span className="font-semibold text-neutral-200">{bar.label}</span>
                                            <span className="text-[10px] text-neutral-400">{bar.detail}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                                              <div
                                                className="h-full rounded-full"
                                                style={{
                                                  width: `${bar.score}%`,
                                                  backgroundColor: bar.color,
                                                }}
                                              />
                                            </div>
                                            <span
                                              className="w-6 text-right font-mono text-[11px] font-black"
                                              style={{ color: bar.color }}
                                            >
                                              {bar.score}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <p className="mt-3 border-t border-neutral-800/80 pt-2 text-[9px] uppercase tracking-wider text-neutral-500">
                                      Escala 0–100 (50 = média do herói{" "}
                                      {currentRankBadge
                                        ? `no elo ${currentRankBadge.label.split(" ")[0]}`
                                        : "global"}
                                      )
                                    </p>
                                  </div>
                                </>
                                );
                              })() : !hasLoadedDetail ? (
                                <span className="block h-9 w-16 rounded bg-neutral-900/70 animate-pulse" />
                              ) : (
                                <span className="text-[10px] text-neutral-500">—</span>
                              )}
                            </div>

                            {/* Coluna 4: Grade 6x2 da Build sem título, com espaçamento limpo e tooltip do item */}
                            <div className="px-3.5 pb-2.5 md:pb-2 md:pl-1 md:pr-3.5 md:py-2">
                              <div className="grid w-fit grid-cols-6 gap-1.5">
                                {!hasLoadedDetail ? (
                                  Array.from({ length: 12 }).map((_, idx) => (
                                    <span
                                      key={`sk-${m.match_id}-${idx}`}
                                      className="h-[30px] w-[30px] rounded-[4px] border border-neutral-800 bg-neutral-900/70 animate-pulse"
                                    />
                                  ))
                                ) : finalItems.length > 0 ? (
                                  Array.from({ length: 12 }).map((_, idx) => {
                                    const it = finalItems[idx];
                                    if (!it) {
                                      return (
                                        <span
                                          key={`empty-${m.match_id}-${idx}`}
                                          className="h-[30px] w-[30px] rounded-[4px] border border-neutral-800/60 bg-black/35"
                                        />
                                      );
                                    }
                                    const img = it.shop_image || it.image;
                                    return (
                                      <Link
                                        key={it.id}
                                        href={`/items/${it.class_name}`}
                                        aria-label={it.name}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseEnter={(e) => showItemTip(it, e.currentTarget)}
                                        onMouseLeave={() => setHoveredItemTip(null)}
                                        onFocus={(e) => showItemTip(it, e.currentTarget)}
                                        onBlur={() => setHoveredItemTip(null)}
                                        className={`block h-[30px] w-[30px] overflow-hidden rounded-[4px] border bg-neutral-950 transition-[filter,border-color] hover:brightness-125 hover:border-white/75 ${itemSlotBorder(
                                          it.item_slot_type,
                                        )}`}
                                      >
                                        {img && (
                                          <img
                                            src={img}
                                            alt={it.name}
                                            className="h-full w-full object-cover"
                                          />
                                        )}
                                      </Link>
                                    );
                                  })
                                ) : (
                                  <span className="col-span-6 text-[10px] text-neutral-500">
                                    Build indisponível
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {expandedMatchId === m.match_id && detailInfo && (() => {
                            const lastSt =
                              detailInfo.player.stats && detailInfo.player.stats.length > 0
                                ? detailInfo.player.stats[detailInfo.player.stats.length - 1]
                                : null;
                            const totalHeal =
                              (lastSt?.player_healing ?? 0) + (lastSt?.teammate_healing ?? 0);
                            const critPctMatch =
                              lastSt?.hero_bullets_hit && lastSt.hero_bullets_hit > 0
                                ? ((lastSt.hero_bullets_hit_crit ?? 0) / lastSt.hero_bullets_hit) * 100
                                : null;
                            const team0 = detailInfo.allPlayers
                              .filter((p) => p.team === 0)
                              .sort((a, b) => (b.net_worth ?? 0) - (a.net_worth ?? 0));
                            const team1 = detailInfo.allPlayers
                              .filter((p) => p.team === 1)
                              .sort((a, b) => (b.net_worth ?? 0) - (a.net_worth ?? 0));
                            const teams = [
                              { teamId: 0, list: team0, wonTeam: m.match_result === 0 },
                              { teamId: 1, list: team1, wonTeam: m.match_result === 1 },
                            ].filter((t) => t.list.length > 0);

                            return (
                              <div className="border-t border-neutral-800/90 bg-[#070908]/95 p-3.5 sm:p-4 space-y-4">
                                {/* Resumo detalhado do jogador na partida */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-300">
                                    Dados da Partida #{m.match_id}
                                  </span>
                                  <span className="font-mono text-[11px] text-neutral-400">
                                    Partic. em abates: <strong className="text-[#f4efe6]">{detailInfo.kpPct.toFixed(0)}%</strong>
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Dano Heróis</p>
                                    <p className="font-mono font-black text-amber-400">
                                      {detailInfo.heroDmg.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Dano Objetivos</p>
                                    <p className="font-mono font-black text-orange-400">
                                      {detailInfo.objDmg.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Cura Total</p>
                                    <p className="font-mono font-black text-emerald-400">
                                      {totalHeal.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Recebido / Mitig.</p>
                                    <p className="font-mono font-black text-sky-300">
                                      {(detailInfo.dmgTaken / 1000).toFixed(1)}k / {(detailInfo.mitigated / 1000).toFixed(1)}k
                                    </p>
                                  </div>
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Precisão / Crítico</p>
                                    <p className="font-mono font-black text-rose-400">
                                      {detailInfo.accuracyPct !== null ? `${detailInfo.accuracyPct.toFixed(1)}%` : "—"} •{" "}
                                      {critPctMatch !== null ? `${critPctMatch.toFixed(1)}%` : "—"}
                                    </p>
                                  </div>
                                  <div className="rounded-[4px] border border-neutral-800/80 bg-[#0b0e0d] px-2.5 py-2">
                                    <p className="text-[10px] uppercase text-neutral-500">Abates (Arma/Hab/HS)</p>
                                    <p className="font-mono font-black text-neutral-200">
                                      {lastSt?.bullet_kills ?? 0} / {lastSt?.ability_kills ?? 0} / {lastSt?.headshot_kills ?? 0}
                                    </p>
                                  </div>
                                </div>

                                {/* Placar completo dos 12 jogadores */}
                                <div className="space-y-3">
                                  {teams.map((tm) => (
                                    <div key={tm.teamId} className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                        <span className={tm.wonTeam ? "text-emerald-400" : "text-rose-400"}>
                                          {tm.teamId === 0 ? "Time Âmbar" : "Time Safira"} •{" "}
                                          {tm.wonTeam ? "Vitória" : "Derrota"}
                                        </span>
                                        <span className="font-mono text-neutral-500">
                                          {tm.list.reduce((s, p) => s + (p.kills ?? 0), 0)} /{" "}
                                          {tm.list.reduce((s, p) => s + (p.deaths ?? 0), 0)} /{" "}
                                          {tm.list.reduce((s, p) => s + (p.assists ?? 0), 0)}
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        {tm.list.map((pl) => {
                                          const pHero = pl.hero_id ? heroesById.get(pl.hero_id) : undefined;
                                          const pSteam = steamNames[pl.account_id];
                                          const pSt =
                                            pl.stats && pl.stats.length > 0
                                              ? pl.stats[pl.stats.length - 1]
                                              : undefined;
                                          const pGrade = detailInfo.ranksByAccount[pl.account_id];
                                          const isSelf = pl.account_id === Number(accountId);
                                          const pItems = (pl.items ?? [])
                                            .filter((it) => (it.sold_time_s ?? 0) === 0)
                                            .map((it) => itemsMap.get(it.item_id))
                                            .filter((it): it is UpgradeAssetItem => Boolean(it))
                                            .filter((it, idx, arr) => arr.findIndex((x) => x.id === it.id) === idx)
                                            .slice(0, 12);

                                          return (
                                            <div
                                              key={pl.account_id}
                                              className={`grid grid-cols-[minmax(140px,1.2fr)_80px_68px_72px_auto] items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-[11px] ${
                                                isSelf
                                                  ? "bg-white/[0.04]"
                                                  : "border-neutral-800/70 bg-[#0b0e0d]/90"
                                              }`}
                                              style={isSelf ? { borderColor: heroColor } : undefined}
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                {pHero?.image ? (
                                                  <img
                                                    src={pHero.image}
                                                    alt=""
                                                    className="h-7 w-7 shrink-0 rounded-[3px] object-cover border border-neutral-700"
                                                  />
                                                ) : (
                                                  <span className="h-7 w-7 shrink-0 rounded-[3px] bg-neutral-800" />
                                                )}
                                                <div className="min-w-0">
                                                  <Link
                                                    href={`/player/${pl.account_id}`}
                                                    className="block truncate font-semibold text-[#f4efe6] hover:text-amber-400 transition-colors"
                                                  >
                                                    {pSteam?.personaname || `Jogador #${pl.account_id}`}
                                                  </Link>
                                                  <p className="truncate text-[9px] text-neutral-500">
                                                    {pHero?.name ?? `Herói #${pl.hero_id ?? "?"}`}
                                                    {typeof pl.level === "number" ? ` • Nv.${pl.level}` : ""}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="font-mono text-center">
                                                <span className="font-bold text-[#f4efe6]">
                                                  {pl.kills ?? 0}/{pl.deaths ?? 0}/{pl.assists ?? 0}
                                                </span>
                                              </div>

                                              <div className="font-mono text-right text-[#5ce1b6] font-bold">
                                                {((pl.net_worth ?? 0) / 1000).toFixed(1)}k
                                              </div>

                                              <div className="font-mono text-right text-amber-400">
                                                {((pSt?.player_damage ?? 0) / 1000).toFixed(1)}k
                                              </div>

                                              <div className="hidden sm:flex items-center justify-end gap-1.5">
                                                {pGrade && (
                                                  <span
                                                    className="font-deadlock text-[10px] font-black w-5 text-center"
                                                    style={{ color: pGrade.gradeColor }}
                                                    title={`#${pGrade.placement} na partida`}
                                                  >
                                                    {pGrade.grade}
                                                  </span>
                                                )}
                                                <div className="flex flex-wrap gap-0.5 max-w-[168px]">
                                                  {pItems.map((it) => {
                                                    const img = it.shop_image || it.image;
                                                    return (
                                                      <Link
                                                        key={`${pl.account_id}-${it.id}`}
                                                        href={`/items/${it.class_name}`}
                                                        onMouseEnter={(e) => showItemTip(it, e.currentTarget)}
                                                        onMouseLeave={() => setHoveredItemTip(null)}
                                                        className={`block h-5 w-5 overflow-hidden rounded-[2px] border bg-neutral-950 ${itemSlotBorder(
                                                          it.item_slot_type,
                                                        )}`}
                                                      >
                                                        {img && (
                                                          <img
                                                            src={img}
                                                            alt={it.name}
                                                            className="h-full w-full object-cover"
                                                          />
                                                        )}
                                                      </Link>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}

                    {filteredMatches.length > visibleMatchesCount && (
                      <button
                        type="button"
                        onClick={() => setVisibleMatchesCount((prev) => prev + 12)}
                        className="w-full rounded-[4px] border bg-[#070908] py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-opacity hover:opacity-85 cursor-pointer"
                        style={{
                          borderColor: `color-mix(in srgb, ${heroColor} 35%, #262626)`,
                          color: heroColor,
                        }}
                      >
                        Carregar mais partidas ({filteredMatches.length - visibleMatchesCount} restantes)
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* COLUNA DIREITA: SIDEBAR DA CONTA (em /profile) + ATIVIDADE + ALIADOS (+ INIMIGOS em /player) */}
            <div className="space-y-4 lg:col-span-2 xl:col-span-1">
              {accountSidebar}
              {activityAndSocialPanels}
              {!accountSidebar && worstEnemiesPanel}
            </div>
          </div>
        </>
      )}
      {hoveredItemTip && (
        <BuildItemTooltip
          item={hoveredItemTip.item}
          x={hoveredItemTip.x}
          y={hoveredItemTip.y}
          above={hoveredItemTip.above}
        />
      )}
    </div>
  );
}