import type { Metadata } from "next";
import { fetchHeroesAssets } from "@/lib/deadlock";
import HomeTracker from "./HomeTracker";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Tracker & Estatísticas de Deadlock",
  description:
    "Busque jogadores por Steam ID, link da Steam ou @handle, confira partidas por Match ID e acompanhe partidas recentes de alto MMR.",
};

export default async function Home() {
  const heroesMap = await fetchHeroesAssets();
  const heroes = Object.values(heroesMap).map((h) => ({
    id: h.id,
    name: h.name,
    image: h.images?.icon_image_small ?? h.images?.icon_hero_card ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <HomeTracker heroes={heroes} />
    </div>
  );
}