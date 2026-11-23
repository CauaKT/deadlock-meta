import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchHeroesAssets, fetchShopItems, getPlayableHeroes, resolveHeroMedia } from "@/lib/deadlock";
import BuildsClient, { type BuildHeroOption } from "./BuildsClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Builds da Comunidade",
  description: "Monte builds por fase (Early, Mid, Late e Situacional) com itens de Deadlock e compartilhe com a comunidade.",
};

export default async function BuildsPage() {
  const [heroesMap, shopItems] = await Promise.all([
    fetchHeroesAssets(),
    fetchShopItems(),
  ]);

  const heroes: BuildHeroOption[] = getPlayableHeroes(heroesMap).map((h) => ({
    id: h.id,
    name: h.name,
    image: resolveHeroMedia(h).icon,
  }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Criador de <span className="text-amber-500">Builds</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide">
          Monte roteiros de itens por fase (Early, Mid, Late e Situacional), publique na comunidade e compartilhe o link da sua build.
        </p>
      </header>

      <Suspense fallback={null}>
        <BuildsClient heroes={heroes} items={shopItems} />
      </Suspense>
    </div>
  );
}