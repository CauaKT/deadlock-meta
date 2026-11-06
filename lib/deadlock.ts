// lib/deadlock.ts

export interface HeroAbility {
  id: number;
  slot: number;
  name: string;
  description: string;
  image?: string;
  cooldown?: number | string;
}

export interface HeroAsset {
  id: number;
  name: string;
  description?: any;
  complexity?: number;
  role?: string;
  traits?: string[];
  images?: {
    icon_hero_card?: string;
    icon_image_small?: string;
    minimap_image?: string;
    selection_image?: string;
    horizontal_card?: string;
    [key: string]: any;
  };
  abilities?: HeroAbility[];
  stats?: Record<string, any>;
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
  bannerImage: string;
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

export async function fetchHeroDetails(heroId: number): Promise<HeroAsset | null> {
  try {
    const res = await fetch(`https://api.deadlock-api.com/v1/assets/heroes/${heroId}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Busca as habilidades reais vinculadas ao ID do herói
export async function fetchHeroAbilities(heroId: number): Promise<HeroAbility[]> {
  try {
    const res = await fetch(`https://api.deadlock-api.com/v1/assets/items/by-hero-id/${heroId}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .filter((item: any) => item.type === "ability" || (item.slot >= 1 && item.slot <= 4))
      .map((item: any, idx: number) => ({
        id: item.id || idx + 1,
        slot: item.slot || idx + 1,
        name: item.name || `Habilidade #${idx + 1}`,
        description: item.description?.en || item.description || "",
        image: item.image || item.icon || "",
      }));
  } catch {
    return [];
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
  } catch {
    return [];
  }
}