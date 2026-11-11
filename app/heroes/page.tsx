import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { fetchHeroesAssets, fetchHeroesAnalytics, fetchHeroBlurbs, fetchWikiColors, fetchHeroAbilitiesFull, extractColor, extractHeroTheme, PATCHES } from "@/lib/deadlock";
import HeroSelect, { type SelectHero } from "./HeroSelect";

export const instant = false;

// Mesmo limite da Home: abaixo disso o winrate é amostra pequena demais para ordenar
const MIN_MATCHES = 1000;

export const metadata: Metadata = {
  title: "LockPro • Heróis de Deadlock",
  description: "Todos os heróis de Deadlock, carregados da Deadlock API.",
};

export default async function HeroesPage() {
  const [heroesMap, blurbs, wikiColors, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroBlurbs(),
    fetchWikiColors(),
    fetchHeroesAnalytics(PATCHES[0].since),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  // Heróis sem colors.style são internos ou ainda não lançados
  const base = Object.values(heroesMap)
    .filter((h) => extractColor(h, wikiColors) !== null && !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const abilities = await Promise.all(base.map((h) => fetchHeroAbilitiesFull(h.id, h.items)));

  const statsById = new Map(
    stats.map((s) => {
      const matches = s.matches || 0;
      const wins = s.wins ?? Math.round((matches * (s.win_rate ?? 50)) / 100);
      const winRate = s.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);
      return [s.hero_id, { matches, winRate }] as const;
    }),
  );

  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const localArt = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];
  const heroes: SelectHero[] = base.map((h, i) => {
    const file = h.name.trim().replace(/ /g, "_");
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const local = localArt.find((f) => f.toLowerCase().startsWith(slug));
    const theme = extractHeroTheme(h, wikiColors);
    const st = statsById.get(h.id);
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
      abilities: abilities[i],
      matches: st?.matches ?? 0,
      winRate: st && st.matches >= MIN_MATCHES ? st.winRate : null,
      // Lançado se possuir partidas registradas no analytics ou se a API marcar explicitamente como jogável
      released: (st?.matches ?? 0) > 0 || (h.player_selectable === true && h.disabled !== true && h.in_development !== true),
    };
  });

  return (
    <div>
      {heroes.length === 0 ? (
        <p className="p-4 text-sm text-rose-400 md:p-10">
          Não foi possível carregar os heróis agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <HeroSelect heroes={heroes} statsLabel={PATCHES[0].label} />
      )}
    </div>
  );
}