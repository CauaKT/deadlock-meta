/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/deadlock.ts

import { connection } from "next/server";
import {
  DEADLOCK_DATA_CONFIG,
  DEFAULT_RANK_ID,
  DEFAULT_TIER_METRIC,
  MIN_HERO_MATCHES,
  PATCHES,
  PATCH_HISTORY_LIMIT,
  PATCH_TITLE_REGEX,
  RANK_FILTERS,
  SAMPLE_THRESHOLDS,
  TIER_BADGE_STYLES,
  TIER_METRIC_OPTIONS,
  TIER_THRESHOLDS,
  META_SCORE_LABELS,
  META_SCORE_WEIGHTS,
  TIER_THRESHOLDS_BY_METRIC,
  assignTiersByRank,
  calculateTier,
  calculateTierForMetric,
  computeMetaScoreBreakdowns,
  computeMetaScores,
  getDefaultRank,
  isPlayableHero,
  minMatchesForRank,
  resolveHeroMedia,
  resolvePatchWindow,
  resolveRankFilter,
  resolveTierMetric,
  type MetaScoreBreakdownItem,
  type MetaScoreInput,
  type MetaScoreResult,
  type MetaScoreStatKey,
  type Patch,
  type RankFilterOption,
  type TierMetricId,
  type TierMetricOption,
} from "@/lib/data/config";

export {
  DEADLOCK_DATA_CONFIG,
  DEFAULT_RANK_ID,
  DEFAULT_TIER_METRIC,
  META_SCORE_LABELS,
  META_SCORE_WEIGHTS,
  MIN_HERO_MATCHES,
  PATCHES,
  PATCH_HISTORY_LIMIT,
  RANK_FILTERS,
  SAMPLE_THRESHOLDS,
  TIER_BADGE_STYLES,
  TIER_METRIC_OPTIONS,
  TIER_THRESHOLDS,
  TIER_THRESHOLDS_BY_METRIC,
  assignTiersByRank,
  calculateTier,
  calculateTierForMetric,
  computeMetaScoreBreakdowns,
  computeMetaScores,
  getDefaultRank,
  isPlayableHero,
  minMatchesForRank,
  resolveHeroMedia,
  resolvePatchWindow,
  resolveRankFilter,
  resolveTierMetric,
  type MetaScoreBreakdownItem,
  type MetaScoreInput,
  type MetaScoreResult,
  type MetaScoreStatKey,
  type Patch,
  type RankFilterOption,
  type TierMetricId,
  type TierMetricOption,
};

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

export interface HeroBanAnalytics {
  hero_id: number;
  bans: number;
  matches: number;
  bucket?: number;
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
  pickRate?: number;
  bans?: number;
  banRate?: number;
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
  titleColor?: string;
  panelColor?: string;
}

export type WikiHeroChangeKind = "buff" | "nerf" | "adj" | "fix" | "new";

export interface WikiPatchClassification {
  dateIso: string;
  undocumented: boolean;
  buffs: string[];
  nerfs: string[];
  adjs: string[];
  fixes: string[];
  newHeroes: string[];
}

