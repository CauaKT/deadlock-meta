import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { fetchHeroesAssets, fetchHeroBlurbs, fetchWikiColors, fetchHeroAbilitiesFull, extractColor, extractHeroTheme } from "@/lib/deadlock";
import HeroSelect, { type SelectHero } from "./HeroSelect";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Heróis de Deadlock",
  description: "Todos os heróis de Deadlock, carregados da Deadlock API.",
};

export default async function HeroesPage() {
  const [heroesMap, blurbs, wikiColors] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroBlurbs(),
    fetchWikiColors(),
  ]);

  // Heróis sem colors.style são internos ou ainda não lançados
  const base = Object.values(heroesMap)
    .filter((h) => extractColor(h, wikiColors) !== null && !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const abilities = await Promise.all(base.map((h) => fetchHeroAbilitiesFull(h.id, h.items)));

  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const localArt = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];
  const heroes: SelectHero[] = base.map((h, i) => {
    const file = h.name.trim().replace(/ /g, "_");
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const local = localArt.find((f) => f.toLowerCase().startsWith(slug));
    const theme = extractHeroTheme(h, wikiColors);
    return {
      id: h.id,
      name: h.name,
      rgb: theme.rgb,
      tagBg: theme.tagBg,
      tagText: theme.tagText,
      card: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
      bg: h.images?.background_image_webp || h.images?.background_image || "",
      art: local ? `/heroes/${local}` : `https://cdn.deadlock.wiki/thumb/${file}_Render.png/800px-${file}_Render.png`,
      nameSvgs: [h.images?.name_image, `https://cdn.deadlock.wiki/${file}_name.svg`].filter(
       (u): u is string => typeof u === "string" && u.startsWith("http"),
      ),
      tags: blurbs[h.id]?.tags ?? [],
      abilities: abilities[i].map((a) => ({ name: a.name, image: a.image })),
    };
  });

  return (
    <div>
      {heroes.length === 0 ? (
        <p className="p-4 text-sm text-rose-400 md:p-10">
          Não foi possível carregar os heróis agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <HeroSelect heroes={heroes} />
      )}
      <p className="px-4 py-3 text-[11px] text-neutral-500 md:px-10">
        Heróis e habilidades carregados da Deadlock API, uma API comunitária não oficial. Arte e fontes são assets do jogo.
      </p>
    </div>
  );
}