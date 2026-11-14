import { fetchHeroesAssets, fetchHeroesAnalytics, fetchWikiColors, extractColor, TIER_THRESHOLDS, PATCHES } from "@/lib/deadlock";
import type { MakerHero } from "@/app/TierMaker";

const MIN_MATCHES = 1000;

export async function loadMakerData(): Promise<{
  makerHeroes: MakerHero[];
  metaTiers: Record<string, number[]>;
}> {
  const [heroesMap, wikiColors, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchHeroesAnalytics(PATCHES[0].since),
  ]);

  const statsById = new Map(stats.map((s) => [s.hero_id, s]));

  const makerHeroes: MakerHero[] = Object.values(heroesMap)
    .filter((h) => {
      if (extractColor(h, wikiColors) === null || h.name.startsWith("hero_")) return false;
      const st = statsById.get(h.id);
      return (
        (st?.matches ?? 0) > 0 ||
        (h.player_selectable === true && h.disabled !== true && h.in_development !== true)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => {
      const images = h.images || {};
      const defaultImg = images.icon_hero_card || images.icon_image_small || images.minimap_image || "";

      const gloatKey = Object.keys(images).find((k) => k.toLowerCase().includes("gloat"));
      const critKey = Object.keys(images).find((k) => k.toLowerCase().includes("crit") || k.toLowerCase().includes("low"));

      return {
        id: h.id,
        name: h.name,
        image: defaultImg,
        gloatImage: gloatKey ? images[gloatKey] : defaultImg,
        critImage: critKey ? images[critKey] : defaultImg,
        rgb: extractColor(h, wikiColors),
      };
    });

  const calculateTierKey = (wr: number) => {
    if (wr >= TIER_THRESHOLDS.META) return "META";
    if (wr >= TIER_THRESHOLDS.A) return "A";
    if (wr >= TIER_THRESHOLDS.B) return "B";
    if (wr >= TIER_THRESHOLDS.C) return "C";
    if (wr >= TIER_THRESHOLDS.D) return "D";
    return "F";
  };

  const rankedHeroes = stats
    .filter((s) => (s.matches || 0) >= MIN_MATCHES)
    .map((s) => {
      const matches = s.matches || 0;
      const wins = s.wins ?? Math.round((matches * (s.win_rate ?? 50)) / 100);
      const winRate = s.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);
      return {
        id: s.hero_id,
        winRate,
        tier: calculateTierKey(winRate),
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