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
    <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6 space-y-2">
        <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
          Competitivo
        </p>
        <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Leader<span className="text-amber-500">board</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
          Confira os melhores jogadores por região e por herói específico, com cache persistente e acesso direto ao perfil público.
        </p>
      </header>

      <LeaderboardClient heroes={heroes} />
    </div>
  );
}