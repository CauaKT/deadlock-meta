// app/page.tsx
/* eslint-disable @next/next/no-img-element */
import { fetchHeroesAssets, fetchHeroesAnalytics, fetchHeroBlurbs, fetchWikiColors, extractColor, MergedHero, TIER_THRESHOLDS, PATCHES } from "@/lib/deadlock";
import Link from "next/link";
import type { CSSProperties } from "react";
import PatchSelect from "./PatchSelect";
import TierListTabs from "./TierListTabs";
import type { MakerHero } from "./TierMaker";
import { TIERS, TIER_BY_KEY, type TierKey } from "./tiers";
import fs from "fs";
import path from "path";

export const instant = false;

function tagColors(rgb?: [number, number, number] | null) {
  const bg = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : "#f1d36b";
  const lum = rgb ? 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] : 200;
  return { backgroundColor: bg, color: lum > 150 ? "#1a1608" : "#ffffff" };
}
function calculateTier(winRate: number): TierKey {
  if (winRate >= TIER_THRESHOLDS.META) return "META";
  if (winRate >= TIER_THRESHOLDS.A) return "A";
  if (winRate >= TIER_THRESHOLDS.B) return "B";
  if (winRate >= TIER_THRESHOLDS.C) return "C";
  if (winRate >= TIER_THRESHOLDS.D) return "D";
  return "F";
}

const MIN_MATCHES = 1000;

