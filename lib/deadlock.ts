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
    const res = await fetch(`https://api.deadlock-api.com/v1/assets/heroes/${heroId}?language=brazilian`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
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

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export type ScaleType = "spirit" | "weapon" | "vitality" | "other" | null;

export interface AbilityStat {
  key: string;
  label: string;
  postLabel: string;
  base: number | null;
  prefix: string;
  unit: string;
  icon: string;
  scale: number | null;
  scaleType: ScaleType;
  important: boolean;
}

export interface AbilityUpgradeBonus {
  key: string;
  bonus: number;
  additive: boolean;
}

export interface AbilityPropRef {
  key: string;
  valueKey: string; // propriedade com o valor, quando é efeito de status (ex.: StunDuration)
  statusName: string; // nome do efeito (ex.: "Atordoa")
  icon: string;
}

export interface AbilityGroup {
  label: string; // ex.: "Ao atingir inimigos:"
  props: AbilityPropRef[];
}

export interface HeroAbilityFull {
  slot: number;
  className: string;
  name: string;
  image: string;
  description: string;
  descriptionHtml: string;
  stats: AbilityStat[];
  upgrades: AbilityUpgradeBonus[][]; // índice 0 = T1, 1 = T2, 2 = T3
  tiers: string[];
  tiersHtml: string[];
  importantKeys: string[];
  headerKeys: string[];
  basicKeys: string[];
  groups: AbilityGroup[];
}

function stripHtml(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALLOWED_IMG_PREFIX = "https://assets-bucket.deadlock-api.com/";
const SVG_FILL = /^(#[0-9a-fA-F]{3,8}|white|none|currentColor)$/i;

// Deixa passar só o HTML que a API usa nas descrições (negrito, itálico, spans
// coloridos, ícones <img> e ícones <svg> inline). Todo o resto é descartado.
function sanitizeHtml(html: unknown): string {
  if (typeof html !== "string") return "";

  // Os "\n" soltos vêm só de dentro/ao redor dos <svg>; as quebras reais são <br>.
  const cleaned = html.replace(/<svg[\s\S]*?<\/svg>\s*/gi, (m) =>
    m.replace(/\s*\n\s*/g, "")
  );

  const safeClass = (attrs: string) =>
    (attrs.match(/class\s*=\s*"([^"]*)"/i)?.[1] ?? "").replace(/[^\w\- ]/g, "");
  const attr = (attrs: string, name: string) =>
    attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? "";

  return cleaned
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (!part.startsWith("<") || !part.endsWith(">")) {
        return part.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      const m = part.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>$/);
      if (!m) return "";
      const closing = m[1] === "/";
      const tag = m[2].toLowerCase();
      const attrs = m[3];

      if (["b", "i", "em", "strong"].includes(tag)) {
        return closing ? `</${tag}>` : `<${tag}>`;
      }
      if (tag === "br") return closing ? "" : "<br/>";
      if (tag === "span") {
        if (closing) return "</span>";
        const cls = safeClass(attrs);
        const color = attrs.match(
          /style\s*=\s*"[^"]*?color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))/i
        )?.[1];
        return `<span${cls ? ` class="${cls}"` : ""}${color ? ` style="color:${color}"` : ""}>`;
      }
      if (tag === "svg") {
        if (closing) return "</svg>";
        const fill = attr(attrs, "fill");
        const viewBox = attr(attrs, "viewBox");
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${
          /^[\d\s.\-]+$/.test(viewBox) ? viewBox : "0 0 128 128"
        }" fill="${SVG_FILL.test(fill) ? fill : "white"}" style="display:inline-block;width:1.15em;height:1.15em;vertical-align:-0.25em;margin:0 0.1em">`;
      }
      if (tag === "path" && !closing) {
        const d = attr(attrs, "d");
        if (!/^[\dMmLlHhVvCcSsQqTtAaZz.,\-\s]+$/.test(d)) return "";
        const fill = attr(attrs, "fill");
        const rule = attr(attrs, "fill-rule");
        const clip = attr(attrs, "clip-rule");
        return `<path d="${d}"${SVG_FILL.test(fill) ? ` fill="${fill}"` : ""}${
          /^(evenodd|nonzero)$/.test(rule) ? ` fill-rule="${rule}"` : ""
        }${/^(evenodd|nonzero)$/.test(clip) ? ` clip-rule="${clip}"` : ""}/>`;
      }
      if ((tag === "img" || tag === "object") && !closing) {
        const src = attrs.match(/(?:src|data)\s*=\s*"([^"]*)"/i)?.[1] ?? "";
        if (!src.startsWith(ALLOWED_IMG_PREFIX) || /["<>\s]/.test(src)) return "";
        const alt = (attrs.match(/alt\s*=\s*"([^"]*)"/i)?.[1] ?? "").replace(/[<>"&]/g, "");
        return `<img src="${src}" class="${safeClass(attrs)}" alt="${alt}" style="display:inline-block;height:1.15em;width:auto;max-width:3em;vertical-align:-0.25em;margin:0 0.1em" onerror="this.style.display='none'"/>`;
      }
      return "";
    })
    .join("");
}

