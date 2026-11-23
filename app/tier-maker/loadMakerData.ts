import {
  calculateTier,
  computeHeroMatchStats,
  extractColor,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchPatches,
  fetchWikiColors,
  getDefaultRank,
  isPlayableHero,
  minMatchesForRank,
  resolveHeroMedia,
  resolvePatchWindow,
} from "@/lib/deadlock";
import type { MakerHero } from "@/app/tiers";

export async function loadMakerData(): Promise<{
  makerHeroes: MakerHero[];
  metaTiers: Record<string, number[]>;
}> {
  const patches = await fetchPatches();
  const { selectedPatch, patchUntil } = resolvePatchWindow(patches);
  const defaultRank = getDefaultRank();
  const minMatches = minMatchesForRank(defaultRank.tier);

  const [heroesMap, wikiColors, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil, defaultRank.minBadge),
  ]);

  const statsById = new Map(stats.map((s) => [s.hero_id, s]));

  const makerHeroes: MakerHero[] = Object.values(heroesMap)
    .filter((h) => {
      if (extractColor(h, wikiColors) === null || h.name.startsWith("hero_")) return false;
      const st = statsById.get(h.id);
      return (st?.matches ?? 0) > 0 || isPlayableHero(h);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => {
      const media = resolveHeroMedia(h);
      return {
        id: h.id,
        name: h.name,
        image: media.card,
        gloatImage: media.gloatImage,
        critImage: media.critImage,
        rgb: extractColor(h, wikiColors),
      };
    });

  const rankedHeroes = stats
    .filter((s) => isPlayableHero(heroesMap[s.hero_id]) && (s.matches || 0) >= minMatches)
    .map((s) => {
      const { winRate } = computeHeroMatchStats(s);
      return {
        id: s.hero_id,
        winRate,
        tier: calculateTier(winRate),
      };
    })
    .sort((a, b) => b.winRate - a.winRate);

  const metaTiers: Record<string, number[]> = {
    META: rankedHeroes.filter((h) => h.tier === "META").map((h) => h.id),
    A: rankedHeroes.filter((h) => h.tier === "A").map((h) => h.id),
    B: rankedHeroes.filter((h) => h.tier === "B").map((h) => h.id),
    C: rankedHeroes.filter((h) => h.tier === "C").map((h) => h.id),
    D: rankedHeroes.filter((h) => h.tier === "D").map((h) => h.id),
    F: rankedHeroes.filter((h) => h.tier === "F").map((h) => h.id),
  };

  return { makerHeroes, metaTiers };
}