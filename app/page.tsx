// app/page.tsx
/* eslint-disable @next/next/no-img-element */
import { fetchHeroesAssets, fetchHeroesAnalytics, MergedHero } from "@/lib/deadlock";

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
  if (winRate >= 53.5) return "META";
  if (winRate >= 51.5) return "A";
  if (winRate >= 50.0) return "B";
  if (winRate >= 48.5) return "C";
  if (winRate >= 47.0) return "D";
  return "F";
}

export default async function Home() {
  const [heroesMap, stats] = await Promise.all([
    fetchHeroesAssets(),
    fetchHeroesAnalytics(),
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

      return {
        id: stat.hero_id,
        name: hero?.name || `Herói #${stat.hero_id}`,
        image,
        defaultImage,
        matches,
        wins,
        losses,
        winRate,
        tier,
      };
    })
    .filter((h) => h.matches > 0 && !h.name.startsWith("hero_"))
    .sort((a, b) => b.winRate - a.winRate);

  const heroesByTier = TIERS.reduce((acc, tier) => {
    acc[tier.key] = heroesRanking.filter((hero) => hero.tier === tier.key);
    return acc;
  }, {} as Record<TierKey, (MergedHero & { tier: TierKey })[]>);

  return (
    <main className="min-h-screen bg-[#070807] text-neutral-100 p-4 md:p-10 font-sans relative overflow-x-hidden">
      {/* 1. Wallpaper de Fundo (Transparente e Borrado) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-15 blur-[2px] scale-105"
        style={{ backgroundImage: "url('/bg.png')" }}
      />

      {/* 2. Vinheta Escura */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070807]/80 via-[#070807]/60 to-[#070807]/95" />

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-8">
          <div className="flex items-center gap-3.5 mb-2">
            <img
              src="/logo.png"
              alt="Deadlock"
              className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(244,239,230,0.15)]"
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
              Deadlock <span className="text-amber-500">Tier List</span>
            </h1>
          </div>

          <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide">
            A hierarquia das almas na Cidade Amaldiçoada. Desempenho e domínio ritualístico calculados diretamente do Game Coordinator da Valve.
          </p>
        </header>

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
                  <span className="text-base sm:text-lg md:text-xl font-black tracking-wider leading-none">
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
                      <div
                        key={hero.id}
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

                          {/* Tag de Win Rate com fundo translúcido */}
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

                        {/* ========================================================= */}
                        {/* BANNER 16:9 AO PASSAR O MOUSE (HOVER TOOLTIP)             */}
                        {/* ========================================================= */}
                        <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-72 sm:w-80 aspect-video rounded-xl overflow-hidden border border-neutral-700/80 bg-neutral-950 shadow-[0_20px_40px_rgba(0,0,0,0.95)] flex flex-col justify-between p-3.5">
                          {/* Arte do herói esticada em 16:9 de fundo com blur */}
                          {hero.image && (
                            <img
                              src={hero.image}
                              alt={hero.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-25 scale-110 filter blur-[1px] pointer-events-none"
                            />
                          )}

                          {/* Gradiente escuro para legibilidade perfeita */}
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/50 pointer-events-none" />

                          {/* Cabeçalho do Banner */}
                          <div className="relative z-10 flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                                Tier {hero.tier}
                              </span>
                              <h4 className="text-base sm:text-lg font-black text-[#f4efe6] tracking-tight leading-none mt-0.5">
                                {hero.name}
                              </h4>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-sm sm:text-base font-black ${
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

                          {/* Detalhes de Partidas na Base do Banner */}
                          <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-center">
                            <div className="bg-neutral-900/70 rounded-lg py-1 px-1 border border-neutral-800/60">
                              <p className="text-[9px] text-neutral-400 uppercase font-bold">
                                Jogos
                              </p>
                              <p className="text-xs font-black text-neutral-100">
                                {(hero.matches / 1000).toFixed(0)}k
                              </p>
                            </div>
                            <div className="bg-neutral-900/70 rounded-lg py-1 px-1 border border-neutral-800/60">
                              <p className="text-[9px] text-emerald-400/80 uppercase font-bold">
                                Vitórias
                              </p>
                              <p className="text-xs font-black text-emerald-400">
                                {(hero.wins / 1000).toFixed(0)}k
                              </p>
                            </div>
                            <div className="bg-neutral-900/70 rounded-lg py-1 px-1 border border-neutral-800/60">
                              <p className="text-[9px] text-rose-400/80 uppercase font-bold">
                                Derrotas
                              </p>
                              <p className="text-xs font-black text-rose-400">
                                {(hero.losses / 1000).toFixed(0)}k
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}