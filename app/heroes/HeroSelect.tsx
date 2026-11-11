"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { HeroAbilityFull } from "@/lib/deadlock";
import AbilityBar from "./[id]/AbilityBar";

export interface SelectHero {
  id: number;
  name: string;
  rgb: [number, number, number];
  tagBg: string;
  tagText: string;
  card: string;
  bg: string;
  art: string;
  nameSvgs: string[];
  tags: string[];
  abilities: HeroAbilityFull[];
  matches: number;
  winRate: number | null;
  released: boolean;
}

type SortKey = "name" | "name-desc" | "winrate-desc" | "winrate-asc" | "matches";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "name", label: "Nome (A–Z)" },
  { id: "name-desc", label: "Nome (Z–A)" },
  { id: "winrate-desc", label: "Winrate (maior pra menor)" },
  { id: "winrate-asc", label: "Winrate (menor pra maior)" },
  { id: "matches", label: "Número de partidas" },
];

const TAG_ROTATIONS = ["-rotate-[4deg] sm:-rotate-[5deg]", "rotate-[4deg] sm:rotate-[5deg]", "-rotate-[3deg] sm:-rotate-[4deg]"];

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

export default function HeroSelect({ heroes, statsLabel }: { heroes: SelectHero[]; statsLabel: string }) {
  const [activeId, setActiveId] = useState<number | null>(heroes[0]?.id ?? null);
  const [showUnreleased, setShowUnreleased] = useState(false);
  const [nameFails, setNameFails] = useState<Record<number, number>>({});
  const [pop, setPop] = useState<{ slot: number; left: number; bottom: number; width: number; maxH: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pop) return;
    const close = () => setPop(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || rowRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close);
    };
  }, [pop]);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [filterOpen]);

  // Posiciona o popover acima do ícone clicado, limitado à viewport (o rect já inclui o scale do bloco)
  const openAbility = (slot: number, el: HTMLElement) => {
    if (pop?.slot === slot) return setPop(null);
    const r = el.getBoundingClientRect();
    const width = Math.min(520, window.innerWidth - 16);
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, 8), window.innerWidth - width - 8);
    setPop({ slot, left, width, bottom: window.innerHeight - r.top + 12, maxH: Math.max(r.top - 82, 200) });
  };

  const visible = heroes
    .filter((h) => showUnreleased || h.released)
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "pt-BR");
      if (sort === "name") return byName;
      if (sort === "name-desc") return -byName;
      if (sort === "matches") return b.matches - a.matches || byName;
      // Winrate: heróis sem amostra mínima (null) ficam sempre no final
      if (a.winRate === null || b.winRate === null) {
        return (a.winRate === null ? 1 : 0) - (b.winRate === null ? 1 : 0) || byName;
      }
      return (sort === "winrate-asc" ? a.winRate - b.winRate : b.winRate - a.winRate) || byName;
    });
  const active = visible.find((h) => h.id === activeId) ?? visible[0];
  if (!active) return null;

  const color = `rgb(${active.rgb.join(", ")})`;
  const circleBg = color;
  const iconColor = "#070908";
  const nameFail = nameFails[active.id] ?? 0;

  return (
    <section className="relative flex flex-col overflow-hidden border-y-2 border-neutral-800/80 bg-[#0a0d0c] wide:h-[calc(100svh-57px)]">
      <GameTexture />
      <div className="relative z-10 flex min-h-0 flex-col p-4 md:p-8 lg:px-10 lg:py-8 wide:h-full wide:w-[51%] wide:max-w-[880px]">
        <div className="flex shrink-0 items-end justify-between gap-4">
          <div>
            <p className="font-deadlock text-sm font-black uppercase tracking-wider text-[#5f7a76]">Deadlock</p>
            <h1 className="mb-4 font-deadlock text-6xl font-black uppercase tracking-tight text-[#5f7a76] md:text-7xl">Heróis</h1>
          </div>
          <div ref={filterRef} className="relative mb-4 shrink-0">
            <button
              type="button"
              title="Filtros"
              aria-label="Filtros"
              aria-haspopup="true"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex h-10 w-10 cursor-pointer items-center justify-center border-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
                filterOpen || showUnreleased || sort !== "name"
                  ? "border-[#5f7a76] bg-[#5f7a76]/25 text-[#f0e1cb]"
                  : "border-[#465353] bg-[#070707] text-[#8b9a96] hover:text-[#f0e1cb]"
              }`}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <path d="M1 2h14l-5.5 6.5V14l-3 1.5V8.5Z" />
              </svg>
            </button>
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filtros"
                className="absolute right-0 top-full z-30 mt-2 w-64 border-2 border-[#465353] bg-[#070707] p-3 font-deadlock text-[#f0e1cb] shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
              >
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#5f7a76]">Ordenar por</p>
                <div role="radiogroup" className="flex flex-col gap-1">
                  {SORT_OPTIONS.map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm font-black uppercase tracking-wider hover:text-white">
                      <input
                        type="radio"
                        name="hero-sort"
                        checked={sort === o.id}
                        onChange={() => setSort(o.id)}
                        className="accent-[#5f7a76]"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                <p className="mb-2 mt-3 border-t border-[#465353] pt-3 text-xs font-black uppercase tracking-wider text-[#5f7a76]">Exibição</p>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-black uppercase tracking-wider hover:text-white">
                  <input
                    type="checkbox"
                    checked={showUnreleased}
                    onChange={(e) => setShowUnreleased(e.target.checked)}
                    className="accent-[#5f7a76]"
                  />
                  Mostrar não lançados
                </label>
                <p className="mt-3 border-t border-[#465353] pt-2 font-sans text-[11px] normal-case tracking-normal text-[#8b9a96]">
                  Winrate e partidas: {statsLabel}. Winrate só com {"≥"} 1000 partidas.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 wide:overflow-y-auto wide:[scrollbar-width:thin]">
          <div className="grid grid-cols-5 gap-2 p-4 sm:grid-cols-7 lg:grid-cols-9 lg:gap-3 lg:p-8">
            {visible.map((hero) => {
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

      <div className="relative aspect-square w-full wide:absolute wide:inset-0 wide:aspect-auto">
        <img
          key={active.id}
          src={active.art}
          alt={active.name}
          className="absolute inset-0 h-full w-full object-contain object-right-top wide:translate-x-[4%]"
        />

        <div className="pointer-events-none absolute bottom-4 right-4 flex origin-bottom-right scale-[1.4] flex-col items-center md:bottom-7 md:right-8 lg:bottom-9 lg:right-12">
          {nameFail >= active.nameSvgs.length ? (
            <span className="font-deadlock mb-2 text-center text-3xl font-black uppercase text-[#f4efe6] md:text-4xl lg:mb-2 lg:text-[42px]">
              {active.name}
            </span>
          ) : (
            <img
              key={`n${active.id}-${nameFail}`}
              src={active.nameSvgs[nameFail]}
              alt={active.name}
              onError={() => setNameFails((f) => ({ ...f, [active.id]: nameFail + 1 }))}
              className="mb-4 h-auto w-[240px] object-contain object-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] sm:w-[270px] md:w-[290px] lg:mb-5 lg:w-[305px]"
            />
          )}

          <div className="flex scale-90 flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:gap-2.5">
            {active.tags.map((tag, i) => (
              <span
                key={tag}
                style={{ backgroundColor: active.tagBg, color: active.tagText }}
                className={`font-deadlock px-3 py-0.5 text-[14px] font-black uppercase tracking-wider shadow-md sm:px-3.5 sm:py-1 sm:text-[16px] lg:px-4 lg:py-1 lg:text-[18px] ${
                  TAG_ROTATIONS[i % TAG_ROTATIONS.length]
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          <div ref={rowRef} className="mt-2.5 flex items-center justify-center gap-2 sm:gap-2 lg:mt-3 lg:gap-2">
            {active.abilities.map((ab) => (
              <button
                key={ab.slot}
                type="button"
                title={ab.name}
                aria-label={ab.name}
                onClick={(e) => openAbility(ab.slot, e.currentTarget)}
                aria-expanded={pop?.slot === ab.slot}
                className={`pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-lg outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white/70 sm:h-11 sm:w-11 lg:h-[45px] lg:w-[45px] ${
                  pop?.slot === ab.slot ? "scale-110 ring-2 ring-white" : ""
                }`}
                style={{ backgroundColor: circleBg }}
              >
                {ab.image && (
                  <span
                    aria-hidden
                    className="block h-6 w-6 sm:h-[26px] sm:w-[26px] lg:h-[29px] lg:w-[29px]"
                    style={{
                      backgroundColor: iconColor,
                      WebkitMask: `url(${ab.image}) center / contain no-repeat`,
                      mask: `url(${ab.image}) center / contain no-repeat`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {pop && (
        <div
          ref={popRef}
          className="fixed z-50 overflow-y-auto overflow-x-hidden px-2 [scrollbar-width:thin]"
          style={{ left: pop.left, bottom: pop.bottom, width: pop.width, maxHeight: pop.maxH }}
        >
          <AbilityBar
            key={`${active.id}-${pop.slot}`}
            abilities={active.abilities}
            initialSlot={pop.slot}
            hideSelector
            accent={active.tagBg}
            accentText={active.tagText}
          />
        </div>
      )}
    </section>
  );
}