import type { Metadata } from "next";
import {
  calculateTier,
  computeHeroMatchStats,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchShopItems,
  getDefaultRank,
  getPlayableHeroes,
  isPlayableHero,
  minMatchesForRank,
  resolveActivePatches,
  resolvePatchWindow,
  SAMPLE_THRESHOLDS,
} from "@/lib/deadlock";
import HomeTracker, {
  type HomeMetaHero,
  type HomePatchMover,
  type HomeTrackerHero,
  type HomeTrackerItem,
} from "./HomeTracker";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Tracker & Estatísticas de Deadlock",
  description:
    "Busque jogadores por link da Steam, Steam ID ou @handle, compare perfis 1v1, confira partidas e acompanhe o meta e o leaderboard.",
};

export default async function Home() {
  const defaultRank = getDefaultRank();
  const minMetaMatches = minMatchesForRank(defaultRank.tier);
  const { allPatches, readyPatches } = await resolveActivePatches({
    rankTier: defaultRank.tier,
    minAverageBadge: defaultRank.minBadge,
  });
  const datedPatches = readyPatches.filter((p) => typeof p.since === "number");
  const currentPatch = datedPatches[0];
  const prevPatch = datedPatches[1];
  const { patchUntil } = resolvePatchWindow(allPatches, currentPatch?.id);

  const [heroesMap, shopItems, statsNow, statsPrev] = await Promise.all([
    fetchHeroesAssets(),
    fetchShopItems(),
    currentPatch
      ? fetchHeroesAnalytics(currentPatch.since, patchUntil, defaultRank.minBadge)
      : fetchHeroesAnalytics(undefined, undefined, defaultRank.minBadge),
    prevPatch && currentPatch
      ? fetchHeroesAnalytics(prevPatch.since, currentPatch.since, defaultRank.minBadge)
      : Promise.resolve([]),
  ]);

  const heroes: HomeTrackerHero[] = getPlayableHeroes(heroesMap).map((h) => ({
    id: h.id,
    name: h.name,
    image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
  }));

  const metaTop: HomeMetaHero[] = statsNow
    .map((s): HomeMetaHero | null => {
      const h = heroesMap[s.hero_id];
      if (!isPlayableHero(h)) return null;
      const { matches, winRate } = computeHeroMatchStats(s);
      if (matches < minMetaMatches) return null;
      return {
        id: h.id,
        name: h.name,
        image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
        matches,
        winRate,
        tier: calculateTier(winRate),
      };
    })
    .filter((x): x is HomeMetaHero => x !== null)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 6);

  const prevByHero = new Map(statsPrev.map((s) => [s.hero_id, s]));
  const allMovers: HomePatchMover[] = [];

  for (const now of statsNow) {
    const prev = prevByHero.get(now.hero_id);
    const h = heroesMap[now.hero_id];
    if (!prev || !isPlayableHero(h)) continue;
    const currStats = computeHeroMatchStats(now);
    const prevStats = computeHeroMatchStats(prev);
    if (
      currStats.matches < SAMPLE_THRESHOLDS.patchTrackerHero ||
      prevStats.matches < SAMPLE_THRESHOLDS.patchTrackerHero
    ) {
      continue;
    }

    const wrNow = currStats.winRate;
    const wrPrev = prevStats.winRate;

    allMovers.push({
      id: h.id,
      name: h.name,
      image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
      winRateNow: wrNow,
      winDelta: wrNow - wrPrev,
    });
  }

  const risers = [...allMovers]
    .filter((m) => m.winDelta > 0)
    .sort((a, b) => b.winDelta - a.winDelta)
    .slice(0, 3);

  const fallers = [...allMovers]
    .filter((m) => m.winDelta < 0)
    .sort((a, b) => a.winDelta - b.winDelta)
    .slice(0, 3);

  const items: HomeTrackerItem[] = shopItems.map((item) => ({
    className: item.className,
    name: item.name,
    image: item.image,
    slot: item.slot,
    cost: item.cost,
  }));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <HomeTracker
        heroes={heroes}
        items={items}
        metaTop={metaTop}
        risers={risers}
        fallers={fallers}
        patchLabel={currentPatch?.label ?? "Patch Atual"}
        prevPatchLabel={prevPatch?.label ?? "Patch Anterior"}
      />
    </div>
  );
}