"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export interface SelectHero {
  id: number;
  name: string;
  rgb: [number, number, number];
  card: string;
  bg: string;
  art: string;
  nameSvgs: string[];
  tags: string[];
  abilities: { name: string; image: string }[];
}

const TAG_ROTATIONS = ["-rotate-3", "rotate-2", "-rotate-1"];

const TICKS = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * Math.PI * 2;
  const r2 = i % 5 === 0 ? 592 : 577;
  return {
    x1: (Math.cos(a) * 560).toFixed(1),
    y1: (Math.sin(a) * 560).toFixed(1),
    x2: (Math.cos(a) * r2).toFixed(1),
    y2: (Math.sin(a) * r2).toFixed(1),
  };
});

function GameTexture() {
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g transform="translate(380 430)" fill="none" stroke="#6f9a93" strokeWidth="1.5">
          <g strokeOpacity=".38">
            {[140, 230, 330, 450, 560].map((r) => (
              <circle key={r} r={r} />
            ))}
          </g>
          <circle r="395" strokeOpacity=".5" strokeDasharray="2 10" />
          <g strokeOpacity=".5">
            {TICKS.map((t, i) => (
              <line key={i} {...t} />
            ))}
          </g>
          <g strokeOpacity=".28">
            <line x1="-620" y1="-220" x2="620" y2="260" />
            <line x1="-480" y1="360" x2="500" y2="-340" />
            <path d="M0 -280 L242 140 L-242 140 Z" />
          </g>
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_32%_54%,transparent_30%,#0a0d0c_95%)]" />
    </>
  );
}

// Setas duplas das pontas do botão, como no JOGAR do jogo (a da direita é a da esquerda espelhada)
function FrameEdge({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 90 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-y-0 h-full w-[90px] ${side === "left" ? "left-0" : "right-0 -scale-x-100"}`}
      fill="none"
      stroke="#465353"
      strokeWidth={2}
    >
      <path vectorEffect="non-scaling-stroke" d="M71 0L36 50L71 100" />
      <path vectorEffect="non-scaling-stroke" d="M79 0L43 50L79 100" />
    </svg>
  );
}

export default function HeroSelect({ heroes }: { heroes: SelectHero[] }) {
  const [activeId, setActiveId] = useState<number | null>(heroes[0]?.id ?? null);
  const [nameFails, setNameFails] = useState<Record<number, number>>({});

  const active = heroes.find((h) => h.id === activeId) ?? heroes[0];
  if (!active) return null;

  const color = `rgb(${active.rgb.join(", ")})`;
  const tagBg = `color-mix(in srgb, ${color} 62%, #0a0805)`;
  const circleBg = `color-mix(in srgb, ${color} 55%, #000)`;
  const iconColor = `color-mix(in srgb, ${color} 35%, #fff)`;
  const nameFail = nameFails[active.id] ?? 0;

  return (
    <section className="relative flex flex-col overflow-hidden border-y-2 border-neutral-800/80 bg-[#0a0d0c] lg:h-[calc(100svh-57px)]">
      <GameTexture />
      <div className="relative z-10 flex min-h-0 flex-col p-4 md:p-8 lg:h-full lg:w-[48%] lg:px-10 lg:py-8">
        <div className="shrink-0">
          <p className="font-deadlock text-sm font-black uppercase tracking-wider text-[#5f7a76]">Deadlock</p>
          <h1 className="mb-4 font-deadlock text-6xl font-black uppercase tracking-tight text-[#5f7a76] md:text-7xl">Heróis</h1>
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <div className="grid grid-cols-5 gap-2 p-4 sm:grid-cols-7 lg:grid-cols-9 lg:gap-3 lg:p-8">
            {heroes.map((hero) => {
              const isActive = hero.id === active.id;
              const heroColor = `rgb(${hero.rgb.join(", ")})`;
              return (
                <div key={hero.id} className="relative aspect-[2/3]">
                  <span aria-hidden className="absolute -inset-4 -z-10 bg-[radial-gradient(closest-side,rgba(10,13,12,0.8)_0%,rgba(10,13,12,0.6)_65%,transparent_100%)]" />
                  <button
                    type="button"
                    onClick={() => setActiveId(hero.id)}
                    aria-label={hero.name}
                    aria-pressed={isActive}
                    className={`absolute inset-0 block cursor-pointer overflow-hidden bg-[#0c0f0e] outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/70 ${
                      isActive
                        ? `z-10 scale-[1.15] border-2 ${hero.id % 2 === 0 ? "-rotate-3" : "rotate-3"}`
                        : "border border-neutral-800/70 brightness-[.6] saturate-[.6] hover:brightness-90"
                    }`}
                    style={
                      isActive
                        ? { borderColor: heroColor, boxShadow: `0 0 18px color-mix(in srgb, ${heroColor} 60%, transparent), 0 8px 18px rgba(0,0,0,0.8)` }
                        : undefined
                    }
                  >
                    {hero.bg && <Image src={hero.bg} alt="" fill sizes="96px" className="object-cover" />}
                    {hero.card ? (
                      <img src={hero.card} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-extrabold text-neutral-500">
                        {hero.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <Link
          href={`/heroes/${active.id}`}
          className="relative mt-4 inline-flex shrink-0 self-center border-2 border-[#465353] bg-[#070707] px-24 py-4 font-deadlock text-3xl font-black uppercase tracking-wider text-[#f0e1cb] transition-[filter] hover:brightness-125"
        >
          <FrameEdge side="left" />
          <FrameEdge side="right" />
          <span className="relative">Ver herói</span>
        </Link>
      </div>

      <div className="relative aspect-square w-full lg:absolute lg:inset-0 lg:aspect-auto">
        <img
          key={active.id}
          src={active.art}
          alt={active.name}
          className="absolute inset-0 h-full w-full object-contain object-right-top"
        />

        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-col items-end gap-3 md:inset-x-6 md:bottom-6">
          {nameFail >= active.nameSvgs.length ? (
            <span className="font-deadlock text-5xl font-black uppercase text-[#f4efe6]">{active.name}</span>
          ) : (
            <img
              key={`n${active.id}-${nameFail}`}
              src={active.nameSvgs[nameFail]}
              alt={active.name}
              onError={() => setNameFails((f) => ({ ...f, [active.id]: nameFail + 1 }))}
              className="h-20 w-auto max-w-full object-contain object-right drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] md:h-28 lg:h-36"
            />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {active.tags.map((tag, i) => (
              <span
                key={tag}
                style={{ backgroundColor: tagBg }}
                className={`font-deadlock px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#f6ead2] shadow-lg lg:px-4 lg:py-1.5 lg:text-[14px] ${
                  TAG_ROTATIONS[i % TAG_ROTATIONS.length]
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
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg md:h-14 md:w-14 lg:h-16 lg:w-16"
                style={{ backgroundColor: circleBg }}
              >
                {ab.image && (
                  <span
                    aria-hidden
                    className="block h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10"
                    style={{
                      backgroundColor: iconColor,
                      WebkitMask: `url(${ab.image}) center / contain no-repeat`,
                      mask: `url(${ab.image}) center / contain no-repeat`,
                    }}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}