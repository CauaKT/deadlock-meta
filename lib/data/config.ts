import type { TierKey } from "@/app/tiers";

export interface Patch {
  id: string;
  label: string;
  since?: number; // Unix timestamp em segundos; sem valor = sem filtro de data
}

export interface RankFilterOption {
  id: string;
  tier: number;
  label: string;
  minBadge?: number;
  icon?: string;
}

export const DEADLOCK_DATA_CONFIG = {
  language: "brazilian",
  apiBaseUrl: "https://api.deadlock-api.com",
  wikiApiUrl: "https://deadlock.wiki/api.php",
  steamNewsUrl:
    "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1422450&count=100&feeds=steam_community_announcements",
  revalidate: {
    assetsSeconds: 86400,
    analyticsSeconds: 3600,
    patchesSeconds: 3600,
  },
  assetsMemoryTtlMs: 24 * 60 * 60 * 1000,
  patchHistoryBatchSize: 6,
} as const;

// `null` = todos os patches com partidas registradas (mesmo universo da Tier List)
export const PATCH_HISTORY_LIMIT: number | null = null;

// Do mais novo para o mais antigo. O primeiro é o selecionado por padrão.
export const PATCHES: Patch[] = [
  { id: "minor-2026-11-04", label: "04/11/2026 - Minor Update", since: 1793854950 },
  { id: "halloween-2026", label: "30/10/2026 - Halloween + Gameplay", since: 1793393460 },
  { id: "minor-10-14", label: "14/10/2026 - Minor Update", since: 1792033860 },
  { id: "minor-10-05", label: "05/10/2026 - Minor Update", since: 1791241500 },
  { id: "city-never-sleeps", label: "29/09/2026 - City Never Sleeps", since: 1790713511 },
  { id: "minor-09-16", label: "16/09/2026 - Minor Update", since: 1789516800 },
  { id: "minor-08-22", label: "22/08/2026 - Minor Update", since: 1787356800 },
  { id: "ranked-season-1", label: "30/07/2026 - Ranked Season 1", since: 1785430800 },
  { id: "minor-06-04", label: "04/06/2026 - Minor Update", since: 1780531200 },
  { id: "update-05-22", label: "22/05/2026 - Minor Update", since: 1779408000 },
  { id: "update-04-30", label: "30/04/2026 - Minor Update", since: 1777507200 },
  { id: "update-03-21", label: "21/03/2026 - Minor Update", since: 1774051200 },
  { id: "update-03-06", label: "06/03/2026 - Minor Update", since: 1772833020 },
  { id: "update-01-30", label: "30/01/2026 - Minor Update", since: 1769731200 },
  { id: "old-gods-new-blood", label: "22/01/2026 - Old Gods, New Blood", since: 1769122593 },
  { id: "update-2025-12-29", label: "29/12/2025 - Minor Update", since: 1766966400 },
  { id: "update-2025-12-16", label: "16/12/2025 - Minor Update", since: 1765843200 },
  { id: "update-2025-11-21", label: "21/11/2025 - Minor Update", since: 1763683200 },
  { id: "update-2025-10-24", label: "24/10/2025 - Minor Update", since: 1761264000 },
  { id: "update-2025-10-02", label: "02/10/2025 - Minor Update", since: 1759363200 },
  { id: "update-2025-09-04", label: "04/09/2025 - Minor Update", since: 1756944000 },
  { id: "update-2025-08-18", label: "18/08/2025 - Minor Update", since: 1755475200 },
  { id: "update-2025-07-29", label: "29/07/2025 - Minor Update", since: 1753747200 },
  { id: "shop-rework-2025", label: "08/05/2025 - Shop Rework Update", since: 1746732792 },
  { id: "map-rework-2025", label: "25/02/2025 - Map Rework Update", since: 1740520159 },
  { id: "four-heroes-2025", label: "17/01/2025 - Holliday, Vyper, Calico & Sinclair", since: 1737139201 },
  { id: "winter-visual-2024", label: "17/12/2024 - Winter Visual Update", since: 1734468800 },
  { id: "update-2024-12-06", label: "06/12/2024 - Minor Update", since: 1733516709 },
  { id: "update-2024-11-07", label: "07/11/2024 - Minor Update", since: 1731027988 },
  { id: "update-2024-10-24", label: "24/10/2024 - Minor Update", since: 1729814181 },
];

