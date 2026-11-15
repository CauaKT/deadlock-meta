import type { Metadata } from "next";
import { fetchHeroesAssets, fetchShopItems } from "@/lib/deadlock";
import CalculatorClient, { type CalcHero } from "./CalculatorClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Calculadora de Itens & Atributos",
  description: "Combine até 12 itens da loja de Deadlock com qualquer herói e veja o custo total de almas e atributos somados.",
};

function readStat(stats: Record<string, any> | undefined, key: string): number {
  const raw = stats?.[key]?.value ?? stats?.[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export default async function CalculatorPage() {
  const [heroesMap, shopItems] = await Promise.all([
    fetchHeroesAssets(),
    fetchShopItems(),
  ]);

  const heroes: CalcHero[] = Object.values(heroesMap)
    .filter(
      (h) =>
        h.player_selectable === true &&
        h.disabled !== true &&
        h.in_development !== true &&
        !h.name.startsWith("hero_"),
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
      maxHealth: readStat(h.starting_stats, "max_health"),
      healthRegen: readStat(h.starting_stats, "base_health_regen"),
      moveSpeed: readStat(h.starting_stats, "max_move_speed"),
      stamina: readStat(h.starting_stats, "stamina"),
    }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Calculadora <span className="text-amber-500">de Itens</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide">
          Selecione um herói e combine até 12 itens para calcular o custo total em almas e a soma dos atributos passivos da build.
        </p>
      </header>

      <CalculatorClient heroes={heroes} items={shopItems} />
    </div>
  );
}