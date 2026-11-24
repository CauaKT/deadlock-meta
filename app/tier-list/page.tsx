// app/page.tsx
/* eslint-disable @next/next/no-img-element */
import {
  assignTiersByRank,
  computeHeroMatchStats,
  computeMetaScoreBreakdowns,
  DEFAULT_RANK_ID,
  extractColor,
  fetchHeroBanStats,
  fetchHeroBlurbs,
  fetchHeroesAnalytics,
  fetchHeroesAssets,
  fetchPatches,
  fetchWikiColors,
  isPlayableHero,
  minMatchesForRank,
  RANK_FILTERS,
  resolveHeroMedia,
  resolvePatchWindow,
  resolveRankFilter,
  resolveTierMetric,
  TIER_METRIC_OPTIONS,
  type HeroBanAnalytics,
  type MergedHero,
  type MetaScoreBreakdownItem,
  type MetaScoreInput,
} from "@/lib/deadlock";
import Link from "next/link";
import type { CSSProperties } from "react";
import MetricSelect from "@/app/MetricSelect";
import PatchSelect from "@/app/PatchSelect";
import RankSelect from "@/app/RankSelect";
import { TIERS, TIER_BY_KEY, type TierKey } from "@/app/tiers";
import fs from "fs";
import path from "path";

export const instant = false;

function tagColors(rgb?: [number, number, number] | null) {
  const bg = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : "#f1d36b";
  const lum = rgb ? 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] : 200;
  return { backgroundColor: bg, color: lum > 150 ? "#1a1608" : "#ffffff" };
}

const heroesDir = path.join(process.cwd(), "public", "heroes");
const localHeroFiles = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];

const TAG_TILTS = ["-rotate-[3deg]", "rotate-[3deg]", "-rotate-[2deg]"];

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

