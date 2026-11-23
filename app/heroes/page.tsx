import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import {
  computeHeroMatchStats,
  extractColor,
  extractHeroTheme,
  fetchHeroAbilitiesFull,
  fetchHeroBlurbs,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchPatches,
  fetchWikiColors,
  getDefaultRank,
  isPlayableHero,
  minMatchesForRank,
  resolveHeroMedia,
  resolvePatchWindow,
} from "@/lib/deadlock";
import HeroSelect, { type SelectHero } from "./HeroSelect";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Heróis de Deadlock",
  description: "Todos os heróis de Deadlock, carregados da Deadlock API.",
};

export default async function HeroesPage() {
  const patches = await fetchPatches();
  const { selectedPatch, patchUntil } = resolvePatchWindow(patches);
  const defaultRank = getDefaultRank();
  const minMatches = minMatchesForRank(defaultRank.tier);

  const [heroesMap, blurbs, wikiColors, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroBlurbs(),
    fetchWikiColors(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil, defaultRank.minBadge),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  // Heróis sem tema/cor são internos ou ainda não lançados
  const base = Object.values(heroesMap)
    .filter((h) => extractColor(h, wikiColors) !== null && !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const abilities = await Promise.all(base.map((h) => fetchHeroAbilitiesFull(h.id, h.items)));

  const statsById = new Map(
    stats.map((s) => {
      const { matches, winRate } = computeHeroMatchStats(s);
      return [s.hero_id, { matches, winRate }] as const;
    }),
  );

  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const localArt = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];
  const heroes: SelectHero[] = base.map((h, i) => {
    const media = resolveHeroMedia(h, localArt);
    const theme = extractHeroTheme(h, wikiColors);
    const st = statsById.get(h.id);
    return {
      id: h.id,
      name: h.name,
      rgb: theme.rgb,
      tagBg: theme.tagBg,
      tagText: theme.tagText,
      card: media.card,
      bg: media.bg,
      art: media.art,
      nameSvgs: media.nameSvgs,
      tags: blurbs[h.id]?.tags ?? [],
      abilities: abilities[i],
      matches: st?.matches ?? 0,
      winRate: st && st.matches >= minMatches ? st.winRate : null,
      // Lançado se possuir partidas registradas no analytics ou se a API marcar explicitamente como jogável
      released: (st?.matches ?? 0) > 0 || isPlayableHero(h),
    };
  });

  return (
    <div>
      {heroes.length === 0 ? (
        <p className="p-4 text-sm text-rose-400 md:p-10">
          Não foi possível carregar os heróis agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <HeroSelect heroes={heroes} statsLabel={patches[0].label} />
      )}
    </div>
  );
}