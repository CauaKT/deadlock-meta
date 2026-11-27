import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import {
  assignTiersByRank,
  computeHeroMatchStats,
  extractColor,
  extractHeroTheme,
  fetchHeroAbilitiesFull,
  fetchHeroBlurbs,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchHeroSelectVoiceLines,
  fetchWikiColors,
  getDefaultRank,
  isPlayableHero,
  minMatchesForRank,
  resolveActivePatches,
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
  const defaultRank = getDefaultRank();
  const minMatches = minMatchesForRank(defaultRank.tier);
  const { allPatches, firstReadyIndex } = await resolveActivePatches({
    rankTier: defaultRank.tier,
    minAverageBadge: defaultRank.minBadge,
  });
  const { selectedPatch, patchUntil } = resolvePatchWindow(allPatches, undefined, firstReadyIndex);

  const [heroesMap, blurbs, wikiColors, stats, selectVoices] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroBlurbs(),
    fetchWikiColors(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil, defaultRank.minBadge),
    fetchHeroSelectVoiceLines(),
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

  // Mesma regra de classificação e amostra mínima da /tier-list inicial
  const rankedPlayable = assignTiersByRank(
    stats
      .map((s) => {
        const { matches, winRate } = computeHeroMatchStats(s);
        return { heroId: s.hero_id, matches, winRate };
      })
      .filter((row) => isPlayableHero(heroesMap[row.heroId]) && row.matches >= minMatches)
      .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches),
  );
  const tierById = new Map(rankedPlayable.map((r) => [r.heroId, r.tier] as const));

  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const localArt = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];
  const heroes: SelectHero[] = base.map((h, i) => {
    const media = resolveHeroMedia(h, localArt);
    const theme = extractHeroTheme(h, wikiColors);
    const st = statsById.get(h.id);
    const blurb = blurbs[h.id];
    const shortKey = typeof h.class_name === "string" ? h.class_name.replace(/^hero_/, "") : "";
    const hasEnoughSample = Boolean(st && st.matches >= minMatches);
    return {
      id: h.id,
      name: h.name,
      searchName: typeof h.search_name === "string" ? h.search_name : "",
      heroType: typeof h.hero_type === "string" ? h.hero_type : "",
      rgb: theme.rgb,
      tagBg: theme.tagBg,
      tagText: theme.tagText,
      titleColor: theme.titleColor,
      card: media.card,
      bg: media.bg,
      art: media.art,
      nameSvgs: media.nameSvgs,
      tags: blurb?.tags ?? [],
      selectSounds: shortKey ? (selectVoices[shortKey] ?? []) : [],
      abilities: abilities[i],
      matches: st?.matches ?? 0,
      winRate: hasEnoughSample ? (st?.winRate ?? null) : null,
      tier: tierById.get(h.id) ?? null,
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
        <HeroSelect heroes={heroes} />
      )}
    </div>
  );
}