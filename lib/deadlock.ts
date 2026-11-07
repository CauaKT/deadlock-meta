/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/deadlock.ts

import { connection } from "next/server";

export interface HeroAbility {
  id: number;
  slot: number;
  name: string;
  description: string;
  image?: string;
  cooldown?: number | string;
}

export interface HeroAsset {
  id: number;
  name: string;
  description?: any;
  complexity?: number;
  role?: string;
  traits?: string[];
  images?: {
    icon_hero_card?: string;
    icon_image_small?: string;
    minimap_image?: string;
    selection_image?: string;
    horizontal_card?: string;
    [key: string]: any;
  };
  abilities?: HeroAbility[];
  stats?: Record<string, any>;
  [key: string]: any;
}

export interface HeroAnalytics {
  hero_id: number;
  matches: number;
  wins?: number;
  losses?: number;
  win_rate?: number;
  [key: string]: any;
}

export interface MergedHero {
  id: number;
  name: string;
  image: string;
  bannerImage: string;
  defaultImage?: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

let assetsCache: { data: Record<number, HeroAsset>; at: number } | null = null;
const ASSETS_TTL = 24 * 60 * 60 * 1000;

export async function fetchHeroesAssets(): Promise<Record<number, HeroAsset>> {
  await connection();
  if (assetsCache && Date.now() - assetsCache.at < ASSETS_TTL) {
    return assetsCache.data;
  }

  try {
    const res = await fetch("https://api.deadlock-api.com/v1/assets/heroes", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return assetsCache?.data ?? {};

    const data: HeroAsset[] = await res.json();
    const map = data.reduce((acc, hero) => {
      acc[hero.id] = hero;
      return acc;
    }, {} as Record<number, HeroAsset>);

    assetsCache = { data: map, at: Date.now() };
    return map;
  } catch (err) {
    console.error("❌ Falha ao buscar assets:", err);
    return assetsCache?.data ?? {};
  }
}

export async function fetchHeroDetails(heroId: number): Promise<HeroAsset | null> {
  try {
    const res = await fetch(`https://api.deadlock-api.com/v1/assets/heroes/${heroId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Busca as habilidades reais vinculadas ao ID do herói
export async function fetchHeroAbilities(heroId: number): Promise<HeroAbility[]> {
  try {
    const res = await fetch(`https://api.deadlock-api.com/v1/assets/items/by-hero-id/${heroId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .filter((item: any) => item.type === "ability" || (item.slot >= 1 && item.slot <= 4))
      .map((item: any, idx: number) => ({
        id: item.id || idx + 1,
        slot: item.slot || idx + 1,
        name: item.name || `Habilidade #${idx + 1}`,
        description: item.description?.en || item.description || "",
        image: item.image || item.icon || "",
      }));
  } catch {
    return [];
  }
}

export interface Patch {
  id: string;
  label: string;
  since?: number; // Unix timestamp em segundos; sem valor = sem filtro de data
}

// Do mais novo para o mais antigo. O primeiro é o selecionado por padrão.
// `since` = Unix timestamp em segundos. Patches com horário exato usam o horário
// do post da Valve no Steam; os que só têm dia usam 00:00 UTC desse dia, então
// podem incluir algumas horas de partidas anteriores ao patch.
export const PATCHES: Patch[] = [
  { id: "halloween-2026", label: "Halloween + Gameplay Update (30/10/2026)", since: 1793393460 },
  { id: "minor-10-14", label: "Minor Update 14/10/2026", since: 1792033860 },
  { id: "minor-10-05", label: "Minor Update 05/10/2026", since: 1791241500 },
  { id: "city-never-sleeps", label: "City Never Sleeps (29/09/2026)", since: 1790713511 },
  { id: "minor-09-16", label: "Minor Update 16/09/2026", since: 1789516800 },
  { id: "minor-08-22", label: "Minor Update 22/08/2026", since: 1787356800 },
  { id: "ranked-season-1", label: "Matchmaking Update / Ranked Season 1 (30/07/2026)", since: 1785430800 },
  { id: "minor-06-04", label: "Minor Update 04/06/2026", since: 1780531200 },
  { id: "update-05-22", label: "Atualização 22/05/2026", since: 1779408000 },
  { id: "update-04-30", label: "Atualização 30/04/2026", since: 1777507200 },
  { id: "update-03-21", label: "Atualização 21/03/2026", since: 1774051200 },
  { id: "update-03-06", label: "Atualização 06/03/2026", since: 1772833020 },
  { id: "update-01-30", label: "Atualização 30/01/2026", since: 1769731200 },
  { id: "old-gods-new-blood", label: "Old Gods, New Blood (22/01/2026)", since: 1769122593 },
  { id: "default", label: "Últimos 30 dias (padrão da API)" },
];

export async function fetchHeroesAnalytics(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number
): Promise<HeroAnalytics[]> {
  try {
    const url = new URL("https://api.deadlock-api.com/v1/analytics/hero-stats");
    if (minUnixTimestamp) {
      url.searchParams.set("min_unix_timestamp", String(minUnixTimestamp));
    }
    if (maxUnixTimestamp) {
      url.searchParams.set("max_unix_timestamp", String(maxUnixTimestamp));
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch {
    return [];
  }
}

export const TIER_THRESHOLDS = {
  META: 53.5,
  A: 51.5,
  B: 50.0,
  C: 48.5,
  D: 47.0,
} as const;

export interface AbilityStat {
  key: string;
  label: string;
  base: number | null;
  prefix: string;
  unit: string;
  icon: string;
  scale: number | null;
  important: boolean;
}

export interface AbilityUpgradeBonus {
  key: string;
  bonus: number;
  additive: boolean;
}

export interface HeroAbilityFull {
  slot: number;
  className: string;
  name: string;
  image: string;
  description: string;
  stats: AbilityStat[];
  upgrades: AbilityUpgradeBonus[][]; // índice 0 = T1, 1 = T2, 2 = T3
  tiers: string[];
}

function stripHtml(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function fetchHeroAbilitiesFull(
  heroId: number,
  heroItems?: Record<string, string>
): Promise<HeroAbilityFull[]> {
  try {
    const res = await fetch(
      `https://api.deadlock-api.com/v1/assets/items/by-hero-id/${heroId}?language=brazilian`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const result: HeroAbilityFull[] = [];
    for (let slot = 1; slot <= 4; slot++) {
      const className = heroItems?.[`signature${slot}`];
      const item = items.find((it: any) => it.class_name === className);
      if (!item) continue;

      const upgrades: AbilityUpgradeBonus[][] = (item.upgrades ?? [])
        .slice(0, 3)
        .map((u: any) =>
          (u.property_upgrades ?? []).map((pu: any) => ({
            key: String(pu.name),
            bonus: toNum(pu.bonus) ?? 0,
            additive: !pu.upgrade_type || /add/i.test(String(pu.upgrade_type)),
          }))
        );
      const upgradedKeys = new Set(upgrades.flat().map((u) => u.key));

      const importantKeys = new Set<string>();
      for (const section of item.tooltip_details?.info_sections ?? []) {
        for (const block of section.properties_block ?? []) {
          for (const prop of block.properties ?? []) {
            if (prop.important_property) importantKeys.add(String(prop.important_property));
          }
        }
      }

      const stats: AbilityStat[] = Object.entries(item.properties ?? {})
        .map(([key, p]: [string, any]) => {
          const label = stripHtml(p.label);
          const base = toNum(p.value);
          if (!label || label.startsWith("#") || label.includes("_")) return null;
          if (base === null || base === -1) return null;
          if (base === 0 && !upgradedKeys.has(key)) return null;
          const unit =
            String(p.postfix ?? "").trim() ||
            (String(p.value).match(/[a-zA-Z%]+\s*$/)?.[0] ?? "").trim();
          return {
            key,
            label,
            base,
            prefix: String(p.prefix ?? ""),
            unit,
            icon: typeof p.icon === "string" ? p.icon : "",
            scale: toNum(p.scale_function?.stat_scale),
            important: importantKeys.has(key),
          };
        })
        .filter((s): s is AbilityStat => s !== null);

      const d = item.description ?? {};
      result.push({
        slot,
        className: item.class_name,
        name: item.name ?? item.class_name,
        image: item.image_webp || item.image || "",
        description: stripHtml(d.desc),
        stats,
        upgrades,
        tiers: [d.t1_desc, d.t2_desc, d.t3_desc].map(stripHtml),
      });
    }
    return result;
  } catch {
    return [];
  }
}