type RankedHero = MergedHero & {
  bgImage: string;
  pickRate: number;
  bans: number;
  banRate: number;
  metricValue: number;
  scoreBreakdown: MetaScoreBreakdownItem[];
  tier: TierKey;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ patch?: string; rank?: string; metric?: string }>;
}) {
  const [{ patch: patchParam, rank: rankParam, metric: metricParam }, patches] = await Promise.all([
    searchParams,
    fetchPatches(),
  ]);
  const { selectedPatch, patchUntil } = resolvePatchWindow(patches, patchParam);
  const selectedRank = resolveRankFilter(rankParam);
  const selectedMetric = resolveTierMetric(metricParam);
  const minMatches = minMatchesForRank(selectedRank.tier);
  const [heroesMap, stats, banStats, blurbs, wikiColors] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil, selectedRank.minBadge),
    selectedMetric.id === "banrate" || selectedMetric.id === "metascore"
      ? fetchHeroBanStats(selectedPatch.since, patchUntil, selectedRank.minBadge)
      : Promise.resolve([] as HeroBanAnalytics[]),
    fetchHeroBlurbs(),
    fetchWikiColors(),
  ]);

  const heroLinkParams = new URLSearchParams();
  if (selectedPatch.id !== patches[0]?.id) heroLinkParams.set("patch", selectedPatch.id);
  if (selectedRank.id !== DEFAULT_RANK_ID) heroLinkParams.set("rank", selectedRank.id);
  const heroLinkQs = heroLinkParams.toString();
  const heroHrefSuffix = heroLinkQs ? `?${heroLinkQs}` : "";

  const totalMatchesExact = stats.reduce((sum, s) => sum + (s.matches || 0), 0) / 12;
  const totalMatches = Math.round(totalMatchesExact);
  const banByHero = new Map<number, HeroBanAnalytics>(banStats.map((b) => [b.hero_id, b]));
  const banSampleMatches = banStats[0]?.matches ?? 0;
  const missingBanData = selectedMetric.id === "banrate" && banStats.length === 0;

  const playableRows = missingBanData
    ? []
    : stats
        .map((stat) => {
          const hero = heroesMap[stat.hero_id];
          const { matches, wins, losses, winRate } = computeHeroMatchStats(stat);
          const pickRate = totalMatchesExact > 0 ? (matches / totalMatchesExact) * 100 : 0;
          const banEntry = banByHero.get(stat.hero_id);
          const bans = banEntry?.bans ?? 0;
          const banRate =
            banEntry && banEntry.matches > 0 ? (banEntry.bans / banEntry.matches) * 100 : 0;

          const media = resolveHeroMedia(hero, localHeroFiles);
          const scoreInput: MetaScoreInput = {
            winRate,
            pickRate,
            banRate,
            assists: matches > 0 ? Number(stat.total_assists || 0) / matches : 0,
            kills: matches > 0 ? Number(stat.total_kills || 0) / matches : 0,
            playerDamage: matches > 0 ? Number(stat.total_player_damage || 0) / matches : 0,
            damageTaken: matches > 0 ? Number(stat.total_player_damage_taken || 0) / matches : 0,
            maxHealth: matches > 0 ? Number(stat.total_max_health || 0) / matches : 0,
            deaths: matches > 0 ? Number(stat.total_deaths || 0) / matches : 0,
            bossDamage: matches > 0 ? Number(stat.total_boss_damage || 0) / matches : 0,
            netWorth: matches > 0 ? Number(stat.total_net_worth || 0) / matches : 0,
            lastHits: matches > 0 ? Number(stat.total_last_hits || 0) / matches : 0,
            denies: matches > 0 ? Number(stat.total_denies || 0) / matches : 0,
            creepDamage: matches > 0 ? Number(stat.total_creep_damage || 0) / matches : 0,
            neutralDamage: matches > 0 ? Number(stat.total_neutral_damage || 0) / matches : 0,
          };

          return {
            id: stat.hero_id,
            name: hero?.name || `Herói #${stat.hero_id}`,
            image: media.card,
            bgImage: media.bg,
            gloatImage: media.gloatImage,
            critImage: media.critImage,
            bannerImage: media.bannerImage,
            rgb: extractColor(hero, wikiColors),
            tags: blurbs[stat.hero_id]?.tags ?? [],
            matches,
            wins,
            losses,
            winRate,
            pickRate,
            bans,
            banRate,
            scoreInput,
          };
        })
        .filter((h) => isPlayableHero(heroesMap[h.id]) && h.matches >= minMatches);

  const metaResults =
    selectedMetric.id === "metascore"
      ? computeMetaScoreBreakdowns(
          playableRows.map((r) => r.scoreInput),
          banStats.length > 0,
        )
      : [];

  const sortedHeroes = playableRows
    .map((row, idx) => {
      const metricValue =
        selectedMetric.id === "metascore"
          ? (metaResults[idx]?.score ?? 50)
          : selectedMetric.id === "pickrate"
            ? row.pickRate
            : selectedMetric.id === "banrate"
              ? row.banRate
              : row.winRate;
      const scoreBreakdown =
        selectedMetric.id === "metascore" ? (metaResults[idx]?.breakdown ?? []) : [];
      return { ...row, metricValue, scoreBreakdown };
    })
    .sort((a, b) => b.metricValue - a.metricValue || b.matches - a.matches);

  const heroesRanking: RankedHero[] = assignTiersByRank(sortedHeroes).map((h) => ({
    ...h,
    image: h.tier === "META" ? h.gloatImage : h.tier === "F" ? h.critImage : h.image,
  }));

  const heroesByTier = TIERS.reduce((acc, tier) => {
    acc[tier.key] = heroesRanking.filter((hero) => hero.tier === tier.key);
    return acc;
  }, {} as Record<TierKey, RankedHero[]>);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <header className="mb-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
              Deadlock <span className="text-amber-500">Tier List</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-1.5">
              A hierarquia das almas na Cidade Amaldiçoada. Desempenho e domínio ritualístico calculados a partir dos dados da Deadlock API.
            </p>
          </div>
          <Link
            href="/tier-maker"
            className="group relative inline-flex w-fit shrink-0 items-center gap-2 overflow-hidden rounded-[5px] border border-amber-300/70 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_14px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_22px_rgba(245,158,11,0.6)] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-2 leading-none">
              <span>Faça sua própria Tier List</span>
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
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          <RankSelect ranks={RANK_FILTERS} selected={selectedRank.id} />
          <PatchSelect
            patches={patches.map(({ id, label }) => ({ id, label }))}
            selected={selectedPatch.id}
          />
          {selectedMetric.id === "banrate" && banSampleMatches > 0 ? (
            <span className="text-xs font-medium text-neutral-400">
              {banSampleMatches.toLocaleString("pt-BR")} partidas com ban analisadas
            </span>
          ) : (
            totalMatches > 0 && (
              <span className="text-xs font-medium text-neutral-400">
                {totalMatches.toLocaleString("pt-BR")} partidas analisadas
              </span>
            )
          )}
          <div className="sm:ml-auto">
            <MetricSelect metrics={TIER_METRIC_OPTIONS} selected={selectedMetric.id} />
          </div>
        </div>
      </header>

      {missingBanData ? (
        <p className="mb-6 text-sm text-amber-400">
          Dados de banimento estão disponíveis na Deadlock API apenas para patches a partir de março de 2026.
        </p>
      ) : (
        heroesRanking.length === 0 && (
          <p className="mb-6 text-sm text-rose-400">
            Não foi possível carregar os dados da API agora. Tente novamente em alguns minutos.
          </p>
        )
      )}

      {/* PRANCHA CONTÍNUA DA TIER LIST DO META */}
      {/* PRANCHA CONTÍNUA TIERMAKER */}
      <div className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 divide-y divide-neutral-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
        {TIERS.map((tier) => {
          const heroesInTier = heroesByTier[tier.key] || [];

          return (
            <div
              key={tier.key}
              className="flex flex-row min-h-[105px] transition-colors"
            >
              {/* Coluna da Letra do Tier à Esquerda */}
              <div
                className={`dl-halftone relative w-24 sm:w-36 md:w-40 flex-shrink-0 flex items-center justify-center p-2 text-center select-none border-r border-black/40 ${tier.badgeBg} ${tier.badgeText}`}
              >
                <span className="relative z-10 font-deadlock text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-wider leading-tight [overflow-wrap:anywhere] break-words max-w-full px-1">
                  {tier.label}
                </span>
              </div>

              {/* Área dos Heróis à Direita */}
              <div
                className="flex-1 p-2 sm:p-3 flex flex-wrap items-center content-center gap-2 sm:gap-2.5 bg-[#070908]/90"
              >
                {heroesInTier.length === 0 ? (
                  <span className="text-xs text-neutral-600 italic px-2">
                    Sem heróis neste tier
                  </span>
                ) : (
                  heroesInTier.map((hero) => (
                    <Link
                      key={hero.id}
                      href={`/heroes/${hero.id}${heroHrefSuffix}`}
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

                        {/* Tag da Métrica Selecionada */}
                        <div
                          className={`absolute bottom-0 inset-x-0 bg-black/35 backdrop-blur-[2px] py-0.5 text-center text-[10px] sm:text-[11px] font-black ${
                            selectedMetric.id === "winrate"
                              ? hero.winRate >= 50
                                ? "text-emerald-400"
                                : "text-rose-400"
                              : hero.tier === "META" || hero.tier === "A" || hero.tier === "B"
                                ? selectedMetric.id === "banrate"
                                  ? "text-rose-400"
                                  : selectedMetric.id === "metascore"
                                    ? "text-cyan-300"
                                    : "text-amber-300"
                                : "text-neutral-300"
                          }`}
                        >
                          {selectedMetric.id === "metascore"
                            ? hero.metricValue.toFixed(1)
                            : `${hero.metricValue.toFixed(1)}%`}
                        </div>
                      </div>

                      {/* Nome do Herói */}
                      <div className="w-full py-1.5 px-1 text-center bg-transparent">
                        <p className="text-[11px] font-bold text-neutral-200 truncate leading-tight group-hover:text-amber-400 transition-colors">
                          {hero.name}
                        </p>
                      </div>

                      {/* BANNER 16:9 COM A ARTE OFICIAL DE CORPO INTEIRO */}
                      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 w-80 sm:w-96">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border hero-tip-box shadow-[0_25px_50px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4">
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
                                        <div key={rowIndex} className="flex gap-1.5">
                                          {row.map((tag, tagIndex) => (
                                            <span
                                              key={tag}
                                              style={tagColors(hero.rgb)}
                                              className={`font-deadlock shrink-0 px-2 py-0.5 font-black text-[10px] tracking-wider uppercase shadow -skew-x-6 ${
                                                TAG_TILTS[(rowIndex * 2 + tagIndex) % TAG_TILTS.length]
                                              }`}
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
                                  selectedMetric.id === "winrate"
                                    ? hero.winRate >= 50
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                    : hero.tier === "META" || hero.tier === "A" || hero.tier === "B"
                                      ? selectedMetric.id === "banrate"
                                        ? "text-rose-400"
                                        : selectedMetric.id === "metascore"
                                          ? "text-cyan-300"
                                          : "text-amber-300"
                                      : "text-neutral-200"
                                }`}
                              >
                                {selectedMetric.id === "metascore"
                                  ? hero.metricValue.toFixed(1)
                                  : `${hero.metricValue.toFixed(1)}%`}
                              </span>
                              <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                                {selectedMetric.shortLabel}
                              </p>
                            </div>
                          </div>
                          <div className="relative z-20 flex items-center gap-2">
                            <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                              <span className="font-deadlock text-xs font-black text-[#f4efe6]">
                                {fmt(hero.matches)}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                Partidas
                              </span>
                            </div>
                            {selectedMetric.id === "winrate" ? (
                              <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                                <span className="font-deadlock text-xs font-black text-amber-300">
                                  {hero.pickRate.toFixed(1)}%
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                  Pick
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-xs">
                                <span
                                  className={`font-deadlock text-xs font-black ${
                                    hero.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {hero.winRate.toFixed(1)}%
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                  Win
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedMetric.id === "metascore" && hero.scoreBreakdown.length > 0 && (
                          <div
                            className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden border hero-tip-box shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
                            style={{
                              background:
                                "linear-gradient(225deg, color-mix(in srgb, rgb(var(--hc)) 14%, #0b0c0c), #0b0c0c 70%)",
                            }}
                          >
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                              <div
                                className="absolute inset-0"
                                style={{
                                  maskImage: "linear-gradient(to right, transparent 20%, black 75%)",
                                  WebkitMaskImage:
                                    "linear-gradient(to right, transparent 20%, black 75%)",
                                }}
                              >
                                <div className="absolute inset-0 -scale-x-100">
                                  <i className="hero-tip-puff hero-tip-puff-a" />
                                  <i className="hero-tip-puff hero-tip-puff-b" />
                                  <i className="hero-tip-puff hero-tip-puff-c" />
                                </div>
                              </div>
                              {hero.bgImage && (
                                <div
                                  className="absolute left-0 top-0 bottom-0"
                                  style={{
                                    maskImage: "linear-gradient(to right, black 60%, transparent 100%)",
                                    WebkitMaskImage:
                                      "linear-gradient(to right, black 60%, transparent 100%)",
                                  }}
                                >
                                  <img
                                    src={hero.bgImage}
                                    alt=""
                                    className="h-full w-auto object-contain object-left opacity-60"
                                    style={{ transform: "scale(-1, -1)" }}
                                  />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/25 to-transparent z-10" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                            </div>

                            <div className="relative z-20 flex items-center border-b border-white/10 bg-black/35 px-3.5 py-2 backdrop-blur-[2px]">
                              <span className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300">
                                Composição do Meta Score
                              </span>
                            </div>
                            <div className="relative z-20 grid grid-cols-3 gap-1.5 p-2.5">
                              {hero.scoreBreakdown.map((item) => {
                                const fillPct = `${Math.min(100, Math.max(0, item.pct)).toFixed(1)}%`;
                                return (
                                  <div
                                    key={item.key}
                                    className="relative overflow-hidden flex items-center justify-between gap-1 rounded-md border border-white/10 bg-black/55 px-2 py-1.5 text-[10px] leading-none backdrop-blur-[2px]"
                                  >
                                    <span
                                      aria-hidden
                                      className="pointer-events-none absolute inset-y-0 left-0"
                                      style={{
                                        width: fillPct,
                                        backgroundColor: "rgb(var(--hc) / 0.22)",
                                      }}
                                    />
                                    <span
                                      aria-hidden
                                      className="pointer-events-none absolute bottom-0 left-0 h-[2px]"
                                      style={{
                                        width: fillPct,
                                        backgroundColor: "rgb(var(--hc) / 0.85)",
                                      }}
                                    />
                                    <span className="relative z-10 text-neutral-300 truncate">
                                      {item.label}
                                    </span>
                                    <span
                                      className={`relative z-10 font-deadlock font-black tabular-nums shrink-0 ${
                                        item.points < 0 ? "text-rose-400" : "text-cyan-300"
                                      }`}
                                    >
                                      {item.points >= 0 ? "+" : ""}
                                      {item.points.toFixed(1)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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