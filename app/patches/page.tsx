import type { Metadata } from "next";
import RankSelect from "@/app/RankSelect";
import {
  computeHeroMatchStats,
  extractColor,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchItemsAnalytics,
  fetchOfficialPatchNotes,
  fetchShopItems,
  fetchWikiColors,
  isPlayableHero,
  RANK_FILTERS,
  resolveActivePatches,
  resolvePatchWindow,
  resolveRankFilter,
  SAMPLE_THRESHOLDS,
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
  searchParams: Promise<{ patch?: string; rank?: string }>;
}) {
  const { patch: patchParam, rank: rankParam } = await searchParams;
  const selectedRank = resolveRankFilter(rankParam);
  const { allPatches, patches, firstReadyIndex } = await resolveActivePatches({
    rankTier: selectedRank.tier,
    minAverageBadge: selectedRank.minBadge,
  });
  const datedPatches = patches.filter((p) => typeof p.since === "number");
  const selectablePatches = datedPatches.slice(0, -1); // precisa de um patch anterior para comparar
  const targetPatchId = patchParam ?? patches[firstReadyIndex]?.id;

  const selectedIdx = Math.max(
    0,
    selectablePatches.findIndex((p) => p.id === targetPatchId),
  );
  const currentPatch = selectablePatches[selectedIdx];
  const prevPatch = datedPatches[selectedIdx + 1];
  const { patchUntil: currentUntil } = resolvePatchWindow(allPatches, currentPatch.id);

  const [
    heroesMap,
    wikiColors,
    shopItems,
    heroStatsNow,
    heroStatsPrev,
    itemStatsNow,
    itemStatsPrev,
    officialNotes,
  ] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchShopItems(),
    fetchHeroesAnalytics(currentPatch.since, currentUntil, selectedRank.minBadge),
    fetchHeroesAnalytics(prevPatch.since, currentPatch.since, selectedRank.minBadge),
    fetchItemsAnalytics(currentPatch.since, currentUntil),
    fetchItemsAnalytics(prevPatch.since, currentPatch.since),
    fetchOfficialPatchNotes(),
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
    const currStats = computeHeroMatchStats(now);
    const prevStats = computeHeroMatchStats(prev);
    const matchesNow = currStats.matches;
    const matchesPrev = prevStats.matches;
    if (
      matchesNow < SAMPLE_THRESHOLDS.patchTrackerHero ||
      matchesPrev < SAMPLE_THRESHOLDS.patchTrackerHero
    ) {
      continue;
    }

    const hero = heroesMap[now.hero_id];
    if (!isPlayableHero(hero)) continue;

    const winRateNow = currStats.winRate;
    const winRatePrev = prevStats.winRate;

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
    if (
      now.matches < SAMPLE_THRESHOLDS.patchTrackerItem ||
      prev.matches < SAMPLE_THRESHOLDS.patchTrackerItem
    ) {
      continue;
    }

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

      {officialNotes.length > 0 && (
        <section className="space-y-2.5">
          <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-amber-400">
            Notas Oficiais Recentes (Steam)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {officialNotes.map((note) => (
              <a
                key={note.link}
                href={note.link}
                target="_blank"
                rel="noopener noreferrer"
                className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-3.5 transition-colors hover:border-amber-500/50 space-y-1.5"
              >
                <p className="font-mono text-[10px] text-neutral-400">
                  {new Date(note.pub_date).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-xs font-bold text-[#f4efe6] line-clamp-2">
                  {note.title}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <RankSelect ranks={RANK_FILTERS} selected={selectedRank.id} />
      </div>

      <PatchTrackerClient
        patches={selectablePatches.map((p) => ({ id: p.id, label: p.label }))}
        selectedPatchId={currentPatch.id}
        selectedRankId={selectedRank.id}
        prevPatchLabel={prevPatch.label}
        heroes={heroesDelta}
        items={itemsDelta}
      />
    </div>
  );
}