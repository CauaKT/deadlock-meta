import type { Metadata } from "next";
import {
  extractColor,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchItemsAnalytics,
  fetchShopItems,
  fetchWikiColors,
  PATCHES,
} from "@/lib/deadlock";
import PatchTrackerClient, {
  type PatchHeroDelta,
  type PatchItemDelta,
} from "./PatchTrackerClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Impacto de Patches (Patch Tracker)",
  description: "Acompanhe quais heróis e itens ganharam ou perderam mais win rate e pick rate entre os patches de Deadlock.",
};

export default async function PatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ patch?: string }>;
}) {
  const { patch: patchParam } = await searchParams;
  const datedPatches = PATCHES.filter((p) => typeof p.since === "number");
  const selectablePatches = datedPatches.slice(0, -1); // precisa de um patch anterior para comparar

  const selectedIdx = Math.max(
    0,
    selectablePatches.findIndex((p) => p.id === patchParam),
  );
  const currentPatch = selectablePatches[selectedIdx];
  const prevPatch = datedPatches[selectedIdx + 1];
  const currentUntil = selectedIdx > 0 ? datedPatches[selectedIdx - 1].since : undefined;

  const [
    heroesMap,
    wikiColors,
    shopItems,
    heroStatsNow,
    heroStatsPrev,
    itemStatsNow,
    itemStatsPrev,
  ] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchShopItems(),
    fetchHeroesAnalytics(currentPatch.since, currentUntil),
    fetchHeroesAnalytics(prevPatch.since, currentPatch.since),
    fetchItemsAnalytics(currentPatch.since, currentUntil),
    fetchItemsAnalytics(prevPatch.since, currentPatch.since),
  ]);

  const totalHeroMatchesNow = heroStatsNow.reduce((sum, s) => sum + (s.matches || 0), 0);
  const totalHeroMatchesPrev = heroStatsPrev.reduce((sum, s) => sum + (s.matches || 0), 0);
  const totalGamesNow = Math.max(1, totalHeroMatchesNow / 12);
  const totalGamesPrev = Math.max(1, totalHeroMatchesPrev / 12);

  const prevHeroById = new Map(heroStatsPrev.map((s) => [s.hero_id, s]));
  const heroesDelta: PatchHeroDelta[] = [];

  for (const now of heroStatsNow) {
    const prev = prevHeroById.get(now.hero_id);
    if (!prev) continue;
    const matchesNow = now.matches || 0;
    const matchesPrev = prev.matches || 0;
    if (matchesNow < 300 || matchesPrev < 300) continue;

    const hero = heroesMap[now.hero_id];
    if (!hero || hero.name.startsWith("hero_")) continue;

    const winsNow = now.wins ?? Math.round((matchesNow * (now.win_rate ?? 50)) / 100);
    const winsPrev = prev.wins ?? Math.round((matchesPrev * (prev.win_rate ?? 50)) / 100);
    const winRateNow = now.win_rate ?? (winsNow / matchesNow) * 100;
    const winRatePrev = prev.win_rate ?? (winsPrev / matchesPrev) * 100;

    const pickRateNow = (matchesNow / totalGamesNow) * 100;
    const pickRatePrev = (matchesPrev / totalGamesPrev) * 100;

    heroesDelta.push({
      id: now.hero_id,
      name: hero.name,
      image:
        hero.images?.icon_image_small ||
        hero.images?.minimap_image ||
        hero.images?.icon_hero_card ||
        null,
      rgb: extractColor(hero, wikiColors),
      winRateNow,
      winRatePrev,
      winDelta: winRateNow - winRatePrev,
      pickRateNow,
      pickRatePrev,
      pickDelta: pickRateNow - pickRatePrev,
      matchesNow,
    });
  }

  const prevItemById = new Map(itemStatsPrev.map((s) => [s.item_id, s]));
  const nowItemById = new Map(itemStatsNow.map((s) => [s.item_id, s]));
  const itemsDelta: PatchItemDelta[] = [];

  for (const item of shopItems) {
    if (!item.id) continue;
    const now = nowItemById.get(item.id);
    const prev = prevItemById.get(item.id);
    if (!now || !prev) continue;
    if (now.matches < 500 || prev.matches < 500) continue;

    const winRateNow = (now.wins / now.matches) * 100;
    const winRatePrev = (prev.wins / prev.matches) * 100;
    const pickRateNow = (now.matches / totalGamesNow) * 100;
    const pickRatePrev = (prev.matches / totalGamesPrev) * 100;

    itemsDelta.push({
      id: item.id,
      className: item.className,
      name: item.name,
      image: item.image,
      slot: item.slot,
      cost: item.cost,
      winRateNow,
      winRatePrev,
      winDelta: winRateNow - winRatePrev,
      pickRateNow,
      pickRatePrev,
      pickDelta: pickRateNow - pickRatePrev,
      matchesNow: now.matches,
    });
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Patch <span className="text-amber-500">Tracker</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide">
          Impacto real de cada atualização no meta: variação de Win Rate e Pick Rate de heróis e itens em comparação com o patch anterior.
        </p>
      </header>

      <PatchTrackerClient
        patches={selectablePatches.map((p) => ({ id: p.id, label: p.label }))}
        selectedPatchId={currentPatch.id}
        prevPatchLabel={prevPatch.label}
        heroes={heroesDelta}
        items={itemsDelta}
      />
    </div>
  );
}