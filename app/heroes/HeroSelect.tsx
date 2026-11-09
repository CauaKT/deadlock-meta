"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

export interface SelectHero {
  id: number;
  name: string;
  rgb: [number, number, number];
  card: string;
  art: string;
  nameSvg: string;
  tags: string[];
  abilities: { name: string; image: string }[];
}

export default function HeroSelect({ heroes }: { heroes: SelectHero[] }) {
  const [activeId, setActiveId] = useState<number | null>(heroes[0]?.id ?? null);
  const [brokenNames, setBrokenNames] = useState<number[]>([]);

  const active = heroes.find((h) => h.id === activeId) ?? heroes[0];
  if (!active) return null;

  const color = `rgb(${active.rgb.join(", ")})`;
  const luminance = 0.299 * active.rgb[0] + 0.587 * active.rgb[1] + 0.114 * active.rgb[2];
  const tagText = luminance > 150 ? "#1a1608" : "#ffffff";

  return (
    <section className="grid overflow-hidden rounded-[3px_8px_3px_6px] border-2 border-neutral-800/80 bg-[#0a0d0c]/90 shadow-[0_25px_60px_rgba(0,0,0,0.9)] lg:grid-cols-[1.15fr_1fr]">
      <div className="p-4 md:p-8">
        <p className="font-deadlock text-sm font-black uppercase tracking-wider text-[#5f7a76]">Deadlock</p>
        <h1 className="mb-5 font-deadlock text-4xl font-black uppercase tracking-tight text-[#5f7a76] md:text-5xl">Heróis</h1>

        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 lg:grid-cols-9">
          {heroes.map((hero) => {
            const isActive = hero.id === active.id;
            const heroColor = `rgb(${hero.rgb.join(", ")})`;
            return (
              <Link
                key={hero.id}
                href={`/heroes/${hero.id}`}
                onMouseEnter={() => setActiveId(hero.id)}
                onFocus={() => setActiveId(hero.id)}
                aria-label={hero.name}
                className={`relative block aspect-[3/5] overflow-hidden bg-[#0c0f0e] outline-none transition-all duration-150 ${
                  isActive ? "z-10 scale-[1.18] border-2" : "border border-neutral-800/70 brightness-[.6] saturate-[.6]"
                }`}
                style={
                  isActive
                    ? { borderColor: heroColor, boxShadow: `0 0 18px rgba(92,225,182,0.6), 0 8px 18px rgba(0,0,0,0.8)` }
                    : undefined
                }
              >
                {hero.card ? (
                  <img src={hero.card} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-extrabold text-neutral-500">
                    {hero.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href={`/heroes/${active.id}`}
        aria-label={`Abrir ${active.name}`}
        className="relative block min-h-[420px] overflow-hidden lg:min-h-[560px]"
      >
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)",
            background: `linear-gradient(160deg, color-mix(in srgb, ${color} 85%, #000), color-mix(in srgb, ${color} 40%, #0c1110))`,
          }}
        />
        <img
          key={active.id}
          src={active.art}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-right-bottom"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute inset-x-4 bottom-4 flex flex-col items-end gap-3 md:inset-x-6 md:bottom-6">
          {brokenNames.includes(active.id) ? (
            <span className="font-deadlock text-5xl font-black uppercase text-[#f4efe6]">{active.name}</span>
          ) : (
            <img
              key={`n${active.id}`}
              src={active.nameSvg}
              alt={active.name}
              onError={() => setBrokenNames((b) => [...b, active.id])}
              className="h-20 w-auto max-w-full object-contain object-right drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] md:h-28"
            />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {active.tags.map((tag, i) => (
              <span
                key={tag}
                style={{ backgroundColor: color, color: tagText }}
                className={`font-deadlock px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-lg ${
                  i % 2 === 0 ? "-rotate-2" : "rotate-1"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            {active.abilities.map((ab) => (
              <span
                key={ab.name}
                title={ab.name}
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg md:h-14 md:w-14"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 80%, #000)` }}
              >
                {ab.image && <img src={ab.image} alt={ab.name} className="h-8 w-8 object-contain md:h-9 md:w-9" />}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </section>
  );
}