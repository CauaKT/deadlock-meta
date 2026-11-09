/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { fetchHeroesAssets, fetchHeroBlurbs, extractColor } from "@/lib/deadlock";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Heróis de Deadlock",
  description: "Todos os heróis de Deadlock, carregados da Deadlock API.",
};

export default async function HeroesPage() {
  const [heroesMap, blurbs] = await Promise.all([fetchHeroesAssets(), fetchHeroBlurbs()]);

  // Heróis sem colors.style são internos ou ainda não lançados
  const heroes = Object.values(heroesMap)
    .map((h) => ({
      id: h.id,
      name: h.name,
      rgb: extractColor(h),
      image: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
      tags: blurbs[h.id]?.tags ?? [],
    }))
    .filter((h) => h.rgb !== null && !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Deadlock <span className="text-amber-500">Heróis</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
          Todos os heróis disponíveis, carregados da Deadlock API, uma API comunitária não oficial.
        </p>
      </header>

      {heroes.length === 0 ? (
        <p className="text-sm text-rose-400">
          Não foi possível carregar os heróis agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {heroes.map((hero) => (
            <Link
              key={hero.id}
              href={`/heroes/${hero.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-900/40 shadow-md transition-all duration-150 hover:scale-105 hover:border-amber-500/80"
              style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
            >
              <div className="hero-card-art relative flex aspect-square w-full items-center justify-center overflow-hidden">
                {hero.image ? (
                  <img
                    src={hero.image}
                    alt={hero.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-sm font-extrabold text-neutral-500">{hero.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="px-2 py-2 text-center">
                <p className="truncate text-sm font-bold leading-tight text-neutral-200 transition-colors group-hover:text-amber-400">
                  {hero.name}
                </p>
                {hero.tags.length > 0 && (
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    {hero.tags.join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}