const WIKI_MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function parseWikiHeroList(raw: string | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{\s*HeroIcon\s*\|\s*([^}|]+)[^}]*\}\}/gi, "$1")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1");
  return cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseWikiUpdateDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/\b([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (!m) return null;
  const month = WIKI_MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = m[2].padStart(2, "0");
  return `${m[3]}-${month}-${day}`;
}

function splitWikiTemplateParams(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts: string[] = [];
  let braceDepth = 0;
  let bracketDepth = 0;
  let start = 0;

  for (let i = 0; i < body.length; i += 1) {
    if (body.startsWith("{{", i)) {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (body.startsWith("}}", i)) {
      braceDepth = Math.max(0, braceDepth - 1);
      i += 1;
      continue;
    }
    if (body.startsWith("[[", i)) {
      bracketDepth += 1;
      i += 1;
      continue;
    }
    if (body.startsWith("]]", i)) {
      bracketDepth = Math.max(0, bracketDepth - 1);
      i += 1;
      continue;
    }
    if (braceDepth === 0 && bracketDepth === 0 && body[i] === "|") {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const val = part.slice(eqIdx + 1).trim();
    if (key) params[key] = val;
  }
  return params;
}

let wikiUpdatesCache: { data: WikiPatchClassification[]; at: number } | null = null;
const WIKI_UPDATES_TTL = 3_600_000;

export async function fetchWikiPatchUpdates(): Promise<WikiPatchClassification[]> {
  await connection();
  if (wikiUpdatesCache && Date.now() - wikiUpdatesCache.at < WIKI_UPDATES_TTL) {
    return wikiUpdatesCache.data;
  }

  try {
    const res = await fetch(
      "https://deadlock.wiki/api.php?action=parse&page=Updates&prop=wikitext&format=json",
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return wikiUpdatesCache?.data ?? [];

    const data = await res.json();
    const wt: string = data?.parse?.wikitext?.["*"] || "";
    const rows: WikiPatchClassification[] = [];
    const opener = /\{\{Update[_ ]row\b/gi;
    let match = opener.exec(wt);

    while (match !== null) {
      let depth = 1;
      let cursor = match.index + 2;
      while (cursor < wt.length && depth > 0) {
        if (wt.startsWith("{{", cursor)) {
          depth += 1;
          cursor += 2;
        } else if (wt.startsWith("}}", cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }

      const rawTemplate = wt.slice(match.index + match[0].length, Math.max(match.index + match[0].length, cursor - 2));
      const params = splitWikiTemplateParams(rawTemplate);
      const dateIso = parseWikiUpdateDate(params.date);
      if (dateIso) {
        const buffs = parseWikiHeroList(params.buffs);
        const nerfs = parseWikiHeroList(params.nerfs);
        const adjs = parseWikiHeroList(params.adjs);
        const fixes = parseWikiHeroList(params.fixes);
        const newHeroes = parseWikiHeroList(params.new);
        const undocumented = /\{\{\s*Undocumented\s*\}\}/i.test(params.summary ?? "");

        rows.push({
          dateIso,
          undocumented,
          buffs,
          nerfs,
          adjs,
          fixes,
          newHeroes,
        });
      }

      opener.lastIndex = cursor;
      match = opener.exec(wt);
    }

    wikiUpdatesCache = { data: rows, at: Date.now() };
    return rows;
  } catch {
    return wikiUpdatesCache?.data ?? [];
  }
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

      const color1 = b.match(/--th-heroinfobox-color1:\s*([^;]+)/)?.[1]?.trim();
      const color2 = b.match(/--th-heroinfobox-color2:\s*([^;]+)/)?.[1]?.trim();
      const tagB = b.match(/--th-heroinfobox-tags-back:\s*([^;]+)/)?.[1]?.trim();
      const tagT = b.match(/--th-heroinfobox-tags-text:\s*([^;]+)/)?.[1]?.trim();
      const textTitle = b.match(/--th-heroinfobox-text-title:\s*([^;]+)/)?.[1]?.trim();

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
          titleColor: textTitle || undefined,
          panelColor: color1 || undefined,
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

let selectVoicesCache: { data: Record<string, string[]>; at: number } | null = null;

function collectVoiceUrls(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === "string") {
      if ((/_select_\d+/i.test(k) || /_select_\d+/i.test(v)) && v.startsWith("https://")) {
        out.push(v);
      }
    } else if (v && typeof v === "object") {
      collectVoiceUrls(v, out);
    }
  }
}

// Payload completo >18 MB: mantém em cache de 24h apenas o mapa leve de falas de seleção por herói
export async function fetchHeroSelectVoiceLines(): Promise<Record<string, string[]>> {
  await connection();
  if (selectVoicesCache && Date.now() - selectVoicesCache.at < ASSETS_TTL) {
    return selectVoicesCache.data;
  }

  try {
    const res = await fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/assets/sounds`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return selectVoicesCache?.data ?? {};

    const json = (await res.json()) as { vo?: Record<string, unknown> };
    const map: Record<string, string[]> = {};
    for (const [heroKey, group] of Object.entries(json?.vo ?? {})) {
      const urls: string[] = [];
      collectVoiceUrls(group, urls);
      if (urls.length > 0) {
        map[heroKey] = Array.from(new Set(urls)).sort().slice(0, 6);
      }
    }

    selectVoicesCache = { data: map, at: Date.now() };
    return map;
  } catch {
    return selectVoicesCache?.data ?? {};
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

export function getPlayableHeroes(heroesMap: Record<number, HeroAsset>): HeroAsset[] {
  return Object.values(heroesMap)
    .filter((h) => isPlayableHero(h))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function computeHeroMatchStats(stat?: HeroAnalytics) {
  const matches = stat?.matches || 0;
  const wins = stat?.wins ?? Math.round((matches * (stat?.win_rate ?? 50)) / 100);
  const losses = stat?.losses ?? (matches - wins);
  const winRate = stat?.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);
  return { matches, wins, losses, winRate };
}

function formatSteamPatch(unixSec: number, rawTitle: string): { id: string; label: string } {
  const mdy = rawTitle.match(/(\d{2})-(\d{2})-(\d{4})/);
  let dateLabel: string;
  let isoKey: string;

  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    dateLabel = `${dd}/${mm}/${yyyy}`;
    isoKey = `${yyyy}-${mm}-${dd}`;
  } else {
    const d = new Date(unixSec * 1000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    dateLabel = `${dd}/${mm}/${yyyy}`;
    isoKey = `${yyyy}-${mm}-${dd}`;
  }

  let cleanName = rawTitle
    .replace(/\s*-\s*\d{2}-\d{2}-\d{4}\s*/g, " ")
    .replace(/^\d{2}-\d{2}-\d{4}\s*Update$/i, "Minor Update")
    .replace(/\b20\d{2}\b\s*\+\s*/g, "+ ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^halloween \+ gameplay update$/i.test(cleanName)) {
    cleanName = "Halloween + Gameplay";
  } else if (/^ranked\s*-\s*beta season/i.test(cleanName)) {
    cleanName = cleanName.replace(/\s*-\s*/, " ");
  } else if (!cleanName) {
    cleanName = "Minor Update";
  }

  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

  return {
    id: `${slug || "patch"}-${isoKey}`,
    label: `${dateLabel} - ${cleanName}`,
  };
}

export async function fetchPatches(): Promise<Patch[]> {
  try {
    const res = await fetch(DEADLOCK_DATA_CONFIG.steamNewsUrl, {
      next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.patchesSeconds },
    });
    if (!res.ok) return PATCHES;
    const json = (await res.json()) as {
      appnews?: { newsitems?: Array<{ title?: string; date?: number }> };
    };
    const items = json?.appnews?.newsitems;
    if (!Array.isArray(items) || items.length === 0) return PATCHES;

    const merged: Patch[] = [...PATCHES];
    const ONE_DAY = 86400;

    for (const item of items) {
      const title = item.title?.trim() ?? "";
      const date = Number(item.date ?? 0);
      if (!title || !Number.isFinite(date) || date <= 0) continue;
      if (!PATCH_TITLE_REGEX.test(title)) continue;

      const tooClose = merged.some(
        (existing) => typeof existing.since === "number" && Math.abs(existing.since - date) < ONE_DAY,
      );
      if (tooClose) continue;

      const formatted = formatSteamPatch(date, title);
      merged.push({ id: formatted.id, label: formatted.label, since: date });
    }

    return merged.sort((a, b) => (b.since ?? 0) - (a.since ?? 0));
  } catch {
    return PATCHES;
  }
}

export async function resolveActivePatches(options?: {
  rankTier?: number;
  minAverageBadge?: number;
}): Promise<{
  allPatches: Patch[];
  patches: Patch[];
  readyPatches: Patch[];
  firstReadyIndex: number;
}> {
  const allPatches = await fetchPatches();
  if (allPatches.length <= 1) {
    return { allPatches, patches: allPatches, readyPatches: allPatches, firstReadyIndex: 0 };
  }

  const defaultRank = getDefaultRank();
  const rankTier = options?.rankTier ?? defaultRank.tier;
  const minBadge = options?.rankTier !== undefined ? options.minAverageBadge : defaultRank.minBadge;
  const minHeroMatches = minMatchesForRank(rankTier);
  const minTotalGames =
    rankTier >= SAMPLE_THRESHOLDS.heroHighRankTier
      ? SAMPLE_THRESHOLDS.patchReadyHighRankMinGames
      : SAMPLE_THRESHOLDS.patchReadyMinGames;
  const maxProbe = Math.min(allPatches.length - 1, SAMPLE_THRESHOLDS.patchReadyMaxProbeCount);

  for (let i = 0; i < maxProbe; i++) {
    const candidate = allPatches[i];
    const until = i > 0 ? allPatches[i - 1].since : undefined;
    const stats = await fetchHeroesAnalytics(candidate.since, until, minBadge);
    const totalGames = stats.reduce((sum, s) => sum + (s.matches || 0), 0) / 12;
    const qualifiedHeroes = stats.filter((s) => (s.matches || 0) >= minHeroMatches).length;

    if (
      totalGames >= minTotalGames &&
      qualifiedHeroes >= SAMPLE_THRESHOLDS.patchReadyMinQualifiedHeroes
    ) {
      return {
        allPatches,
        patches: allPatches,
        readyPatches: allPatches.slice(i),
        firstReadyIndex: i,
      };
    }
  }

  return { allPatches, patches: allPatches, readyPatches: allPatches, firstReadyIndex: 0 };
}

export interface OfficialPatchNote {
  title: string;
  pub_date: string;
  link: string;
}

export async function fetchOfficialPatchNotes(limit = 4): Promise<OfficialPatchNote[]> {
  try {
    const res = await fetch(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v2/patches`, {
      next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.patchesSeconds },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as OfficialPatchNote[];
    return Array.isArray(data) ? data.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export type PatchNoteInline =
  | { type: "text"; text: string; bold?: boolean; italic?: boolean; underline?: boolean }
  | { type: "link"; text: string; href: string; bold?: boolean; italic?: boolean };

export type PatchNoteBlock =
  | { type: "section"; id: string; title: string }
  | { type: "heading"; text: string }
  | { type: "divider" }
  | { type: "image"; src: string; alt: string; href?: string }
  | { type: "bullet"; runs: PatchNoteInline[]; nested?: boolean }
  | { type: "paragraph"; runs: PatchNoteInline[] };

export interface SteamPatchNote {
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  unixTimestamp: number;
  url: string;
  category: "balance" | "feature";
  heroImage: string | null;
  blocks: PatchNoteBlock[];
  plainText: string;
}

const ALLOWED_IMG_PREFIX = "https://assets-bucket.deadlock-api.com/";
const STEAM_CLAN_IMAGE_BASE = "https://clan.fastly.steamstatic.com/images";
const ALLOWED_PATCH_IMG_PREFIXES = [
  "https://clan.fastly.steamstatic.com/images/",
  "https://clan.akamai.steamstatic.com/images/",
  "https://shared.fastly.steamstatic.com/",
  ALLOWED_IMG_PREFIX,
];

function sanitizeExternalHref(raw: string): string | null {
  let cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (cleaned.startsWith("https://steamcommunity.com/linkfilter/")) {
    try {
      const target = new URL(cleaned).searchParams.get("u");
      if (target) cleaned = target;
    } catch {
      return null;
    }
  }
  return /^https?:\/\/[^\s<>"']+$/i.test(cleaned) ? cleaned : null;
}

function sanitizePatchImageUrl(raw: string): string | null {
  const expanded = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\{STEAM_CLAN_LOC_IMAGE\}|\{STEAM_CLAN_IMAGE\}/g, STEAM_CLAN_IMAGE_BASE);
  if (/["<>\s]/.test(expanded)) return null;
  return ALLOWED_PATCH_IMG_PREFIXES.some((prefix) => expanded.startsWith(prefix))
    ? expanded
    : null;
}

function decodePatchEntities(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]");
}

function stripInlineTags(raw: string): string {
  return decodePatchEntities(raw.replace(/\[\/?[a-z0-9*]+(?:=[^\]]*|\s+[^\]]*)?\]/gi, "")).trim();
}

function parseInlineBbcode(raw: string): PatchNoteInline[] {
  const runs: PatchNoteInline[] = [];
  let bold = false;
  let italic = false;
  let underline = false;
  let href: string | null = null;

  const pushText = (chunk: string) => {
    const text = decodePatchEntities(chunk);
    if (!text) return;
    if (href) {
      const prev = runs[runs.length - 1];
      if (prev && prev.type === "link" && prev.href === href && !!prev.bold === bold && !!prev.italic === italic) {
        prev.text += text;
      } else {
        runs.push({ type: "link", text, href, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
      }
      return;
    }
    const prev = runs[runs.length - 1];
    if (
      prev &&
      prev.type === "text" &&
      !!prev.bold === bold &&
      !!prev.italic === italic &&
      !!prev.underline === underline
    ) {
      prev.text += text;
    } else {
      runs.push({
        type: "text",
        text,
        ...(bold ? { bold: true } : {}),
        ...(italic ? { italic: true } : {}),
        ...(underline ? { underline: true } : {}),
      });
    }
  };

  const parts = raw.split(/(\[\/?(?:b|i|u|url)(?:=[^\]]*)?\])/gi);
  for (const part of parts) {
    if (!part) continue;
    const tag = part.match(/^\[(\/?)(b|i|u|url)(?:=([^\]]*))?\]$/i);
    if (!tag) {
      pushText(part);
      continue;
    }
    const closing = tag[1] === "/";
    const name = tag[2].toLowerCase();
    if (name === "b") bold = !closing;
    else if (name === "i") italic = !closing;
    else if (name === "u") underline = !closing;
    else if (name === "url") href = closing ? null : sanitizeExternalHref(tag[3] ?? "");
  }

  return runs;
}

function slugifySection(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "secao";
}

function parseSteamBbcodeBlocks(rawContent: string): {
  blocks: PatchNoteBlock[];
  heroImage: string | null;
  plainText: string;
} {
  let normalized = rawContent
    .replace(/\r\n/g, "\n")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]");

  // Converte imagens (com ou sem [url]) em marcadores de linha isolados antes de quebrar parágrafos
  normalized = normalized.replace(
    /\[url=([^\]]+)\]\s*\[img(?:\s+src="([^"]*)")?\]([\s\S]*?)\[\/img\]\s*\[\/url\]/gi,
    (_m, urlRaw, srcAttr, inner) => {
      const src = sanitizePatchImageUrl(srcAttr || inner);
      const href = sanitizeExternalHref(urlRaw);
      return src ? `\n@@IMG@@${src}@@HREF@@${href ?? ""}@@\n` : "\n";
    },
  );

  normalized = normalized.replace(
    /\[img(?:\s+src="([^"]*)")?\]([\s\S]*?)\[\/img\]/gi,
    (_m, srcAttr, inner) => {
      const src = sanitizePatchImageUrl(srcAttr || inner);
      return src ? `\n@@IMG@@${src}@@HREF@@@@\n` : "\n";
    },
  );

  normalized = normalized
    .replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, (_m, inner) => `\n@@H3@@${stripInlineTags(inner)}\n`)
    .replace(/\[list\]/gi, "\n")
    .replace(/\[\/list\]/gi, "\n")
    .replace(/\[\*\]/gi, "\n@@LI@@")
    .replace(/\[\/?p\]/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const blocks: PatchNoteBlock[] = [];
  const sectionCounts = new Map<string, number>();
  let heroImage: string | null = null;
  const plainParts: string[] = [];

  for (const rawLine of normalized.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const imgMatch = trimmed.match(/^@@IMG@@([^@]+)@@HREF@@(.*)@@$/);
    if (imgMatch) {
      const src = imgMatch[1];
      const href = imgMatch[2] || undefined;
      if (!heroImage) heroImage = src;
      blocks.push({ type: "image", src, alt: "", ...(href ? { href } : {}) });
      continue;
    }

    if (trimmed.startsWith("@@H3@@")) {
      const text = trimmed.slice(6).trim();
      if (text) {
        blocks.push({ type: "heading", text });
        plainParts.push(text);
      }
      continue;
    }

    if (trimmed.startsWith("@@LI@@")) {
      const body = trimmed.slice(6).trim();
      const runs = parseInlineBbcode(body);
      if (runs.length > 0) {
        blocks.push({ type: "bullet", runs });
        plainParts.push(runs.map((r) => r.text).join(""));
      }
      continue;
    }

    const plainLine = stripInlineTags(trimmed);
    if (!plainLine) continue;

    if (/^-{5,}$/.test(plainLine)) {
      blocks.push({ type: "divider" });
      continue;
    }

    const secMatch = plainLine.match(/^\[([^\]]{2,60})\]$/);
    const boldSecMatch = !secMatch
      ? trimmed.match(
          /^\[b\]\s*(General|Items|Heroes|Bug\s*Fixes|Gameplay|Map|Misc|Miscellaneous|UI|Audio|Visuals)\s*:?\s*\[\/b\]$/i,
        )
      : null;
    if (secMatch || boldSecMatch) {
      const title = decodePatchEntities((secMatch?.[1] ?? boldSecMatch?.[1] ?? "").trim());
      const baseId = slugifySection(title);
      const count = (sectionCounts.get(baseId) ?? 0) + 1;
      sectionCounts.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;
      blocks.push({ type: "section", id, title });
      plainParts.push(title);
      continue;
    }

    if (/^--\s+/.test(trimmed) || /^--\s+/.test(plainLine)) {
      const withoutDash = trimmed.replace(/^(\[(?:b|i|u)\])*\s*--\s+/i, "$1");
      const runs = parseInlineBbcode(withoutDash);
      if (runs.length > 0) {
        blocks.push({ type: "bullet", runs, nested: true });
        plainParts.push(runs.map((r) => r.text).join(""));
      }
      continue;
    }

    if (/^[-•]\s+/.test(trimmed) || /^[-•]\s+/.test(plainLine)) {
      const withoutDash = trimmed.replace(/^(\[(?:b|i|u)\])*\s*[-•]\s+/i, "$1");
      const runs = parseInlineBbcode(withoutDash);
      if (runs.length > 0) {
        blocks.push({ type: "bullet", runs });
        plainParts.push(runs.map((r) => r.text).join(""));
      }
      continue;
    }

    const runs = parseInlineBbcode(trimmed);
    if (runs.length > 0) {
      blocks.push({ type: "paragraph", runs });
      plainParts.push(runs.map((r) => r.text).join(""));
    }
  }

  return {
    blocks,
    heroImage,
    plainText: plainParts.join("\n"),
  };
}

export async function fetchSteamPatchNotes(): Promise<SteamPatchNote[]> {
  try {
    const [steamRes, officialNotes] = await Promise.all([
      fetch(DEADLOCK_DATA_CONFIG.steamNewsUrl, {
        next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.patchesSeconds },
      }),
      fetchOfficialPatchNotes(30),
    ]);
    if (!steamRes.ok) return [];

    const json = (await steamRes.json()) as {
      appnews?: {
        newsitems?: Array<{
          gid?: string;
          title?: string;
          url?: string;
          author?: string;
          contents?: string;
          date?: number;
        }>;
      };
    };

    const officialByTitle = new Map<string, string>();
    for (const o of officialNotes) {
      const key = o.title?.trim().toLowerCase();
      if (key && o.link) officialByTitle.set(key, o.link);
    }

    const items = json?.appnews?.newsitems ?? [];
    return items
      .filter((item) => item.gid && item.title && item.contents)
      .map((item) => {
        const title = item.title!.trim();
        const unixTimestamp = Number(item.date ?? 0);
        const publishedAt =
          unixTimestamp > 0
            ? new Date(unixTimestamp * 1000).toISOString()
            : new Date().toISOString();
        const parsed = parseSteamBbcodeBlocks(item.contents!);
        const hasSectionOrBullets = parsed.blocks.some(
          (b) => b.type === "section" || b.type === "bullet",
        );
        const category: SteamPatchNote["category"] =
          PATCH_TITLE_REGEX.test(title) || hasSectionOrBullets ? "balance" : "feature";
        const url =
          officialByTitle.get(title.toLowerCase()) ??
          sanitizeExternalHref(item.url ?? "") ??
          `https://store.steampowered.com/news/app/1422450`;

        return {
          id: String(item.gid),
          title,
          author: item.author?.trim() || "Valve",
          publishedAt,
          unixTimestamp,
          url,
          category,
          heroImage: parsed.heroImage,
          blocks: parsed.blocks,
          plainText: parsed.plainText,
        };
      });
  } catch {
    return [];
  }
}

export async function fetchHeroesAnalytics(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
  minAverageBadge?: number,
): Promise<HeroAnalytics[]> {
  try {
    const url = new URL(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/analytics/hero-stats`);
    if (minUnixTimestamp) {
      url.searchParams.set("min_unix_timestamp", String(minUnixTimestamp));
    }
    if (maxUnixTimestamp) {
      url.searchParams.set("max_unix_timestamp", String(maxUnixTimestamp));
    }
    if (minAverageBadge) {
      url.searchParams.set("min_average_badge", String(minAverageBadge));
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.analyticsSeconds },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch {
    return [];
  }
}

export async function fetchHeroBanStats(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
  minAverageBadge?: number,
): Promise<HeroBanAnalytics[]> {
  try {
    const url = new URL(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/analytics/hero-ban-stats`);
    if (minUnixTimestamp) {
      url.searchParams.set("min_unix_timestamp", String(minUnixTimestamp));
    }
    if (maxUnixTimestamp) {
      url.searchParams.set("max_unix_timestamp", String(maxUnixTimestamp));
    }
    if (minAverageBadge) {
      url.searchParams.set("min_average_badge", String(minAverageBadge));
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.analyticsSeconds },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export interface ItemAnalytics {
  item_id: number;
  matches: number;
  wins: number;
  losses: number;
}

export async function fetchItemsAnalytics(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
  heroId?: number,
): Promise<ItemAnalytics[]> {
  try {
    const url = new URL(`${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/analytics/item-stats`);
    if (minUnixTimestamp) {
      url.searchParams.set("min_unix_timestamp", String(minUnixTimestamp));
    }
    if (maxUnixTimestamp) {
      url.searchParams.set("max_unix_timestamp", String(maxUnixTimestamp));
    }
    if (heroId) {
      url.searchParams.set("hero_id", String(heroId));
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: DEADLOCK_DATA_CONFIG.revalidate.analyticsSeconds },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

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
  scaleBonus?: number;
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
        const rawColor = attrs.match(
          /style\s*=\s*"[^"]*?color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))/i
        )?.[1];
        // Remove cores verdes chamativas no meio do texto corrido (como BonusMoveSpeed #0F9)
        const isLoudColor = rawColor && /#0F9|#00ff99/i.test(rawColor) && /movespeed|speed/i.test(cls);
        const color = isLoudColor ? "#ffefd7" : rawColor;
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
          (u.property_upgrades ?? []).map((pu: any) => {
            const isScale = pu.upgrade_type === "EAddToScale" || /scale/i.test(String(pu.upgrade_type));
            return {
              key: String(pu.name),
              bonus: isScale ? 0 : (toNum(pu.bonus) ?? 0),
              additive: !isScale,
              scaleBonus: isScale ? (toNum(pu.bonus) ?? 0) : 0,
            };
          })
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

        for (const k of section.basic_properties ?? []) {
          const keyStr = String(k);
          if (keyStr && !basicKeys.includes(keyStr)) basicKeys.push(keyStr);
          if (keyStr && !secBasicKeys.includes(keyStr)) secBasicKeys.push(keyStr);
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
  shopItem: ShopItem | null;
}

export interface HeroBuild {
  updatedAt: number | null;
  early: PopularItem[];
  mid: PopularItem[];
  late: PopularItem[];
}

// Cruza com o catálogo em cache para trazer os atributos completos; busca individual fica só de fallback
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
      .slice(0, SAMPLE_THRESHOLDS.popularItemsPerPhase);

  const picks = {
    early: top(popular.early_game),
    mid: top(popular.mid_game),
    late: top(popular.late_game),
  };
  const classNames = Array.from(
    new Set([...picks.early, ...picks.mid, ...picks.late].map((p) => p.className)),
  );
  if (classNames.length === 0) return null;

  const shopItems = await fetchShopItems();
  const shopMap = new Map<string, ShopItem>(shopItems.map((item) => [item.className, item]));

  const missingClassNames = classNames.filter((c) => !shopMap.has(c));
  const fallbackDetails = new Map<string, { name: string; image: string | null }>();
  if (missingClassNames.length > 0) {
    await Promise.all(
      missingClassNames.map(async (className) => {
        try {
          const res = await fetch(
            `https://api.deadlock-api.com/v1/assets/items/${encodeURIComponent(className)}?language=brazilian`,
            { headers: { Accept: "application/json" }, next: { revalidate: 86400 } },
          );
          if (!res.ok) return;
          const item = await res.json();
          if (typeof item?.name !== "string") return;
          fallbackDetails.set(className, {
            name: item.name,
            image: typeof item.shop_image_webp === "string" ? item.shop_image_webp : null,
          });
        } catch {
          return;
        }
      }),
    );
  }

  const resolve = (list: { className: string; pickPct: number }[]): PopularItem[] =>
    list.flatMap((p): PopularItem[] => {
      const shopItem = shopMap.get(p.className);
      if (shopItem) {
        return [{ className: p.className, pickPct: p.pickPct, name: shopItem.name, image: shopItem.image, shopItem }];
      }
      const d = fallbackDetails.get(p.className);
      return d ? [{ className: p.className, pickPct: p.pickPct, ...d, shopItem: null }] : [];
    });

  return {
    updatedAt: toNum(popular.timestamp),
    early: resolve(picks.early),
    mid: resolve(picks.mid),
    late: resolve(picks.late),
  };
}

export type ItemSlot = "weapon" | "vitality" | "spirit";

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
  className: string;
  name: string;
  image: string | null;
}

export interface ShopItem {
  id: number;
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
  searchText: string;
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

function normalizeSearchText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function buildItemSearchText(
  pt: {
    name: string;
    sortName: string;
    isActive: boolean;
    isImbue: boolean;
    descriptionHtml: string;
    sections: ItemTipSection[];
  },
  enRaw?: any,
): string {
  const parts: string[] = [
    pt.name,
    pt.sortName,
    pt.isActive ? "ativo active" : "passivo passive",
    pt.isImbue ? "imbue" : "",
    stripHtml(pt.descriptionHtml),
  ];
  for (const s of pt.sections) {
    parts.push(s.kind, stripHtml(s.html));
    for (const st of s.stats) parts.push(st.label, st.value);
  }
  if (enRaw) {
    parts.push(stripHtml(enRaw.description?.desc));
    for (const s of buildItemSections(enRaw)) {
      parts.push(stripHtml(s.html));
      for (const st of s.stats) parts.push(st.label);
    }
  }
  return normalizeSearchText(parts.filter(Boolean).join(" "));
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
    const enByClass = new Map<string, any>();
    if (resEn?.ok) {
      const rawEn: any[] = await resEn.json();
      for (const e of rawEn) {
        if (typeof e?.class_name === "string") {
          enByClass.set(e.class_name, e);
          if (typeof e?.name === "string") namesEn.set(e.class_name, e.name);
        }
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
      const isActive = i.is_active_item === true;
      const isImbue = typeof i.imbue === "string" && i.imbue !== "";
      const sortName = namesEn.get(i.class_name) ?? i.name;
      const descriptionHtml = sanitizeHtml(i.description?.desc);
      const sections = buildItemSections(i);
      return [
        {
          className: i.class_name,
          name: i.name,
          image,
          slot,
          tier,
          id: Number(i.id) || 0,
          cost,
          isActive,
          isImbue,
          sortName,
          descriptionHtml,
          sections,
          components: (Array.isArray(i.component_items) ? i.component_items : []).flatMap((c: unknown) => {
            const ci = byClass.get(String(c));
            if (typeof ci?.name !== "string" || typeof ci?.class_name !== "string") return [];
            const img = ci.shop_image_webp ?? ci.image_webp;
            return [{ className: ci.class_name, name: ci.name, image: typeof img === "string" ? img : null }];
          }),
          searchText: buildItemSearchText(
            { name: i.name, sortName, isActive, isImbue, descriptionHtml, sections },
            enByClass.get(i.class_name),
          ),
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

export async function fetchShopItemByClassName(className: string): Promise<ShopItem | null> {
  const items = await fetchShopItems();
  return items.find((item) => item.className === className) ?? null;
}

export interface PatchHeroAbilityRef {
  nameEn: string;
  namePt: string;
  image: string;
  slotType: string;
}

let patchHeroAbilitiesCache: { data: Record<number, PatchHeroAbilityRef[]>; at: number } | null = null;

// Resposta grande (>3 MB): fica fora do cache de fetch do Next, com cache próprio de 24h
export async function fetchPatchHeroAbilities(): Promise<Record<number, PatchHeroAbilityRef[]>> {
  await connection();
  if (patchHeroAbilitiesCache && Date.now() - patchHeroAbilitiesCache.at < ASSETS_TTL) {
    return patchHeroAbilitiesCache.data;
  }

  try {
    const [resEn, resPt] = await Promise.all([
      fetch("https://api.deadlock-api.com/v1/assets/items/by-type/ability", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetch("https://api.deadlock-api.com/v1/assets/items/by-type/ability?language=brazilian", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null),
    ]);

    if (!resEn.ok) return patchHeroAbilitiesCache?.data ?? {};
    const rawEn: any[] = await resEn.json();
    const rawPt: any[] = resPt?.ok ? await resPt.json() : [];

    const ptNameById = new Map<number, string>();
    for (const item of rawPt) {
      if (typeof item?.id === "number" && typeof item?.name === "string") {
        ptNameById.set(item.id, item.name.trim());
      }
    }

    const byHero: Record<number, PatchHeroAbilityRef[]> = {};
    const seen = new Set<string>();

    for (const item of rawEn) {
      const slotType = typeof item?.ability_type === "string" ? item.ability_type : "";
      if (slotType === "weapon") continue;

      const nameEn = typeof item?.name === "string" ? item.name.trim() : "";
      const className = typeof item?.class_name === "string" ? item.class_name.trim() : "";
      if (!nameEn || nameEn === className || nameEn.includes("_")) continue;

      const rawImg =
        typeof item?.image_webp === "string"
          ? item.image_webp
          : typeof item?.image === "string"
            ? item.image
            : "";
      if (!rawImg || !rawImg.startsWith(ALLOWED_IMG_PREFIX)) continue;

      const heroIds = new Set<number>();
      if (typeof item?.hero === "number") heroIds.add(item.hero);
      if (Array.isArray(item?.heroes)) {
        for (const hid of item.heroes) {
          if (typeof hid === "number") heroIds.add(hid);
        }
      }
      if (heroIds.size === 0) continue;

      const namePt = (typeof item?.id === "number" ? ptNameById.get(item.id) : undefined) || nameEn;

      for (const hid of heroIds) {
        const dedupeKey = `${hid}:${nameEn.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        (byHero[hid] ??= []).push({
          nameEn,
          namePt,
          image: rawImg,
          slotType,
        });
      }
    }

    patchHeroAbilitiesCache = { data: byHero, at: Date.now() };
    return byHero;
  } catch (err) {
    console.error("❌ Falha ao buscar habilidades para patch notes:", err);
    return patchHeroAbilitiesCache?.data ?? {};
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

// Coleta o desempenho do herói ao longo dos patches cronológicos (controlado por PATCH_HISTORY_LIMIT)
export async function fetchHeroPatchHistory(
  heroId: number,
  options?: { count?: number | null; minAverageBadge?: number; rankTier?: number },
): Promise<PatchWinRatePoint[]> {
  const { allPatches, readyPatches } = await resolveActivePatches({
    rankTier: options?.rankTier,
    minAverageBadge: options?.minAverageBadge,
  });
  const limit = options?.count !== undefined ? options.count : PATCH_HISTORY_LIMIT;
  const allDated = allPatches.filter((p) => typeof p.since === "number");
  const dated = readyPatches.filter((p) => typeof p.since === "number");
  const patchesWithSince = typeof limit === "number" ? dated.slice(0, limit) : dated;
  if (patchesWithSince.length === 0) return [];

  const results: Array<Omit<PatchWinRatePoint, "delta"> | null> = [];
  const batchSize = DEADLOCK_DATA_CONFIG.patchHistoryBatchSize;

  for (let start = 0; start < patchesWithSince.length; start += batchSize) {
    const batch = patchesWithSince.slice(start, start + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (patch) => {
        const idxInAll = allDated.findIndex((p) => p.id === patch.id);
        const until = idxInAll > 0 ? allDated[idxInAll - 1].since : undefined;
        const stats = await fetchHeroesAnalytics(patch.since, until, options?.minAverageBadge);
        const stat = stats.find((s) => s.hero_id === heroId);
        const { matches, winRate } = computeHeroMatchStats(stat);
        if (matches < SAMPLE_THRESHOLDS.patchHistoryHero) return null;

        const dateMatch = patch.label.match(/(\d{2}\/\d{2})/);
        let dateLabel = dateMatch ? dateMatch[1] : "";
        if (!dateLabel && patch.since) {
          dateLabel = new Date(patch.since * 1000).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            timeZone: "UTC",
          });
        }
        if (!dateLabel) {
          dateLabel = patch.id;
        }

        return {
          patchId: patch.id,
          label: patch.label,
          dateLabel,
          winRate: Number(winRate.toFixed(2)),
          matches,
        };
      }),
    );
    results.push(...batchResults);
  }

  const chronological = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .reverse();

  return chronological.map((point, i) => {
    const prev = i > 0 ? chronological[i - 1] : null;
    const delta = prev ? Number((point.winRate - prev.winRate).toFixed(2)) : null;
    return {
      ...point,
      delta,
    };
  });
}

export interface HeroSynergyStat {
  hero_id1: number;
  hero_id2: number;
  wins: number;
  matches_played: number;
}

export interface HeroCounterStat {
  hero_id: number;
  enemy_hero_id: number;
  wins: number;
  matches_played: number;
}

export interface HeroMatchupEntry {
  heroId: number;
  name: string;
  image: string;
  winRate: number;
  matches: number;
}

export interface HeroMatchups {
  bestWith: HeroMatchupEntry[];
  worstWith: HeroMatchupEntry[];
  bestAgainst: HeroMatchupEntry[];
  worstAgainst: HeroMatchupEntry[];
}

async function fetchAnalyticsList<T>(
  endpoint: string,
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
): Promise<T[]> {
  const query = (withWindow: boolean) => {
    const minMatches =
      withWindow && minUnixTimestamp
        ? SAMPLE_THRESHOLDS.synergyWindowMinMatches
        : SAMPLE_THRESHOLDS.synergyFallbackMinMatches;
    const params = new URLSearchParams({ min_matches: String(minMatches) });
    if (withWindow && minUnixTimestamp) params.set("min_unix_timestamp", String(minUnixTimestamp));
    if (withWindow && maxUnixTimestamp) params.set("max_unix_timestamp", String(maxUnixTimestamp));
    return `https://api.deadlock-api.com/v1/analytics/${endpoint}?${params.toString()}`;
  };

  try {
    const res = await fetch(query(true), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
    if (minUnixTimestamp) {
      const fallbackRes = await fetch(query(false), {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData)) return fallbackData;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function fetchHeroSynergyStats(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
): Promise<HeroSynergyStat[]> {
  return fetchAnalyticsList<HeroSynergyStat>("hero-synergy-stats", minUnixTimestamp, maxUnixTimestamp);
}

export function fetchHeroCounterStats(
  minUnixTimestamp?: number,
  maxUnixTimestamp?: number,
): Promise<HeroCounterStat[]> {
  return fetchAnalyticsList<HeroCounterStat>("hero-counter-stats", minUnixTimestamp, maxUnixTimestamp);
}

export function buildHeroMatchups(
  heroId: number,
  heroesMap: Record<number, HeroAsset>,
  synergyStats: HeroSynergyStat[],
  counterStats: HeroCounterStat[],
  limit = 4,
): HeroMatchups {
  const toEntry = (otherId: number, wins: number, matches: number): HeroMatchupEntry | null => {
    if (otherId === heroId || matches < SAMPLE_THRESHOLDS.matchupMinMatches) return null;
    const h = heroesMap[otherId];
    if (!h) return null;
    const image = h.images?.icon_image_small || h.images?.icon_hero_card || "";
    return {
      heroId: otherId,
      name: h.name,
      image,
      winRate: (wins / matches) * 100,
      matches,
    };
  };

  const allies = synergyStats
    .filter((s) => s.hero_id1 === heroId || s.hero_id2 === heroId)
    .map((s) => toEntry(s.hero_id1 === heroId ? s.hero_id2 : s.hero_id1, s.wins, s.matches_played))
    .filter((e): e is HeroMatchupEntry => e !== null)
    .sort((a, b) => b.winRate - a.winRate);

  const counters = counterStats
    .filter((c) => c.hero_id === heroId)
    .map((c) => toEntry(c.enemy_hero_id, c.wins, c.matches_played))
    .filter((e): e is HeroMatchupEntry => e !== null)
    .sort((a, b) => b.winRate - a.winRate);

  const bestWith = allies.slice(0, limit);
  const bestWithIds = new Set(bestWith.map((e) => e.heroId));
  const worstWith = [...allies]
    .reverse()
    .filter((e) => !bestWithIds.has(e.heroId))
    .slice(0, limit);

  const bestAgainst = counters.slice(0, limit);
  const bestAgainstIds = new Set(bestAgainst.map((e) => e.heroId));
  const worstAgainst = [...counters]
    .reverse()
    .filter((e) => !bestAgainstIds.has(e.heroId))
    .slice(0, limit);

  return { bestWith, worstWith, bestAgainst, worstAgainst };
}