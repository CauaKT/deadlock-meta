import type { Metadata } from "next";
import { fetchHeroesAssets, fetchHeroBlurbs, fetchHeroAbilitiesFull, extractColor } from "@/lib/deadlock";
import HeroSelect, { type SelectHero } from "./HeroSelect";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Heróis de Deadlock",
  description: "Todos os heróis de Deadlock, carregados da Deadlock API.",
};

export default async function HeroesPage() {
  const [heroesMap, blurbs] = await Promise.all([fetchHeroesAssets(), fetchHeroBlurbs()]);

  // Heróis sem colors.style são internos ou ainda não lançados
  const base = Object.values(heroesMap)
    .filter((h) => extractColor(h) !== null && !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const abilities = await Promise.all(base.map((h) => fetchHeroAbilitiesFull(h.id, h.items)));

  const heroes: SelectHero[] = base.map((h, i) => {
    const file = h.name.trim().replace(/ /g, "_");
    return {
      id: h.id,
      name: h.name,
      rgb: extractColor(h) ?? [245, 158, 11],
      card: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
      art: `https://cdn.deadlock.wiki/thumb/${file}_Render.png/800px-${file}_Render.png`,
      nameSvg: `https://cdn.deadlock.wiki/${file}_name.svg`,
      tags: blurbs[h.id]?.tags ?? [],
      abilities: abilities[i].map((a) => ({ name: a.name, image: a.image })),
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      {heroes.length === 0 ? (
        <p className="text-sm text-rose-400">
          Não foi possível carregar os heróis agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <HeroSelect heroes={heroes} />
      )}
      <p className="mt-4 text-[11px] text-neutral-500">
        Heróis e habilidades carregados da Deadlock API, uma API comunitária não oficial. Arte e fontes são assets do jogo.
      </p>
    </div>
  );
}