import type { Metadata } from "next";
import { fetchHeroesAssets, fetchHeroesAnalytics, fetchWikiColors, extractColor, PATCHES } from "@/lib/deadlock";
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

  const metaTiers: Record<string, number[]> = {
    META: stats.filter((s) => (s.win_rate ?? 0) >= 53.5).map((s) => s.hero_id),
    A: stats.filter((s) => (s.win_rate ?? 0) >= 51.5 && (s.win_rate ?? 0) < 53.5).map((s) => s.hero_id),
    B: stats.filter((s) => (s.win_rate ?? 0) >= 50.0 && (s.win_rate ?? 0) < 51.5).map((s) => s.hero_id),
    C: stats.filter((s) => (s.win_rate ?? 0) >= 48.5 && (s.win_rate ?? 0) < 50.0).map((s) => s.hero_id),
    D: stats.filter((s) => (s.win_rate ?? 0) >= 47.0 && (s.win_rate ?? 0) < 48.5).map((s) => s.hero_id),
    F: stats.filter((s) => (s.win_rate ?? 0) < 47.0).map((s) => s.hero_id),
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