const heroesDir = path.join(process.cwd(), "public", "heroes");
const localHeroFiles = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ patch?: string }>;
}) {
  const { patch: patchParam } = await searchParams;
  const selectedPatch = PATCHES.find((p) => p.id === patchParam) ?? PATCHES[0];
  const selectedIndex = PATCHES.findIndex((p) => p.id === selectedPatch.id);
  const patchUntil =
    selectedPatch.since && selectedIndex > 0 ? PATCHES[selectedIndex - 1].since : undefined;
  const [heroesMap, stats, blurbs, wikiColors] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil),
    fetchHeroBlurbs(),
    fetchWikiColors(),
  ]);

  const heroesRanking: (MergedHero & { tier: TierKey })[] = stats
    .map((stat) => {
      const hero = heroesMap[stat.hero_id];
      const matches = stat.matches || 0;
      const wins = stat.wins ?? Math.round((matches * (stat.win_rate ?? 50)) / 100);
      const losses = stat.losses ?? (matches - wins);
      const winRate = stat.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);
      const tier = calculateTier(winRate);

      const images = hero?.images || {};
      const defaultImage =
        images.icon_hero_card ||
        images.icon_image_small ||
        images.minimap_image ||
        "";

      let image = defaultImage;

      if (tier === "META") {
        const gloatKey = Object.keys(images).find((k) =>
          k.toLowerCase().includes("gloat")
        );
        if (gloatKey && images[gloatKey]) {
          image = images[gloatKey];
        }
      }

      if (tier === "F") {
        const critKey = Object.keys(images).find((k) =>
          k.toLowerCase().includes("crit") || k.toLowerCase().includes("low")
        );
        if (critKey && images[critKey]) {
          image = images[critKey];
        }
      }

      const heroSlug = (hero?.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const matchedFile = heroSlug
        ? localHeroFiles.find((f) => f.toLowerCase().startsWith(heroSlug))
        : undefined;
      let bannerImage = matchedFile ? `/heroes/${matchedFile}` : defaultImage;

      if (bannerImage === defaultImage && hero?.name) {
        const formattedName = hero.name.trim().replace(/ /g, "_");
        bannerImage = `https://cdn.deadlock.wiki/thumb/${formattedName}_Render.png/800px-${formattedName}_Render.png`;
      }

      return {
        id: stat.hero_id,
        name: hero?.name || `Herói #${stat.hero_id}`,
        image,
        bannerImage,
        rgb: extractColor(hero, wikiColors),
        tags: blurbs[stat.hero_id]?.tags ?? [],
        matches,
        wins,
        losses,
        winRate,
        tier,
      };
    })
    .filter((h) => h.matches >= MIN_MATCHES && !h.name.startsWith("hero_"))
    .sort((a, b) => b.winRate - a.winRate);

  const heroesByTier = TIERS.reduce((acc, tier) => {
    acc[tier.key] = heroesRanking.filter((hero) => hero.tier === tier.key);
    return acc;
  }, {} as Record<TierKey, (MergedHero & { tier: TierKey })[]>);

  // Montador: apenas heróis lançados (com partidas registradas ou liberados na API)
  const statsById = new Map(stats.map((s) => [s.hero_id, s]));
  const makerHeroes: MakerHero[] = Object.values(heroesMap)
    .filter((h) => {
      if (extractColor(h, wikiColors) === null || h.name.startsWith("hero_")) return false;
      const st = statsById.get(h.id);
      return (
        (st?.matches ?? 0) > 0 ||
        (h.player_selectable === true && h.disabled !== true && h.in_development !== true)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      image: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
      rgb: extractColor(h, wikiColors),
    }));
  const metaTiers = Object.fromEntries(
    TIERS.map((t) => [t.key, heroesByTier[t.key].map((h) => h.id)]),
  ) as Record<TierKey, number[]>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Deadlock <span className="text-amber-500">Tier List</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
            A hierarquia das almas na Cidade Amaldiçoada. Desempenho e domínio ritualístico calculados a partir dos dados da Deadlock API.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <Link
            href="/tier-maker"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-[5px] border border-amber-300/70 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_22px_rgba(245,158,11,0.6)] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-2 leading-none">
              <span>TierMaker</span>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M1 8a.75.75 0 0 1 .75-.75h9.793L8.27 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.273-3.22H1.75A.75.75 0 0 1 1 8Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </Link>
          <PatchSelect
            patches={PATCHES.map(({ id, label }) => ({ id, label }))}
            selected={selectedPatch.id}
          />
        </div>
      </header>
      
      {heroesRanking.length === 0 && (
        <p className="mb-6 text-sm text-rose-400">
          Não foi possível carregar os dados da API agora. Tente novamente em alguns minutos.
        </p>
      )}

      {/* PRANCHA CONTÍNUA DA TIER LIST DO META */}
      {/* PRANCHA CONTÍNUA TIERMAKER */}
      <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 backdrop-blur-sm divide-y divide-neutral-800/90 shadow-2xl">
        {TIERS.map((tier, tierIndex) => {
          const heroesInTier = heroesByTier[tier.key] || [];
          const isFirst = tierIndex === 0;
          const isLast = tierIndex === TIERS.length - 1;

          return (
            <div
              key={tier.key}
              className={`flex flex-row min-h-[105px] transition-colors ${
                isFirst ? "rounded-t-2xl" : ""
              } ${isLast ? "rounded-b-2xl" : ""}`}
            >
              {/* Coluna da Letra do Tier à Esquerda */}
              <div
                className={`w-20 sm:w-28 md:w-32 flex-shrink-0 flex items-center justify-center p-2 text-center select-none ${tier.badgeBg} ${tier.badgeText} ${
                  isFirst ? "rounded-tl-2xl" : ""
                } ${isLast ? "rounded-bl-2xl" : ""}`}
              >
                <span className="font-deadlock text-base sm:text-lg md:text-xl font-black tracking-wider leading-none">
                  {tier.label}
                </span>
              </div>

              {/* Área dos Heróis à Direita */}
              <div
                className={`flex-1 p-2 sm:p-3 flex flex-wrap items-center content-center gap-2 sm:gap-2.5 bg-neutral-950/75 ${
                  isFirst ? "rounded-tr-2xl" : ""
                } ${isLast ? "rounded-br-2xl" : ""}`}
              >
                {heroesInTier.length === 0 ? (
                  <span className="text-xs text-neutral-600 italic px-2">
                    Sem heróis neste tier
                  </span>
                ) : (
                  heroesInTier.map((hero) => (
                    <Link
                      key={hero.id}
                      href={`/heroes/${hero.id}?patch=${selectedPatch.id}`}
                      className="group relative flex flex-col items-center bg-neutral-900/40 border border-neutral-800/70 rounded-xl w-[76px] sm:w-[84px] hover:border-amber-500/80 hover:scale-105 hover:z-30 transition-all duration-150 shadow-md cursor-pointer"
                      style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
                    >
                      {/* Imagem do Herói (QUADRADA) */}
                      <div className="hero-card-art w-full aspect-square relative flex items-center justify-center overflow-hidden rounded-t-xl">
                        {hero.image ? (
                          <img
                            src={hero.image}
                            alt={hero.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                        ) : (
                          <span className="font-extrabold text-neutral-500 text-sm">
                            {hero.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        {/* Tag de Win Rate */}
                        <div
                          className={`absolute bottom-0 inset-x-0 bg-black/35 backdrop-blur-[2px] py-0.5 text-center text-[10px] sm:text-[11px] font-black ${
                            hero.winRate >= 50
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {hero.winRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* Nome do Herói */}
                      <div className="w-full py-1.5 px-1 text-center bg-transparent">
                        <p className="text-[11px] font-bold text-neutral-200 truncate leading-tight group-hover:text-amber-400 transition-colors">
                          {hero.name}
                        </p>
                      </div>

                      {/* BANNER 16:9 COM A ARTE OFICIAL DE CORPO INTEIRO */}
                      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 w-80 sm:w-96 aspect-video rounded-2xl overflow-hidden border hero-tip-box shadow-[0_25px_50px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4">
                        {hero.bannerImage && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute inset-0">
                              <i className="hero-tip-puff hero-tip-puff-a" />
                              <i className="hero-tip-puff hero-tip-puff-b" />
                              <i className="hero-tip-puff hero-tip-puff-c" />
                            </div>
                            <img
                              src={hero.bannerImage}
                              alt={hero.name}
                              className="absolute right-0 bottom-0 h-full w-auto object-contain object-right drop-shadow-[0_0_20px_rgba(0,0,0,0.9)] opacity-90 transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                          </div>
                        )}

                        <div className="relative z-20 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${TIER_BY_KEY[hero.tier].badgeBg} ${TIER_BY_KEY[hero.tier].badgeText} ${hero.tier === "META" ? "tier-meta-glow" : ""}`}>
                              Tier {hero.tier}
                            </span>
                            <h4 className="font-deadlock text-2xl text-[#f4efe6] tracking-wide leading-none mt-1.5 truncate">
                              {hero.name}
                            </h4>
                            {hero.tags && hero.tags.length > 0 && (
                              <div className="mt-2 flex w-fit flex-col items-center gap-1">
                                {[
                                  hero.tags.slice(0, Math.ceil(hero.tags.length / 2)),
                                  hero.tags.slice(Math.ceil(hero.tags.length / 2)),
                                ].map(
                                  (row, rowIndex) =>
                                    row.length > 0 && (
                                      <div key={rowIndex} className="flex gap-1">
                                        {row.map((tag) => (
                                          <span
                                            key={tag}
                                            style={tagColors(hero.rgb)}
                                            className="font-deadlock shrink-0 px-2 py-0.5 font-black text-[10px] tracking-wider uppercase shadow -skew-x-6"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    ),
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span
                              className={`font-deadlock text-xl font-black ${
                                hero.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {hero.winRate.toFixed(1)}%
                            </span>
                            <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                              Win Rate
                            </p>
                          </div>
                        </div>
                        <div className="relative z-20 w-24 text-center">
                          <div className="hero-tip-stat hero-tip-stat-hero py-1 px-1">
                            <p className="text-[9px] text-[rgb(var(--hc)/0.8)] uppercase font-bold">
                              Jogos
                            </p>
                            <p className="font-deadlock text-sm leading-tight font-black text-[rgb(var(--hc))]">
                              {fmt(hero.matches)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}