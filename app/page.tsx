import type { Metadata } from "next";
import {
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchShopItems,
  fetchPatches,
  TIER_THRESHOLDS,
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

function calcTier(winRate: number): string {
  if (winRate >= TIER_THRESHOLDS.META) return "META";
  if (winRate >= TIER_THRESHOLDS.A) return "A";
  if (winRate >= TIER_THRESHOLDS.B) return "B";
  if (winRate >= TIER_THRESHOLDS.C) return "C";
  if (winRate >= TIER_THRESHOLDS.D) return "D";
  return "F";
}

export default async function Home() {
  const patches = await fetchPatches();
  const datedPatches = patches.filter((p) => typeof p.since === "number");
  const currentPatch = datedPatches[0];
  const prevPatch = datedPatches[1];

  const [heroesMap, shopItems, statsNow, statsPrev] = await Promise.all([
    fetchHeroesAssets(),
    fetchShopItems(),
    currentPatch ? fetchHeroesAnalytics(currentPatch.since) : fetchHeroesAnalytics(),
    prevPatch && currentPatch
      ? fetchHeroesAnalytics(prevPatch.since, currentPatch.since)
      : Promise.resolve([]),
  ]);

  const heroes: HomeTrackerHero[] = Object.values(heroesMap)
    .filter(
      (h) =>
        h.player_selectable === true &&
        h.disabled !== true &&
        h.in_development !== true &&
        !h.name.startsWith("hero_"),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
    }));

  const metaTop: HomeMetaHero[] = statsNow
    .map((s) => {
      const h = heroesMap[s.hero_id];
      if (!h || h.name.startsWith("hero_") || !s.matches || s.matches < 500) return null;
      const wins = s.wins ?? Math.round((s.matches * (s.win_rate ?? 50)) / 100);
      const winRate = s.win_rate ?? (wins / s.matches) * 100;
      return {
        id: h.id,
        name: h.name,
        image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
        matches: s.matches,
        winRate,
        tier: calcTier(winRate),
      };
    })
    .filter((x): x is HomeMetaHero => x !== null)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 6);

  const prevByHero = new Map(statsPrev.map((s) => [s.hero_id, s]));
  const allMovers: HomePatchMover[] = [];

  for (const now of statsNow) {
    const prev = prevByHero.get(now.hero_id);
    if (!prev || now.matches < 300 || prev.matches < 300) continue;
    const h = heroesMap[now.hero_id];
    if (!h || h.name.startsWith("hero_")) continue;

    const winsNow = now.wins ?? Math.round((now.matches * (now.win_rate ?? 50)) / 100);
    const winsPrev = prev.wins ?? Math.round((prev.matches * (prev.win_rate ?? 50)) / 100);
    const wrNow = now.win_rate ?? (winsNow / now.matches) * 100;
    const wrPrev = prev.win_rate ?? (winsPrev / prev.matches) * 100;

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