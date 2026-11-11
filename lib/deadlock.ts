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
  rgb?: [number, number, number] | null;
  tags?: string[];
}

function hexToRgb(hexStr?: string): [number, number, number] | null {
  if (!hexStr) return null;
  const clean = hexStr.replace("#", "").trim();
  const hex = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (hex.length !== 6 && hex.length !== 8) return null;
  const num = parseInt(hex.slice(0, 6), 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function colorLuminance([r, g, b]: [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export interface WikiHeroTheme {
  rgb: [number, number, number];
  tagBg: string;
  tagText: string;
}

let wikiColorsCache: { data: Record<string, WikiHeroTheme>; at: number } | null = null;

export async function fetchWikiColors(): Promise<Record<string, WikiHeroTheme>> {
  await connection();
  if (wikiColorsCache && Date.now() - wikiColorsCache.at < ASSETS_TTL) {
    return wikiColorsCache.data;
  }

  try {
    const res = await fetch(
      "https://deadlock.wiki/api.php?action=parse&page=Template:Infobox_hero/themes.css&prop=wikitext&format=json",
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return wikiColorsCache?.data ?? {};

    const data = await res.json();
    const css: string = data.parse?.wikitext?.["*"] || "";
    const map: Record<string, WikiHeroTheme> = {};

    const blocks = css.split(/\.infobox-h\./).slice(1);
    for (const b of blocks) {
      const key = b.split(/[\s,{]/)[0];
      if (!key) continue;

      const color2 = b.match(/--th-heroinfobox-color2:\s*([^;]+)/)?.[1]?.trim();
      const tagB = b.match(/--th-heroinfobox-tags-back:\s*([^;]+)/)?.[1]?.trim();
      const tagT = b.match(/--th-heroinfobox-tags-text:\s*([^;]+)/)?.[1]?.trim();

      const rgbB = hexToRgb(tagB);
      const rgbT = hexToRgb(tagT);
      const rgb2 = hexToRgb(color2);

      let chosenRgb = rgbB;
      if (!chosenRgb || colorLuminance(chosenRgb) < 35) {
        chosenRgb = rgbT && colorLuminance(rgbT) >= 35 ? rgbT : rgb2;
      }

      if (chosenRgb) {
        const bg = tagB || (rgbB ? `rgb(${rgbB.join(",")})` : `rgb(${chosenRgb.join(",")})`);
        const lumBg = rgbB ? colorLuminance(rgbB) : colorLuminance(chosenRgb);
        const text = tagT || (lumBg > 150 ? "#10130d" : "#f6ead2");

        map[key] = {
          rgb: chosenRgb,
          tagBg: bg,
          tagText: text,
        };
      }
    }

    wikiColorsCache = { data: map, at: Date.now() };
    return map;
  } catch (err) {
    console.error("Falha ao buscar cores da Wiki:", err);
    return wikiColorsCache?.data ?? {};
  }
}

export function extractColor(
  h: any,
  colorsMap?: Record<string, WikiHeroTheme>
): [number, number, number] | null {
  if (!h) return null;
  const className = typeof h.class_name === "string" ? h.class_name : "";
  const fromMap = colorsMap?.[className]?.rgb || wikiColorsCache?.data?.[className]?.rgb;
  if (fromMap) return fromMap;

  const c = h?.colors?.style;
  if (!Array.isArray(c) || c.length < 3) return null;
  const [r, g, b] = c.map(Number);
  return [r, g, b].every(Number.isFinite) ? [r, g, b] : null;
}

// Eleva proporcionalmente o brilho de tons escuros para o texto vibrar com nitidez sobre caixas pretas
export function ensureVibrantTextColor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  if (max < 205) {
    const factor = 215 / Math.max(max, 1);
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function extractHeroTheme(
  h: any,
  colorsMap?: Record<string, WikiHeroTheme>
): WikiHeroTheme {
  const className = typeof h?.class_name === "string" ? h.class_name : "";
  const theme = colorsMap?.[className] || wikiColorsCache?.data?.[className];
  if (theme) return theme;

  const rgb = extractColor(h, colorsMap) ?? [245, 158, 11];
  const lum = colorLuminance(rgb);
  return {
    rgb,
    tagBg: `rgb(${rgb.join(",")})`,
    tagText: lum > 150 ? "#10130d" : "#ffffff",
  };
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

export interface HeroBlurb {
  tags: string[];
}

let blurbsCache: { data: Record<number, HeroBlurb>; at: number } | null = null;

export async function fetchHeroBlurbs(): Promise<Record<number, HeroBlurb>> {
  await connection();
  if (blurbsCache && Date.now() - blurbsCache.at < ASSETS_TTL) {
    return blurbsCache.data;
  }

  try {
    const res = await fetch("https://api.deadlock-api.com/v1/assets/heroes?language=brazilian", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return blurbsCache?.data ?? {};

    const list: HeroAsset[] = await res.json();
    const map: Record<number, HeroBlurb> = {};
    for (const h of list) {
      map[h.id] = {
        tags: Array.isArray(h.tags)
          ? h.tags.filter((t: unknown): t is string => typeof t === "string").slice(0, 3)
          : [],
      };
    }

    blurbsCache = { data: map, at: Date.now() };
    return map;
  } catch (err) {
    console.error("Falha ao buscar tags dos heróis:", err);
    return blurbsCache?.data ?? {};
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

export interface AbilitySection {
  descriptionHtml?: string;
  groups: AbilityGroup[];
  basicKeys: string[];
}

export interface HeroAbilityFull {
  slot: number;
  className: string;
  name: string;
  image: string;
  description: string;
  descriptionHtml: string;
  stats: AbilityStat[];
  upgrades: AbilityUpgradeBonus[][];
  tiers: string[];
  tiersHtml: string[];
  importantKeys: string[];
  headerKeys: string[];
  basicKeys: string[];
  groups: AbilityGroup[];
  sections: AbilitySection[];
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

function sanitizeHtml(html: unknown): string {
  if (typeof html !== "string") return "";

  const cleaned = html
    .replace(/<svg[\s\S]*?<\/svg>\s*/gi, (m) => m.replace(/\s*\n\s*/g, ""))
    .replace(/<(?:key|binding|action|bound_key)[^>]*?(?:attack|fire|in_attack)[^>]*?\/?>|<\/(?:key|binding|action)>/gi, "<strong>Disparo</strong>");

  const safeClass = (attrs: string) =>
    (attrs.match(/class\s*=\s*"([^"]*)"/i)?.[1] ?? "").replace(/[^\w\- ]/g, "");
  const attr = (attrs: string, name: string) =>
    attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? "";

  const parsed = cleaned
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
      if (["key", "kbd", "binding"].includes(tag)) {
        return closing ? "</strong>" : "<strong>";
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

  // Pós-processamento após todas as tags terem sido limpas: preenche o buraco da ação omitida
  return parsed
    .replace(/&nbsp;/gi, " ")
    .replace(/\{s:[^}]+\}|%s\d*%|\[key_[^\]]+\]/gi, "<strong>Disparo</strong>")
    .replace(/(pressione|press)\b(?:\s*<[^>]*>|[^a-zA-Z0-9À-ÿ]|attack|fire|\+attack){1,200}?\b(para|to)\b/gi, "$1 <strong>Disparo</strong> $2")
    .replace(/\s{2,}/g, " ");
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

      // Processa seções detalhadas da habilidade (preservando textos secundários e caixas agrupadas)
      const sections: AbilitySection[] = [];
      const groups: AbilityGroup[] = [];
      const basicKeys: string[] = [];

      for (const section of item.tooltip_details?.info_sections ?? []) {
        const secGroups: AbilityGroup[] = [];
        const secBasicKeys: string[] = [];

        for (const block of section.properties_block ?? []) {
          const props: AbilityPropRef[] = [];
          for (const prop of block.properties ?? []) {
            const key = String(prop.important_property || prop.key || prop.name || "");
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
          if (props.length > 0) {
            const grp = { label: stripHtml(block.loc_string), props };
            secGroups.push(grp);
            groups.push(grp);
          }
        }

        // Se uma propriedade listada em basic_properties tiver escalonamento numérico (ex.: Dano do Raio com x0.5),
        // promove para caixa destacada da seção com estilo e badge de espírito/arma
        const promotedProps: AbilityPropRef[] = [];
        for (const k of section.basic_properties ?? []) {
          const keyStr = String(k);
          const propData = item.properties?.[keyStr];
          const hasScale = propData?.scale_function && toNum(propData.scale_function.stat_scale) !== null;

          if (hasScale) {
            promotedProps.push({
              key: keyStr,
              valueKey: "",
              statusName: "",
              icon: typeof propData?.icon === "string" ? propData.icon : "",
            });
          } else {
            if (keyStr && !basicKeys.includes(keyStr)) basicKeys.push(keyStr);
            if (keyStr && !secBasicKeys.includes(keyStr)) secBasicKeys.push(keyStr);
          }
        }

        if (promotedProps.length > 0) {
          const grp = { label: "", props: promotedProps };
          secGroups.push(grp);
          groups.push(grp);
        }

        const secDescHtml = sanitizeHtml(section.loc_string);
        sections.push({
          descriptionHtml: secDescHtml,
          groups: secGroups,
          basicKeys: secBasicKeys,
        });
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
        sections,
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
  falloffStart: number | null;
  falloffEnd: number | null;
}

const UNITS_PER_METER = 39.37;

function unitsToMeters(v: unknown): number | null {
  const n = toNum(v);
  return n === null ? null : n / UNITS_PER_METER;
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
      falloffStart: unitsToMeters(i.damage_falloff_start_range),
      falloffEnd: unitsToMeters(i.damage_falloff_end_range),
    };
  } catch {
    return null;
  }
}

export interface PopularItem {
  className: string;
  name: string;
  image: string | null;
  pickPct: number;
}

export interface HeroBuild {
  updatedAt: number | null;
  early: PopularItem[];
  mid: PopularItem[];
  late: PopularItem[];
}

const ITEMS_PER_PHASE = 4;

// A lista de heróis só traz o class_name dos itens; nome e ícone vêm de /items/{class_name}
export async function fetchHeroBuild(popular: any): Promise<HeroBuild | null> {
  if (!popular || typeof popular !== "object") return null;

  const top = (list: unknown) =>
    (Array.isArray(list) ? list : [])
      .map((i: any) => ({ className: i?.class_name, pickPct: toNum(i?.pick_pct) }))
      .filter(
        (i): i is { className: string; pickPct: number } =>
          typeof i.className === "string" && i.pickPct !== null,
      )
      .sort((a, b) => b.pickPct - a.pickPct)
      .slice(0, ITEMS_PER_PHASE);

  const picks = {
    early: top(popular.early_game),
    mid: top(popular.mid_game),
    late: top(popular.late_game),
  };
  const classNames = Array.from(
    new Set([...picks.early, ...picks.mid, ...picks.late].map((p) => p.className)),
  );
  if (classNames.length === 0) return null;

  const details = new Map<string, { name: string; image: string | null }>();
  await Promise.all(
    classNames.map(async (className) => {
      try {
        const res = await fetch(
          `https://api.deadlock-api.com/v1/assets/items/${encodeURIComponent(className)}?language=brazilian`,
          { headers: { Accept: "application/json" }, next: { revalidate: 86400 } },
        );
        if (!res.ok) return;
        const item = await res.json();
        if (typeof item?.name !== "string") return;
        details.set(className, {
          name: item.name,
          image: typeof item.shop_image_webp === "string" ? item.shop_image_webp : null,
        });
      } catch {
        return;
      }
    }),
  );

  const resolve = (list: { className: string; pickPct: number }[]): PopularItem[] =>
    list.flatMap((p) => {
      const d = details.get(p.className);
      return d ? [{ className: p.className, pickPct: p.pickPct, ...d }] : [];
    });

  return {
    updatedAt: toNum(popular.timestamp),
    early: resolve(picks.early),
    mid: resolve(picks.mid),
    late: resolve(picks.late),
  };
}export type ItemSlot = "weapon" | "vitality" | "spirit";

export interface ItemTipStat {
  label: string;
  value: string;
  icon: string;
  tone: "elevated" | "important" | "basic";
}

export interface ItemTipSection {
  kind: string;
  html: string;
  stats: ItemTipStat[];
}

export interface ItemComponent {
  name: string;
  image: string | null;
}

export interface ShopItem {
  className: string;
  name: string;
  image: string | null;
  slot: ItemSlot;
  tier: number;
  cost: number;
  isActive: boolean;
  isImbue: boolean;
  sortName: string;
  descriptionHtml: string;
  sections: ItemTipSection[];
  components: ItemComponent[];
}

const numberPt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function formatItemProp(p: any): string {
  const raw = String(p?.value ?? "");
  const num = parseFloat(raw);
  if (Number.isNaN(num) || num === 0) return "";
  const sign = p.prefix === "-" ? "-" : /sign/.test(String(p.prefix ?? "")) && num > 0 ? "+" : "";
  const postfix = (
    typeof p.postfix === "string" && p.postfix !== "" ? p.postfix : (raw.match(/[a-zA-Z%]+\s*$/)?.[0] ?? "")
  ).replace(/^\s+(?=%)/, "");
  return `${sign}${numberPt.format(sign === "-" ? Math.abs(num) : num)}${postfix}`;
}

function buildItemSections(item: any): ItemTipSection[] {
  const props = item?.properties ?? {};
  const stat = (key: unknown, tone: ItemTipStat["tone"]): ItemTipStat[] => {
    const p = props[String(key)];
    const value = p ? formatItemProp(p) : "";
    const label = stripHtml(p?.label);
    if (!value || !label) return [];
    const icon = typeof p.icon === "string" && p.icon.startsWith(ALLOWED_IMG_PREFIX) ? p.icon : "";
    return [{ label, value, icon, tone }];
  };

  const sections: ItemTipSection[] = [];
  for (const sec of item?.tooltip_sections ?? []) {
    const stats: ItemTipStat[] = [];
    let html = "";
    for (const attr of sec?.section_attributes ?? []) {
      if (!html && typeof attr?.loc_string === "string") html = sanitizeHtml(attr.loc_string);
      for (const k of attr?.elevated_properties ?? []) stats.push(...stat(k, "elevated"));
      for (const k of attr?.important_properties ?? []) stats.push(...stat(k, "important"));
      for (const k of attr?.properties ?? []) stats.push(...stat(k, "basic"));
    }
    if (html || stats.length > 0) sections.push({ kind: String(sec?.section_type ?? ""), html, stats });
  }
  return sections;
}

const ITEM_SLOTS: ItemSlot[] = ["weapon", "vitality", "spirit"];
let shopItemsCache: { data: ShopItem[]; at: number } | null = null;

// Resposta grande (>2 MB): fica fora do cache de fetch do Next, como a lista de heróis
export async function fetchShopItems(): Promise<ShopItem[]> {
  await connection();
  if (shopItemsCache && Date.now() - shopItemsCache.at < ASSETS_TTL) {
    return shopItemsCache.data;
  }

  try {
    const [res, resEn] = await Promise.all([
      fetch("https://api.deadlock-api.com/v1/assets/items?language=brazilian", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetch("https://api.deadlock-api.com/v1/assets/items", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null),
    ]);
    if (!res.ok) return shopItemsCache?.data ?? [];

    const raw: any[] = await res.json();

    // O jogo ordena a loja pelo nome em inglês; sem ele, cai no nome em português
    const namesEn = new Map<string, string>();
    if (resEn?.ok) {
      const rawEn: any[] = await resEn.json();
      for (const e of rawEn) {
        if (typeof e?.class_name === "string" && typeof e?.name === "string") namesEn.set(e.class_name, e.name);
      }
    }

    const byClass = new Map<string, any>(
      raw.filter((r) => typeof r?.class_name === "string").map((r): [string, any] => [r.class_name, r]),
    );

    const items = raw.flatMap((i): ShopItem[] => {
      const slot = ITEM_SLOTS.find((s) => s === i?.item_slot_type);
      const tier = toNum(i?.item_tier);
      const cost = toNum(i?.cost);
      if (
        i?.type !== "upgrade" ||
        i?.shopable === false ||
        !slot ||
        tier === null ||
        cost === null ||
        typeof i?.name !== "string" ||
        typeof i?.class_name !== "string"
      ) {
        return [];
      }
      const image =
        typeof i.shop_image_webp === "string"
          ? i.shop_image_webp
          : typeof i.image_webp === "string"
            ? i.image_webp
            : null;
      return [
        {
          className: i.class_name,
          name: i.name,
          image,
          slot,
          tier,
          cost,
          isActive: i.is_active_item === true,
          isImbue: typeof i.imbue === "string" && i.imbue !== "",
          sortName: namesEn.get(i.class_name) ?? i.name,
          descriptionHtml: sanitizeHtml(i.description?.desc),
          sections: buildItemSections(i),
          components: (Array.isArray(i.component_items) ? i.component_items : []).flatMap((c: unknown) => {
            const ci = byClass.get(String(c));
            if (typeof ci?.name !== "string") return [];
            const img = ci.shop_image_webp ?? ci.image_webp;
            return [{ name: ci.name, image: typeof img === "string" ? img : null }];
          }),
        },
      ];
    });

    shopItemsCache = { data: items, at: Date.now() };
    return items;
  } catch (err) {
    console.error("❌ Falha ao buscar itens:", err);
    return shopItemsCache?.data ?? [];
  }
}

export interface PatchWinRatePoint {
  patchId: string;
  label: string;
  dateLabel: string;
  winRate: number;
  matches: number;
  delta: number | null;
}

// Coleta o desempenho do herói ao longo dos últimos patches cronológicos
export async function fetchHeroPatchHistory(heroId: number, count = 6): Promise<PatchWinRatePoint[]> {
  const patchesWithSince = PATCHES.filter((p) => typeof p.since === "number").slice(0, count);
  if (patchesWithSince.length === 0) return [];

  const results = await Promise.all(
    patchesWithSince.map(async (patch, idx) => {
      const until = idx > 0 ? patchesWithSince[idx - 1].since : undefined;
      const stats = await fetchHeroesAnalytics(patch.since, until);
      const stat = stats.find((s) => s.hero_id === heroId);
      const matches = stat?.matches || 0;
      const wins = stat?.wins ?? Math.round((matches * (stat?.win_rate ?? 50)) / 100);
      const winRate = stat?.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);

      const dateMatch = patch.label.match(/\((\d{2}\/\d{2})/);
      const dateLabel = dateMatch ? dateMatch[1] : patch.id.replace("minor-", "").replace("update-", "");

      return {
        patchId: patch.id,
        label: patch.label,
        dateLabel,
        winRate: Number(winRate.toFixed(2)),
        matches,
      };
    })
  );

  const chronological = results.reverse().filter((r) => r.matches > 0);

  return chronological.map((point, i) => {
    const prev = i > 0 ? chronological[i - 1] : null;
    const delta = prev ? Number((point.winRate - prev.winRate).toFixed(2)) : null;
    return {
      ...point,
      delta,
    };
  });
}