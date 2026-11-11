import type { Metadata } from "next";
import { fetchHeroesAssets, fetchHeroesAnalytics, fetchWikiColors, extractColor, TIER_THRESHOLDS, PATCHES } from "@/lib/deadlock";
import type { MakerHero } from "@/app/TierMaker";
import TierMakerClient from "./TierMakerClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • TierMaker de Deadlock",
  description: "Crie, personalize e compartilhe sua própria Tier List de heróis do Deadlock.",
};

export default async function TierMakerPage() {
  const [heroesMap, wikiColors, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchHeroesAnalytics(PATCHES[0].since),
    new Promise((resolve) => setTimeout(resolve, 1500)),
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

  const MIN_MATCHES = 1000;

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

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-6">
      <header>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Deadlock <span className="text-amber-500">TierMaker</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
          Personalize nomes, cores e ordens. Publique sua tier list na comunidade ou compartilhe o link.
        </p>
      </header>

      <TierMakerClient heroes={makerHeroes} metaTiers={metaTiers} />
    </div>
  );
}