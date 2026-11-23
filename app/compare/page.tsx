import type { Metadata } from "next";
import {
  extractColor,
  fetchHeroesAssets,
  fetchWikiColors,
  getPlayableHeroes,
  resolveHeroMedia,
} from "@/lib/deadlock";
import CompareBackButton from "./CompareBackButton";
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
  const heroes: CompareHeroMeta[] = getPlayableHeroes(heroesMap).map((h) => {
    const media = resolveHeroMedia(h);
    return {
      id: h.id,
      name: h.name,
      image: media.icon,
      banner: media.bg || media.card || null,
      art: media.art,
      rgb: extractColor(h, wikiColors),
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div className="space-y-2">
          <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
            Análise Comparativa
          </p>
          <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Comparador <span className="text-amber-500">1v1</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
            Compare win rate, KDA, almas por minuto, dano e melhores heróis entre dois jogadores usando link da Steam ou ID.
          </p>
        </div>
        <CompareBackButton />
      </header>

      <CompareClient heroes={heroes} initialA={a} initialB={b} />
    </div>
  );
}