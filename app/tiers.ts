// app/tiers.ts
// Tipos e faixas compartilhados entre /tier-list e /tier-maker.
// Fica fora de page.tsx porque arquivos de rota não podem exportar valores arbitrários.

export interface MakerHero {
  id: number;
  name: string;
  image: string;
  icon?: string;
  bgImage?: string;
  bannerImage?: string;
  gloatImage?: string;
  critImage?: string;
  rgb: [number, number, number] | null;
  tags?: string[];
  matches?: number;
  winRate?: number;
  pickRate?: number;
  metaTier?: TierKey;
}

export type TierKey = "META" | "A" | "B" | "C" | "D" | "F";

export interface TierConfig {
  key: TierKey;
  label: string;
  badgeBg: string;
  badgeText: string;
}

export const TIERS: TierConfig[] = [
  { key: "META", label: "META", badgeBg: "bg-cyan-400", badgeText: "text-black" },
  { key: "A", label: "A", badgeBg: "bg-green-500", badgeText: "text-black" },
  { key: "B", label: "B", badgeBg: "bg-lime-400", badgeText: "text-black" },
  { key: "C", label: "C", badgeBg: "bg-yellow-400", badgeText: "text-black" },
  { key: "D", label: "D", badgeBg: "bg-orange-500", badgeText: "text-black" },
  { key: "F", label: "F", badgeBg: "bg-red-600", badgeText: "text-black" },
];

export const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<TierKey, TierConfig>;