"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MakerHero } from "@/app/tiers";
import type { AuthUser } from "@/lib/backend/types";

export type CommunitySort = "relevance" | "likes" | "comments" | "recent" | "views";
export type CommunityStyleFilter = "all" | "classic" | "quadrant";
export type CommunityScopeFilter = "all" | "mine" | "liked" | "saved";

interface Props {
  heroes: MakerHero[];
  currentUser: AuthUser | null;
  publishedCount: number;
  filteredCount: number;
  query: string;
  onQueryChange: (val: string) => void;
  sort: CommunitySort;
  onSortChange: (val: CommunitySort) => void;
  styleFilter: CommunityStyleFilter;
  onStyleFilterChange: (val: CommunityStyleFilter) => void;
  scopeFilter: CommunityScopeFilter;
  onScopeFilterChange: (val: CommunityScopeFilter) => void;
  heroIds: number[];
  onHeroIdsChange: (ids: number[]) => void;
  topTierOnly: boolean;
  onTopTierOnlyChange: (val: boolean) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreateClick: () => void;
}

const SORT_OPTIONS: Array<{ id: CommunitySort; label: string }> = [
  { id: "relevance", label: "Relevância" },
  { id: "likes", label: "Mais Curtidas" },
  { id: "comments", label: "Mais Comentadas" },
  { id: "recent", label: "Mais Recentes" },
  { id: "views", label: "Mais Vistas" },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function CommunityFilterBar({
  heroes,
  currentUser,
  publishedCount,
  filteredCount,
  query,
  onQueryChange,
  sort,
  onSortChange,
  styleFilter,
  onStyleFilterChange,
  scopeFilter,
  onScopeFilterChange,
  heroIds,
  onHeroIdsChange,
  topTierOnly,
  onTopTierOnlyChange,
  hasActiveFilters,
  onResetFilters,
  onCreateClick,
}: Props) {
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  const heroBoxRef = useRef<HTMLDivElement>(null);
  const sortBoxRef = useRef<HTMLDivElement>(null);
  const heroSearchRef = useRef<HTMLInputElement>(null);

  const selectedHeroes = useMemo(
    () =>
      heroIds
        .map((id) => heroes.find((h) => h.id === id))
        .filter((h): h is MakerHero => Boolean(h)),
    [heroes, heroIds],
  );
  const singleSelectedHero = selectedHeroes.length === 1 ? selectedHeroes[0] : null;
  const currentSort = SORT_OPTIONS.find((o) => o.id === sort) ?? SORT_OPTIONS[0];

  const visibleHeroes = useMemo(() => {
    const q = norm(heroQuery.trim());
    return q ? heroes.filter((h) => norm(h.name).includes(q)) : heroes;
  }, [heroes, heroQuery]);

  useEffect(() => {
    if (!heroOpen && !sortOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (heroOpen && !heroBoxRef.current?.contains(target)) setHeroOpen(false);
      if (sortOpen && !sortBoxRef.current?.contains(target)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHeroOpen(false);
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [heroOpen, sortOpen]);

  useEffect(() => {
    if (heroOpen) {
      const id = setTimeout(() => heroSearchRef.current?.focus(), 20);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setHeroQuery(""), 200);
    return () => clearTimeout(id);
  }, [heroOpen]);

  const toggleHero = (id: number) => {
    if (heroIds.includes(id)) {
      const next = heroIds.filter((x) => x !== id);
      onHeroIdsChange(next);
      if (next.length === 0) onTopTierOnlyChange(false);
    } else {
      onHeroIdsChange([...heroIds, id]);
    }
  };

  const clearHeroes = () => {
    onHeroIdsChange([]);
    onTopTierOnlyChange(false);
  };

  const selectedAccent = singleSelectedHero?.rgb
    ? `rgb(${singleSelectedHero.rgb.join(",")})`
    : "#f59e0b";

  return (
    <section
      className="relative z-20 rounded-[5px_12px_5px_10px] border-2 border-[#2a251d] bg-[#0a0e0d]/95 p-5 sm:p-6 shadow-[0_14px_38px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(0,0,0,0.65)] backdrop-blur-md space-y-4"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(10,14,13,0.96) 55%)",
      }}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-deadlock text-2xl sm:text-3xl font-black uppercase tracking-wide text-[#f4efe6]">
            Galeria da <span className="text-amber-500">Comunidade</span>
          </h3>
          <p className="mt-1 text-xs text-neutral-400">
            Explore, curta, comente, salve ou poste no Feed as tier lists dos jogadores do LockPro.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-[5px] border border-amber-400/70 bg-amber-500 px-4 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black shadow-[0_0_22px_rgba(245,158,11,0.28)] transition-all hover:bg-amber-400 hover:shadow-[0_0_28px_rgba(245,158,11,0.42)] active:scale-[0.98]"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span>Criar Tier List</span>
        </button>
      </div>

      {publishedCount > 0 && (
        <div className="space-y-3 border-t border-white/8 pt-4">
          {/* Linha de Busca + Seletor de Herói + Ordenar */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            {/* Busca textual */}
            <div className="relative md:col-span-5">
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Buscar título, descrição, autor ou @handle..."
                aria-label="Buscar tier lists"
                className="h-10 w-full rounded-[5px] border border-neutral-700/80 bg-[#070a09] pl-9 pr-8 text-xs font-medium text-[#f4efe6] placeholder:text-neutral-500 shadow-[0_4px_14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all hover:border-neutral-600 focus:border-amber-500 focus:shadow-[0_0_18px_rgba(245,158,11,0.2)]"
              />
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 14 14" />
              </svg>
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 cursor-pointer items-center justify-center rounded text-neutral-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            {/* Seletor visual de Heróis (múltipla seleção no estilo Leaderboard) */}
            <div ref={heroBoxRef} className="relative md:col-span-4 flex items-center gap-2">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={heroOpen}
                onClick={() => {
                  setHeroOpen((o) => !o);
                  setSortOpen(false);
                }}
                style={
                  selectedHeroes.length > 0
                    ? ({ "--hc": selectedAccent } as CSSProperties)
                    : undefined
                }
                className={`group flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[5px] border bg-[#070a09] px-3 text-left shadow-[0_4px_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 outline-none ${
                  heroOpen
                    ? "border-amber-500 ring-1 ring-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                    : singleSelectedHero
                      ? "border-[var(--hc)]/70 hover:border-[var(--hc)]"
                      : selectedHeroes.length > 0
                        ? "border-amber-500/60 hover:border-amber-400"
                        : "border-neutral-700/80 hover:border-amber-500/70"
                }`}
              >
                {selectedHeroes.length > 0 ? (
                  <div className="flex shrink-0 items-center -space-x-1.5">
                    {selectedHeroes.slice(0, 3).map((h) => (
                      <img
                        key={h.id}
                        src={h.icon || h.image}
                        alt=""
                        className="h-6 w-6 rounded-full border border-black/80 bg-neutral-900 object-contain"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-neutral-800 bg-neutral-900/90 text-neutral-400 group-hover:text-amber-400">
                    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="5" height="5" rx="1" />
                      <rect x="9" y="2" width="5" height="5" rx="1" />
                      <rect x="2" y="9" width="5" height="5" rx="1" />
                      <rect x="9" y="9" width="5" height="5" rx="1" />
                    </svg>
                  </span>
                )}

                <span
                  className={`min-w-0 flex-1 truncate font-deadlock text-xs font-black uppercase tracking-wider ${
                    selectedHeroes.length > 0 ? "text-[#f4efe6]" : "text-neutral-300"
                  }`}
                >
                  {singleSelectedHero
                    ? singleSelectedHero.name
                    : selectedHeroes.length > 1
                      ? `${selectedHeroes.length} Heróis`
                      : "Todos os Heróis"}
                </span>

                {selectedHeroes.length > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Limpar heróis"
                    aria-label="Limpar filtro de heróis"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearHeroes();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        clearHeroes();
                      }
                    }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold text-neutral-400 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </span>
                )}

                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${
                    heroOpen ? "rotate-180 text-amber-400" : "group-hover:text-amber-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>

              {selectedHeroes.length > 0 && styleFilter !== "quadrant" && (
                <button
                  type="button"
                  onClick={() => onTopTierOnlyChange(!topTierOnly)}
                  title="Mostrar apenas listas clássicas com os heróis selecionados no 1º tier"
                  className={`h-10 shrink-0 cursor-pointer rounded-[5px] border px-2.5 font-deadlock text-[10px] font-black uppercase tracking-wider transition-all ${
                    topTierOnly
                      ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
                      : "border-neutral-700/80 bg-[#070a09] text-neutral-400 hover:border-amber-500/60 hover:text-white"
                  }`}
                >
                  No Topo
                </button>
              )}

              <div
                aria-hidden={!heroOpen}
                className={`absolute left-0 top-full z-50 mt-2 w-full min-w-[290px] sm:min-w-[330px] origin-top rounded-[6px] border border-white/12 bg-[#0a0d0c]/98 p-3.5 shadow-[0_24px_48px_rgba(0,0,0,0.92)] backdrop-blur-md space-y-2.5 transition-all duration-200 ease-out ${
                  heroOpen
                    ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
                    : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Heróis {heroIds.length > 0 ? `(${heroIds.length})` : ""}
                  </span>
                  {heroIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHeroes}
                      className="cursor-pointer text-[10px] font-bold text-amber-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <input
                  ref={heroSearchRef}
                  type="text"
                  tabIndex={heroOpen ? 0 : -1}
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Buscar herói..."
                  aria-label="Buscar herói na lista"
                  className="w-full rounded-[4px] border border-white/12 bg-black/60 px-2.5 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />

                {visibleHeroes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-500">
                    Nenhum herói encontrado.
                  </p>
                ) : (
                  <div
                    role="listbox"
                    aria-multiselectable="true"
                    className="lp-scroll grid max-h-72 grid-cols-5 gap-2 overflow-y-auto overflow-x-hidden p-2"
                  >
                    {visibleHeroes.map((h) => {
                      const selected = heroIds.includes(h.id);
                      const hc =
                        Array.isArray(h.rgb) && h.rgb.length === 3
                          ? h.rgb.join(" ")
                          : "245 158 11";
                      return (
                        <button
                          key={h.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          title={h.name}
                          aria-label={h.name}
                          onClick={() => toggleHero(h.id)}
                          style={{ "--hc": hc } as CSSProperties}
                          className={`group relative aspect-square w-full p-0.5 transition-all cursor-pointer ${
                            selected
                              ? "pf-smoke scale-110 opacity-100 z-10"
                              : heroIds.length > 0
                                ? "opacity-45 hover:opacity-100 hover:scale-110"
                                : "opacity-90 hover:opacity-100 hover:scale-110"
                          }`}
                        >
                          <span
                            style={{
                              background: `radial-gradient(circle, rgb(${hc} / 0.65) 0%, rgb(${hc} / 0.25) 45%, transparent 72%)`,
                            }}
                            className={`pointer-events-none absolute -inset-1.5 rounded-full transition-opacity duration-200 ${
                              selected
                                ? "opacity-100"
                                : heroIds.length === 0
                                  ? "opacity-80 group-hover:opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                          {h.icon || h.image ? (
                            <img
                              src={h.icon || h.image}
                              alt={h.name}
                              loading="lazy"
                              style={{
                                filter: selected
                                  ? `drop-shadow(0 0 8px rgb(${hc} / 0.85))`
                                  : undefined,
                              }}
                              className="relative z-10 h-full w-full object-contain"
                            />
                          ) : (
                            <span className="relative z-10 block h-full w-full rounded-full bg-white/10" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Seletor customizado de Ordenação */}
            <div ref={sortBoxRef} className="relative md:col-span-3">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                onClick={() => {
                  setSortOpen((o) => !o);
                  setHeroOpen(false);
                }}
                className={`group flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[5px] border bg-[#070a09] px-3 shadow-[0_4px_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 outline-none ${
                  sortOpen
                    ? "border-amber-500 ring-1 ring-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                    : "border-neutral-700/80 hover:border-amber-500/70"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
                  </svg>
                  <span className="font-deadlock truncate text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                    {currentSort.label}
                  </span>
                </span>

                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${
                    sortOpen ? "rotate-180 text-amber-400" : "group-hover:text-amber-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>

              <div
                role="listbox"
                className={`absolute right-0 top-full z-50 mt-2 min-w-full w-max max-w-[calc(100vw-2rem)] origin-top overflow-hidden rounded-[6px] border border-neutral-800/95 bg-neutral-950/98 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 ease-out ${
                  sortOpen
                    ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
                    : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
                }`}
              >
                <div className="p-1.5 space-y-1">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = opt.id === sort;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onSortChange(opt.id);
                          setSortOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[4px] border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-amber-500/45 bg-amber-500/15 text-amber-300"
                            : "border-transparent text-neutral-300 hover:bg-neutral-800/70 hover:text-[#f4efe6]"
                        }`}
                      >
                        <span className="font-deadlock text-xs font-black uppercase tracking-wider whitespace-nowrap">
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.85)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Linha de Segmentos: Formato + Escopo + Limpar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded-[5px] border border-neutral-800 bg-black/60 p-0.5">
                {(
                  [
                    ["all", "Todos os formatos"],
                    ["classic", "Clássicas"],
                    ["quadrant", "Quadrante 2D"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onStyleFilterChange(key)}
                    className={`cursor-pointer rounded-[4px] px-2.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-all ${
                      styleFilter === key
                        ? "bg-amber-500 text-black shadow-sm"
                        : "text-neutral-400 hover:bg-white/5 hover:text-[#f4efe6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {currentUser && (
                <div className="inline-flex flex-wrap items-center gap-0.5 rounded-[5px] border border-neutral-800 bg-black/60 p-0.5">
                  {(
                    [
                      ["all", "Todas"],
                      ["mine", "Minhas"],
                      ["liked", "Curtidas"],
                      ["saved", "Salvas"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onScopeFilterChange(key)}
                      className={`cursor-pointer rounded-[4px] border px-2.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-all ${
                        scopeFilter === key
                          ? "border-amber-500/45 bg-amber-500/18 text-amber-300"
                          : "border-transparent text-neutral-400 hover:bg-white/5 hover:text-[#f4efe6]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-medium text-neutral-500">
                {filteredCount} {filteredCount === 1 ? "lista" : "listas"}
                {hasActiveFilters ? ` de ${publishedCount}` : ""}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="cursor-pointer rounded-[4px] border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}