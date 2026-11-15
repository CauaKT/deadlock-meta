import { NextResponse } from "next/server";
import { fetchHeroesAssets, fetchShopItems } from "@/lib/deadlock";

export async function GET() {
  try {
    const [heroesMap, shopItems] = await Promise.all([
      fetchHeroesAssets(),
      fetchShopItems(),
    ]);

    const heroes = Object.values(heroesMap)
      .filter(
        (h) =>
          h.player_selectable === true &&
          h.disabled !== true &&
          h.in_development !== true,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((h) => ({
        id: h.id,
        name: h.name,
        image:
          h.images?.icon_image_small ||
          h.images?.minimap_image ||
          h.images?.icon_hero_card ||
          null,
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