function scaleTypeOf(sf: any): ScaleType {
  if (!sf) return null;
  const scale = toNum(sf.stat_scale);
  if (!scale || scale <= 0) return null;

  const names = [
    sf.specific_stat_scale_type,
    ...(Array.isArray(sf.scaling_stats) ? sf.scaling_stats : []),
  ]
    .filter(Boolean)
    .map(String);
  if (names.some((n) => /WeaponPower|BulletDamage/i.test(n))) return "weapon";
  if (names.some((n) => /MaxHealth/i.test(n))) return "vitality";

  // dano, cura e barreira com escala de espírito: às vezes a API manda só o nome da função
  const cls = String(sf.class_name ?? "");
  if (names.some((n) => /TechPower/i.test(n)) || /tech|spirit/i.test(cls)) return "spirit";
  return "other";
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
      if (!className) continue;
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

      // Grupos de caixas ("Ao atingir inimigos:", etc.) e linha de propriedades básicas
      const groups: AbilityGroup[] = [];
      const basicKeys: string[] = [];
      for (const section of item.tooltip_details?.info_sections ?? []) {
        for (const block of section.properties_block ?? []) {
          const props: AbilityPropRef[] = [];
          for (const prop of block.properties ?? []) {
            const key = prop.important_property ? String(prop.important_property) : "";
            if (!key) continue;
            const valueKey = prop.status_effect_value ? String(prop.status_effect_value) : "";
            props.push({
              key,
              valueKey,
              statusName: valueKey ? stripHtml(prop.status_effect_name) : "",
              icon:
                valueKey && typeof prop.important_property_icon === "string"
                  ? prop.important_property_icon
                  : "",
            });
          }
          if (props.length > 0) groups.push({ label: stripHtml(block.loc_string), props });
        }
        for (const k of section.basic_properties ?? []) {
          if (k && !basicKeys.includes(String(k))) basicKeys.push(String(k));
        }
      }
      const importantKeys = groups.flatMap((g) => g.props.map((p) => p.valueKey || p.key));
      const headerKeys: string[] = (item.tooltip_details?.additional_header_properties ?? []).map(
        String
      );

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
            postLabel: stripHtml(p.postvalue_label),
            base,
            prefix: String(p.prefix ?? ""),
            unit,
            icon: typeof p.icon === "string" ? p.icon : "",
            scale: toNum(p.scale_function?.stat_scale),
            scaleType: scaleTypeOf(p.scale_function),
            important: importantKeys.includes(key),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const d = item.description ?? {};
      const tierDescs = [d.t1_desc, d.t2_desc, d.t3_desc];
      result.push({
        slot,
        className: item.class_name,
        name: item.name ?? item.class_name,
        image: item.image_webp || item.image || "",
        description: stripHtml(d.desc),
        descriptionHtml: sanitizeHtml(d.desc),
        stats,
        upgrades,
        tiers: tierDescs.map(stripHtml),
        tiersHtml: tierDescs.map(sanitizeHtml),
        importantKeys,
        headerKeys,
        basicKeys,
        groups,
      });
    }
    return result;
  } catch {
    return [];
  }
}

export interface HeroWeapon {
  name: string;
  bulletDamage: number;
  bullets: number;
  clipSize: number;
  reloadDuration: number;
  bulletsPerSecond: number;
  damagePerSecond: number;
}

// Busca os dados da arma principal (a lista de armas é a mesma para todos os heróis)
export async function fetchHeroWeapon(className?: string): Promise<HeroWeapon | null> {
  if (!className) return null;
  try {
    const res = await fetch("https://api.deadlock-api.com/v1/assets/items/by-type/weapon", {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list)) return null;

    const w = list.find((x: any) => x.class_name === className);
    const i = w?.weapon_info;
    if (!i) return null;

    const bulletDamage = toNum(i.bullet_damage);
    const clipSize = toNum(i.clip_size);
    const reloadDuration = toNum(i.reload_duration);
    const bulletsPerSecond = toNum(i.bullets_per_second);
    const damagePerSecond = toNum(i.damage_per_second);
    if (
      bulletDamage === null ||
      clipSize === null ||
      reloadDuration === null ||
      bulletsPerSecond === null ||
      damagePerSecond === null
    ) {
      return null;
    }

    return {
      name: typeof w.name === "string" && !w.name.startsWith("citadel_weapon") ? w.name : "",
      bulletDamage,
      bullets: toNum(i.bullets) ?? 1,
      clipSize,
      reloadDuration,
      bulletsPerSecond,
      damagePerSecond,
    };
  } catch {
    return null;
  }
}