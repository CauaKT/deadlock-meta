import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBuildById } from "@/lib/backend/server";
import { fetchHeroesAssets, fetchShopItems } from "@/lib/deadlock";
import BuildDetail from "./BuildDetail";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const build = await getPublicBuildById(id);
  if (!build) return { title: "LockPro • Build não encontrada" };
  return {
    title: `LockPro • ${build.title}`,
    description: `Build de Deadlock criada por ${build.author}.`,
  };
}

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [build, heroesMap, shopItems] = await Promise.all([
    getPublicBuildById(id),
    fetchHeroesAssets(),
    fetchShopItems(),
  ]);

  if (!build) notFound();

  const hero = heroesMap[build.heroId];
  const heroName = hero?.name || `Herói #${build.heroId}`;
  const heroImage =
    hero?.images?.icon_image_small ||
    hero?.images?.minimap_image ||
    hero?.images?.icon_hero_card ||
    null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10">
      <BuildDetail build={build} heroName={heroName} heroImage={heroImage} items={shopItems} />
    </div>
  );
}