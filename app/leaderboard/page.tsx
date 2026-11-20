import type { Metadata } from "next";
import { fetchHeroesAssets } from "@/lib/deadlock";
import LeaderboardClient, { type LeaderboardHeroOption } from "./LeaderboardClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Leaderboard de Deadlock",
  description: "Ranking regional geral e por herói dos melhores jogadores de Deadlock.",
};

export default async function LeaderboardPage() {
  const heroesMap = await fetchHeroesAssets();
  const heroes: LeaderboardHeroOption[] = Object.values(heroesMap)
    .filter((h) => h.player_selectable !== false && h.disabled !== true)
    .map((h) => ({
      id: h.id,
      name: h.name,
      image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <LeaderboardClient heroes={heroes} />
    </div>
  );
}