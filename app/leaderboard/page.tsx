import type { Metadata } from "next";
import { Suspense } from "react";
import {
  extractColor,
  fetchHeroesAssets,
  fetchWikiColors,
  getPlayableHeroes,
  resolveHeroMedia,
} from "@/lib/deadlock";
import LeaderboardClient, { type LeaderboardHeroOption } from "./LeaderboardClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Leaderboard de Deadlock",
  description: "Ranking regional geral e por herói dos melhores jogadores de Deadlock.",
};

export default async function LeaderboardPage() {
  const [heroesMap, wikiColors] = await Promise.all([
    fetchHeroesAssets(),
    fetchWikiColors(),
  ]);
  const heroes: LeaderboardHeroOption[] = getPlayableHeroes(heroesMap).map((h) => ({
    id: h.id,
    name: h.name,
    image: resolveHeroMedia(h).icon,
    rgb: extractColor(h, wikiColors),
  }));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <Suspense fallback={null}>
        <LeaderboardClient heroes={heroes} />
      </Suspense>
    </div>
  );
}