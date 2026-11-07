// app/page.tsx
/* eslint-disable @next/next/no-img-element */
import { fetchHeroesAssets, fetchHeroesAnalytics, MergedHero, TIER_THRESHOLDS, PATCHES } from "@/lib/deadlock";
import Link from "next/link";
import PatchSelect from "./PatchSelect";
import fs from "fs";
import path from "path";

export const instant = false;

type TierKey = "META" | "A" | "B" | "C" | "D" | "F";

interface TierConfig {
  key: TierKey;
  label: string;
  badgeBg: string;
  badgeText: string;
}

const TIERS: TierConfig[] = [
  { key: "META", label: "META", badgeBg: "bg-cyan-400", badgeText: "text-black" },
  { key: "A", label: "A", badgeBg: "bg-green-500", badgeText: "text-black" },
  { key: "B", label: "B", badgeBg: "bg-lime-400", badgeText: "text-black" },
  { key: "C", label: "C", badgeBg: "bg-yellow-400", badgeText: "text-black" },
  { key: "D", label: "D", badgeBg: "bg-orange-500", badgeText: "text-black" },
  { key: "F", label: "F", badgeBg: "bg-red-600", badgeText: "text-black" },
];

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
  const [heroesMap, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil)
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

        <PatchSelect
          patches={PATCHES.map(({ id, label }) => ({ id, label }))}
          selected={selectedPatch.id}
        />
      </header>
      
      {heroesRanking.length === 0 && (
        <p className="mb-6 text-sm text-rose-400">
          Não foi possível carregar os dados da API agora. Tente novamente em alguns minutos.
        </p>
      )}

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
                    >
                      {/* Imagem do Herói (QUADRADA) */}
                      <div className="w-full aspect-square relative bg-neutral-850 flex items-center justify-center overflow-hidden rounded-t-xl">
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
                      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 w-80 sm:w-96 aspect-video rounded-2xl overflow-hidden border border-[#23352c] bg-[#0b100e] shadow-[0_25px_50px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4">
                        {hero.bannerImage && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <img
                              src={hero.bannerImage}
                              alt={hero.name}
                              className="absolute right-0 bottom-0 h-full w-auto object-contain object-right drop-shadow-[0_0_20px_rgba(0,0,0,0.9)] opacity-90 transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0b100e] via-[#0b100e]/75 to-transparent z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b100e]/50 via-transparent to-transparent z-10" />
                          </div>
                        )}

                        <div className="relative z-20 flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                              Tier {hero.tier}
                            </span>
                            <h4 className="text-lg sm:text-xl font-black text-[#f4efe6] tracking-tight leading-none mt-1">
                              {hero.name}
                            </h4>
                          </div>

                          <div className="text-right">
                            <span
                              className={`font-deadlock font-deadlock text-xs font-black text-neutral-100
                                hero.winRate >= 50
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {hero.winRate.toFixed(1)}%
                            </span>
                            <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                              Win Rate
                            </p>
                          </div>
                        </div>

                        <div className="relative z-20 grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-center max-w-[240px]">
                          <div className="bg-[#121a16]/85 rounded-lg py-1 px-1 border border-neutral-800/60 backdrop-blur-sm">
                            <p className="text-[9px] text-neutral-400 uppercase font-bold">
                              Jogos
                            </p>
                            <p className="font-deadlock text-xs font-black text-neutral-100">
                              {fmt(hero.matches)}
                            </p>
                          </div>
                          <div className="bg-[#121a16]/85 rounded-lg py-1 px-1 border border-neutral-800/60 backdrop-blur-sm">
                            <p className="text-[9px] text-emerald-400/80 uppercase font-bold">
                              Vitórias
                            </p>
                            <p className="font-deadlock text-xs font-black text-emerald-400">
                              {fmt(hero.wins)}
                            </p>
                          </div>
                          <div className="bg-[#121a16]/85 rounded-lg py-1 px-1 border border-neutral-800/60 backdrop-blur-sm">
                            <p className="text-[9px] text-rose-400/80 uppercase font-bold">
                              Derrotas
                            </p>
                            <p className="font-deadlock text-xs font-black text-rose-400">
                              {fmt(hero.losses)}
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