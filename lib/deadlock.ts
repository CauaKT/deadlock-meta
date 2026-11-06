// lib/deadlock.ts

export interface HeroAsset {
  id: number;
  name: string;
  images?: {
    icon_hero_card?: string;
    icon_image_small?: string;
    minimap_image?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface HeroAnalytics {
  hero_id: number;
  matches: number;
  wins?: number;
  losses?: number;
  win_rate?: number;
  [key: string]: any;
}

export interface MergedHero {
  id: number;
  name: string;
  image: string;
  defaultImage?: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export async function fetchHeroesAssets(): Promise<Record<number, HeroAsset>> {
  try {
    const res = await fetch("https://api.deadlock-api.com/v1/assets/heroes", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return {};

    const data: HeroAsset[] = await res.json();
    return data.reduce((acc, hero) => {
      acc[hero.id] = hero;
      return acc;
    }, {} as Record<number, HeroAsset>);
  } catch (err) {
    console.error("❌ Falha ao buscar assets:", err);
    return {};
  }
}

export async function fetchHeroesAnalytics(): Promise<HeroAnalytics[]> {
  try {
    const res = await fetch("https://api.deadlock-api.com/v1/analytics/hero-stats", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : Object.values(data);
  } catch (err) {
    console.error("❌ Falha ao buscar analytics:", err);
    return [];
  }
}