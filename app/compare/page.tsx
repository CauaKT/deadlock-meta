import type { Metadata } from "next";
import { extractColor, fetchHeroesAssets, fetchWikiColors } from "@/lib/deadlock";
import CompareClient, { type CompareHeroMeta } from "./CompareClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Comparador de Jogadores 1v1",
  description:
    "Compare estatísticas de Deadlock lado a lado entre dois jogadores: win rate, KDA, almas/min, dano/min e melhores heróis.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const [heroesMap, wikiColors] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
  ]);
  const heroes: CompareHeroMeta[] = Object.values(heroesMap)
    .filter((h) => h.player_selectable !== false && h.disabled !== true)
    .map((h) => {
      const file = h.name.trim().replace(/ /g, "_");
      return {
        id: h.id,
        name: h.name,
        image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
        banner:
          h.images?.background_image_webp ??
          h.images?.background_image ??
          h.images?.icon_hero_card ??
          null,
        art: `https://cdn.deadlock.wiki/thumb/${file}_Render.png/400px-${file}_Render.png`,
        rgb: extractColor(h, wikiColors),
      };
    });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6 space-y-2">
        <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
          Análise Comparativa
        </p>
        <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Comparador <span className="text-amber-500">1v1</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
          Compare win rate, KDA, almas por minuto, dano e melhores heróis entre dois jogadores usando link da Steam ou ID.
        </p>
      </header>

      <CompareClient heroes={heroes} initialA={a} initialB={b} />
    </div>
  );
}