export const PATCH_TITLE_REGEX =
  /update|ranked|season|city never sleeps|old gods|rework|six new heroes|holliday|halloween/i;

export const RANK_FILTERS: RankFilterOption[] = [
  { id: "all", tier: 0, label: "Todas as Patentes", icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_lg.png" },
  { id: "1", tier: 1, label: "Iniciado+", minBadge: 11, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank01_lg.png" },
  { id: "2", tier: 2, label: "Aspirante+", minBadge: 21, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank02_lg.png" },
  { id: "3", tier: 3, label: "Acólito+", minBadge: 31, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank03_lg.png" },
  { id: "4", tier: 4, label: "Sentinela+", minBadge: 41, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank04_lg.png" },
  { id: "5", tier: 5, label: "Místico+", minBadge: 51, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank05_lg.png" },
  { id: "6", tier: 6, label: "Ritualista+", minBadge: 61, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank06_lg.png" },
  { id: "7", tier: 7, label: "Emissário+", minBadge: 71, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank07_lg.png" },
  { id: "8", tier: 8, label: "Oráculo+", minBadge: 81, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank08_lg.png" },
  { id: "9", tier: 9, label: "Fantasma+", minBadge: 91, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank09_lg.png" },
  { id: "10", tier: 10, label: "Ascendente+", minBadge: 101, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank10_lg.png" },
  { id: "11", tier: 11, label: "Eterno", minBadge: 111, icon: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank11_lg.png" },
];

export const DEFAULT_RANK_ID = "7";

export type TierMetricId = "winrate" | "pickrate" | "banrate" | "metascore";

export interface TierMetricOption {
  id: TierMetricId;
  label: string;
  shortLabel: string;
}

export const DEFAULT_TIER_METRIC: TierMetricId = "winrate";

export const TIER_METRIC_OPTIONS: TierMetricOption[] = [
  { id: "winrate", label: "Winrate", shortLabel: "Win Rate" },
  { id: "pickrate", label: "Pickrate", shortLabel: "Pick Rate" },
  { id: "banrate", label: "Banrate", shortLabel: "Ban Rate" },
  { id: "metascore", label: "Meta Score", shortLabel: "Meta Score" },
];

export const TIER_THRESHOLDS = {
  META: 53.5,
  A: 51.5,
  B: 50.0,
  C: 48.5,
  D: 47.0,
} as const;

export const TIER_THRESHOLDS_BY_METRIC: Record<
  TierMetricId,
  { META: number; A: number; B: number; C: number; D: number }
> = {
  metascore: { META: 70.0, A: 58.0, B: 50.0, C: 42.0, D: 34.0 },
  winrate: TIER_THRESHOLDS,
  pickrate: { META: 45.0, A: 33.0, B: 24.0, C: 18.0, D: 12.0 },
  banrate: { META: 20.0, A: 12.0, B: 6.5, C: 4.0, D: 2.4 },
};

export const TIER_BADGE_STYLES: Record<TierKey, { label: string; bg: string }> = {
  META: { label: "META", bg: "bg-cyan-400 text-black border-cyan-300" },
  A: { label: "TIER A", bg: "bg-green-500 text-black border-green-400" },
  B: { label: "TIER B", bg: "bg-lime-400 text-black border-lime-300" },
  C: { label: "TIER C", bg: "bg-yellow-400 text-black border-yellow-300" },
  D: { label: "TIER D", bg: "bg-orange-500 text-black border-orange-400" },
  F: { label: "TIER F", bg: "bg-red-600 text-white border-red-500" },
};

export const SAMPLE_THRESHOLDS = {
  heroDefault: 1000,
  heroHighRankTier: 9,
  heroHighRankMinMatches: 100,
  heroMidRankTier: 1,
  heroMidRankMinMatches: 300,
  patchTrackerHero: 300,
  patchTrackerItem: 500,
  patchHistoryHero: 1,
  itemStatsCalculator: 50,
  synergyWindowMinMatches: 50,
  synergyFallbackMinMatches: 150,
  matchupMinMatches: 1,
  popularItemsPerPhase: 4,
} as const;

export const MIN_HERO_MATCHES = SAMPLE_THRESHOLDS.heroDefault;

export function calculateTier(winRate: number): TierKey {
  return calculateTierForMetric("winrate", winRate);
}

export function calculateTierForMetric(metric: TierMetricId, value: number): TierKey {
  const t = TIER_THRESHOLDS_BY_METRIC[metric];
  if (value >= t.META) return "META";
  if (value >= t.A) return "A";
  if (value >= t.B) return "B";
  if (value >= t.C) return "C";
  if (value >= t.D) return "D";
  return "F";
}

export function resolveTierMetric(metricId?: string): TierMetricOption {
  const defaultMetric =
    TIER_METRIC_OPTIONS.find((m) => m.id === DEFAULT_TIER_METRIC) ?? TIER_METRIC_OPTIONS[0];
  if (!metricId) return defaultMetric;
  return TIER_METRIC_OPTIONS.find((m) => m.id === metricId) ?? defaultMetric;
}

export const META_SCORE_WEIGHTS = {
  winRate: 0.35,
  pickRate: 0.20,
  banRate: 0.14,
  assists: 0.08,
  kills: 0.06,
  playerDamage: 0.05,
  damageTaken: 0.03,
  maxHealth: 0.02,
  deaths: -0.12,
  bossDamage: 0.06,
  netWorth: 0.04,
  lastHits: 0.03,
  denies: 0.02,
  creepDamage: 0.02,
  neutralDamage: 0.02,
} as const;

export type MetaScoreStatKey = keyof typeof META_SCORE_WEIGHTS;

export type MetaScoreInput = Record<MetaScoreStatKey, number>;

export const META_SCORE_LABELS: Record<MetaScoreStatKey, string> = {
  winRate: "Winrate",
  pickRate: "Pickrate",
  banRate: "Banrate",
  assists: "Assists",
  kills: "Kills",
  playerDamage: "Dano Heróis",
  damageTaken: "Dano Receb.",
  maxHealth: "Vida Máx.",
  deaths: "Deaths",
  bossDamage: "Objetivos",
  netWorth: "Almas",
  lastHits: "Last Hits",
  denies: "Denies",
  creepDamage: "Dano Tropas",
  neutralDamage: "Dano Neutrais",
};

export interface MetaScoreBreakdownItem {
  key: MetaScoreStatKey;
  label: string;
  points: number;
  pct: number;
}

export interface MetaScoreResult {
  score: number;
  breakdown: MetaScoreBreakdownItem[];
}

export function computeMetaScoreBreakdowns(
  rows: MetaScoreInput[],
  hasBanData: boolean,
): MetaScoreResult[] {
  if (rows.length === 0) return [];

  const activeEntries = (
    Object.entries(META_SCORE_WEIGHTS) as Array<[MetaScoreStatKey, number]>
  ).filter(([key]) => hasBanData || key !== "banRate");

  // Mantém soma líquida = 1.00 mesmo em patches antigos sem dados de ban
  const netWeight = activeEntries.reduce((sum, [, w]) => sum + w, 0) || 1;

  if (rows.length === 1) {
    return [
      {
        score: 50,
        breakdown: activeEntries.map(([key, weight]) => ({
          key,
          label: META_SCORE_LABELS[key],
          points: 50 * (weight / netWeight),
          pct: 50,
        })),
      },
    ];
  }

  const normalizedByKey = new Map<MetaScoreStatKey, number[]>();
  for (const [key] of activeEntries) {
    const vals = rows.map((r) => r[key]);
    const mean = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(variance) || 1;
    normalizedByKey.set(
      key,
      vals.map((v) => 100 / (1 + Math.exp(-((v - mean) / sd) * 1.25))),
    );
  }

  return rows.map((_, idx) => {
    const breakdown: MetaScoreBreakdownItem[] = activeEntries.map(([key, weight]) => {
      const col = normalizedByKey.get(key)!;
      return {
        key,
        label: META_SCORE_LABELS[key],
        points: col[idx] * (weight / netWeight),
        pct: col[idx],
      };
    });
    const raw = breakdown.reduce((sum, item) => sum + item.points, 0);
    return {
      score: Math.min(100, Math.max(0, raw)),
      breakdown,
    };
  });
}

export function computeMetaScores(rows: MetaScoreInput[], hasBanData: boolean): number[] {
  return computeMetaScoreBreakdowns(rows, hasBanData).map((r) => r.score);
}

const TIER_ORDER: TierKey[] = ["META", "A", "B", "C", "D", "F"];
const TIER_DISTRIBUTION_WEIGHTS = [0.09, 0.18, 0.25, 0.23, 0.16, 0.09] as const;

export function assignTiersByRank<T>(sortedDescItems: T[]): Array<T & { tier: TierKey }> {
  const total = sortedDescItems.length;
  if (total === 0) return [];

  if (total < TIER_ORDER.length) {
    return sortedDescItems.map((item, idx) => ({
      ...item,
      tier: TIER_ORDER[idx],
    }));
  }

  const extra = total - TIER_ORDER.length;
  const exact = TIER_DISTRIBUTION_WEIGHTS.map((w) => 1 + extra * w);
  const counts = exact.map((v) => Math.floor(v));
  const remainder = total - counts.reduce((sum, c) => sum + c, 0);

  const orderByFrac = exact
    .map((v, idx) => ({ idx, frac: v - counts[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i++) {
    counts[orderByFrac[i].idx] += 1;
  }

  const result: Array<T & { tier: TierKey }> = [];
  let cursor = 0;
  for (let t = 0; t < TIER_ORDER.length; t++) {
    const tierKey = TIER_ORDER[t];
    const count = counts[t];
    for (let j = 0; j < count && cursor < total; j++) {
      result.push({ ...sortedDescItems[cursor++], tier: tierKey });
    }
  }
  return result;
}

export function minMatchesForRank(tier: number): number {
  if (tier >= SAMPLE_THRESHOLDS.heroHighRankTier) return SAMPLE_THRESHOLDS.heroHighRankMinMatches;
  if (tier >= SAMPLE_THRESHOLDS.heroMidRankTier) return SAMPLE_THRESHOLDS.heroMidRankMinMatches;
  return SAMPLE_THRESHOLDS.heroDefault;
}

export function getDefaultRank(): RankFilterOption {
  return RANK_FILTERS.find((r) => r.id === DEFAULT_RANK_ID) ?? RANK_FILTERS[0];
}

export function resolveRankFilter(rankId?: string): RankFilterOption {
  const defaultRank = getDefaultRank();
  if (!rankId) return defaultRank;
  return RANK_FILTERS.find((r) => r.id === rankId) ?? defaultRank;
}

export function resolvePatchWindow(
  patches: Patch[],
  patchId?: string,
): { selectedPatch: Patch; patchUntil: number | undefined } {
  const selectedPatch = patches.find((p) => p.id === patchId) ?? patches[0];
  const selectedIndex = patches.findIndex((p) => p.id === selectedPatch.id);
  const patchUntil =
    selectedPatch.since && selectedIndex > 0 ? patches[selectedIndex - 1].since : undefined;
  return { selectedPatch, patchUntil };
}

export function isPlayableHero(h: unknown): boolean {
  if (!h || typeof h !== "object") return false;
  const hero = h as {
    player_selectable?: unknown;
    disabled?: unknown;
    in_development?: unknown;
    development_state?: unknown;
    prerelease_only?: unknown;
    name?: unknown;
  };
  return (
    hero.player_selectable === true &&
    hero.disabled !== true &&
    hero.prerelease_only !== true &&
    (hero.in_development !== true || hero.development_state === "release") &&
    typeof hero.name === "string" &&
    !hero.name.startsWith("hero_")
  );
}

export function resolveHeroMedia(
  hero: { name?: string; images?: Record<string, unknown> } | null | undefined,
  localHeroFiles: string[] = [],
) {
  const images = (hero?.images ?? {}) as Record<string, string | undefined>;
  const name = hero?.name ?? "";
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const formattedName = name.trim().replace(/ /g, "_");

  const card = images.icon_hero_card || images.icon_image_small || images.minimap_image || "";
  const icon = images.icon_image_small || images.minimap_image || images.icon_hero_card || null;
  const bg = images.background_image_webp || images.background_image || "";

  const gloatKey = Object.keys(images).find((k) => k.toLowerCase().includes("gloat"));
  const critKey = Object.keys(images).find(
    (k) => k.toLowerCase().includes("crit") || k.toLowerCase().includes("low"),
  );

  const localFile = slug
    ? localHeroFiles.find((f) => f.toLowerCase().startsWith(slug))
    : undefined;

  const wikiRender = formattedName
    ? `https://cdn.deadlock.wiki/thumb/${formattedName}_Render.png/800px-${formattedName}_Render.png`
    : "";

  const art = localFile ? `/heroes/${localFile}` : wikiRender || card;
  const bannerImage = localFile ? `/heroes/${localFile}` : wikiRender || card;

  return {
    card,
    icon,
    bg,
    art,
    bannerImage,
    gloatImage: (gloatKey && images[gloatKey]) || card,
    critImage: (critKey && images[critKey]) || card,
    nameSvgs: [
      images.name_image,
      formattedName ? `https://cdn.deadlock.wiki/${formattedName}_name.svg` : undefined,
    ].filter((u): u is string => typeof u === "string" && u.startsWith("http")),
  };
}

export const RANK_NAMES: Record<number, string> = {
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

export const RANK_COLORS: Record<number, string> = {
  1: "#6A3E1E",
  2: "#882355",
  3: "#5C6DAB",
  4: "#719C47",
  5: "#DDA326",
  6: "#EE4F57",
  7: "#B47FEB",
  8: "#955138",
  9: "#7C7C7C",
  10: "#C39751",
  11: "#5CE9A9",
};

export const RANK_ROMAN = ["", "I", "II", "III", "IV", "V", "VI"] as const;
export const RANK_POINTS_PER_TIER = 6500;
export const MAX_RANK_TIER = 11;

export function getRankIconUrl(tier: number, sub = 6): string {
  if (tier < 1) {
    return "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_sm.webp";
  }
  return `${DEADLOCK_DATA_CONFIG.apiBaseUrl}/v1/assets/ranks/${tier}/${sub}/image?format=webp`;
}

export interface RankableEntry {
  rankedRank?: number | null;
  rankedSubrank?: number | null;
  badgeLevel: number | null;
  points?: number | null;
}

export function getRankTierFromEntry(entry: RankableEntry): number {
  if (typeof entry.rankedRank === "number" && entry.rankedRank >= 1) {
    return entry.rankedRank;
  }
  if (typeof entry.badgeLevel === "number" && entry.badgeLevel >= 11) {
    return Math.floor(entry.badgeLevel / 10);
  }
  if (typeof entry.points === "number" && entry.points >= 0) {
    return Math.min(
      MAX_RANK_TIER,
      Math.max(1, Math.floor(entry.points / RANK_POINTS_PER_TIER) + 1),
    );
  }
  return 0;
}

export function formatRankInfo(entry: RankableEntry): {
  tier: number;
  label: string;
  iconUrl: string;
} {
  let tier = entry.rankedRank ?? null;
  let sub = entry.rankedSubrank ?? null;
  if ((tier === null || sub === null) && entry.badgeLevel !== null && entry.badgeLevel >= 11) {
    tier = Math.floor(entry.badgeLevel / 10);
    sub = entry.badgeLevel % 10;
  }
  if (!tier || tier < 1) {
    if (typeof entry.points === "number" && entry.points >= 0) {
      const approxTier = Math.min(
        MAX_RANK_TIER,
        Math.max(1, Math.floor(entry.points / RANK_POINTS_PER_TIER) + 1),
      );
      return {
        tier: approxTier,
        label: RANK_NAMES[approxTier] ?? `Tier ${approxTier}`,
        iconUrl: getRankIconUrl(approxTier, 1),
      };
    }
    return {
      tier: 0,
      label: "Obscuro",
      iconUrl: getRankIconUrl(0),
    };
  }
  const validSub = sub && sub >= 1 && sub <= 6 ? sub : 1;
  const name = RANK_NAMES[tier] ?? `Tier ${tier}`;
  const roman = RANK_ROMAN[validSub] ?? String(validSub);
  return {
    tier,
    label: `${name} ${roman}`,
    iconUrl: getRankIconUrl(tier, validSub),
  };
}

export const LEADERBOARD_CONFIG = {
  pageSize: 25,
  defaultRegion: "SAmerica",
  minSearchChars: 2,
} as const;

export const LEADERBOARD_REGIONS: Array<{ id: string; label: string }> = [
  { id: "Global", label: "Global" },
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

export const LFG_REGIONS = LEADERBOARD_REGIONS.filter((r) => r.id !== "Global");
export const LFG_RANK_NAMES = Object.values(RANK_NAMES);

export const PLAYERBASE_REGION_LABELS: Record<string, string> = {
  Europe: "Europa",
  Row: "América do Norte",
  SAmerica: "América do Sul",
  SEAsia: "Ásia",
  Oceania: "Oceania",
  Desconhecida: "Outras / N/D",
};

export const PLAYERBASE_MAP_REGIONS: Array<{
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

export type ShopSlot = "weapon" | "vitality" | "spirit";

export const SLOT_META: Record<
  ShopSlot,
  {
    label: string;
    vendor: string;
    accent: string;
    plate: string;
    calcAccent: string;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    badgeClass: string;
    patchBadgeClass: string;
  }
> = {
  weapon: {
    label: "Arma",
    vendor: "Fairfax",
    accent: "#e2a23f",
    plate: "#3b2d1a",
    calcAccent: "#c97a2e",
    colorClass: "text-amber-400",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/10",
    badgeClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    patchBadgeClass: "text-amber-400 border-amber-500/35 bg-amber-500/10",
  },
  vitality: {
    label: "Vitalidade",
    vendor: "MPS",
    accent: "#8fc43a",
    plate: "#394d2d",
    calcAccent: "#659337",
    colorClass: "text-emerald-400",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/10",
    badgeClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    patchBadgeClass: "text-emerald-400 border-emerald-500/35 bg-emerald-500/10",
  },
  spirit: {
    label: "Espírito",
    vendor: "Curiosity Catalog",
    accent: "#c79af0",
    plate: "#3a2d3d",
    calcAccent: "#9153b8",
    colorClass: "text-purple-400",
    borderClass: "border-purple-500/40",
    bgClass: "bg-purple-500/10",
    badgeClass: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    patchBadgeClass: "text-purple-400 border-purple-500/35 bg-purple-500/10",
  },
};

export const SLOT_LABELS: Record<ShopSlot, string> = {
  weapon: SLOT_META.weapon.label,
  vitality: SLOT_META.vitality.label,
  spirit: SLOT_META.spirit.label,
};

export const SLOT_ACCENTS: Record<ShopSlot, string> = {
  weapon: SLOT_META.weapon.accent,
  vitality: SLOT_META.vitality.accent,
  spirit: SLOT_META.spirit.accent,
};

export function computeItemTooltipPosition(
  el: HTMLElement,
  tipWidth = 320,
  gap = 8,
  maxHeight = 420,
) {
  const r = el.getBoundingClientRect();
  const fitsRight = r.right + gap + tipWidth <= window.innerWidth;
  return {
    x: fitsRight ? r.right + gap : Math.max(8, r.left - gap - tipWidth),
    y: Math.min(Math.max(8, r.top), Math.max(8, window.innerHeight - maxHeight)),
  };
}