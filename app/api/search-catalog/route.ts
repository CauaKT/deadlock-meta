import { NextResponse } from "next/server";
import { fetchHeroesAssets, fetchShopItems, getPlayableHeroes, resolveHeroMedia } from "@/lib/deadlock";

export async function GET() {
  try {
    const [heroesMap, shopItems] = await Promise.all([
      fetchHeroesAssets(),
      fetchShopItems(),
    ]);

    const heroes = getPlayableHeroes(heroesMap).map((h) => ({
      id: h.id,
      name: h.name,
      image: resolveHeroMedia(h).icon,
    }));

    const items = shopItems.map((item) => ({
      className: item.className,
      name: item.name,
      image: item.image,
      slot: item.slot,
      cost: item.cost,
    }));

    return NextResponse.json({ heroes, items });
  } catch {
    return NextResponse.json({ heroes: [], items: [] }, { status: 500 });
  }
}