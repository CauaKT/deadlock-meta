"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SlantFrame from "@/components/ui/SlantFrame";

export interface PatchHeroDelta {
  id: number;
  name: string;
  image: string | null;
  rgb: [number, number, number] | null;
  winRateNow: number;
  winRatePrev: number;
  winDelta: number;
  pickRateNow: number;
  pickRatePrev: number;
  pickDelta: number;
  matchesNow: number;
}

export interface PatchItemDelta {
  id: number;
  className: string;
  name: string;
  image: string | null;
  slot: "weapon" | "vitality" | "spirit";
  cost: number;
  winRateNow: number;
  winRatePrev: number;
  winDelta: number;
  pickRateNow: number;
  pickRatePrev: number;
  pickDelta: number;
  matchesNow: number;
}

import { DEFAULT_RANK_ID, SLOT_META } from "@/lib/data/config";

interface Props {
  patches: { id: string; label: string }[];
  selectedPatchId: string;
  selectedRankId: string;
  prevPatchLabel: string;
  heroes: PatchHeroDelta[];
  items: PatchItemDelta[];
}

type Tab = "heroes" | "items";
type SortKey = "winDelta-desc" | "winDelta-asc" | "pickDelta-desc" | "win-desc";

const SLOT_STYLE: Record<PatchItemDelta["slot"], { label: string; badge: string }> = {
  weapon: { label: SLOT_META.weapon.label, badge: SLOT_META.weapon.patchBadgeClass },
  vitality: { label: SLOT_META.vitality.label, badge: SLOT_META.vitality.patchBadgeClass },
  spirit: { label: SLOT_META.spirit.label, badge: SLOT_META.spirit.patchBadgeClass },
};

function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value > 0.05;
  const negative = value < -0.05;
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;

  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 font-mono text-xs font-bold ${
        positive
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : negative
            ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
            : "border-neutral-700 bg-neutral-900 text-neutral-400"
      }`}
    >
      {formatted}
    </span>
  );
}

export default function PatchTrackerClient({
  patches,
  selectedPatchId,
  selectedRankId,
  prevPatchLabel,
  heroes,
  items,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("heroes");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("winDelta-desc");

  const topHeroBuffs = useMemo(
    () => [...heroes].sort((a, b) => b.winDelta - a.winDelta).slice(0, 3),
    [heroes],
  );
  const topHeroNerfs = useMemo(
    () => [...heroes].sort((a, b) => a.winDelta - b.winDelta).slice(0, 3),
    [heroes],
  );
  const topItemBuffs = useMemo(
    () => [...items].sort((a, b) => b.winDelta - a.winDelta).slice(0, 3),
    [items],
  );
  const topItemNerfs = useMemo(
    () => [...items].sort((a, b) => a.winDelta - b.winDelta).slice(0, 3),
    [items],
  );

  const filteredHeroes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? heroes.filter((h) => h.name.toLowerCase().includes(q)) : heroes;
    return [...list].sort((a, b) => {
      if (sort === "winDelta-desc") return b.winDelta - a.winDelta;
      if (sort === "winDelta-asc") return a.winDelta - b.winDelta;
      if (sort === "pickDelta-desc") return b.pickDelta - a.pickDelta;
      return b.winRateNow - a.winRateNow;
    });
  }, [heroes, search, sort]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    return [...list].sort((a, b) => {
      if (sort === "winDelta-desc") return b.winDelta - a.winDelta;
      if (sort === "winDelta-asc") return a.winDelta - b.winDelta;
      if (sort === "pickDelta-desc") return b.pickDelta - a.pickDelta;
      return b.winRateNow - a.winRateNow;
    });
  }, [items, search, sort]);

  const handlePatchChange = (id: string) => {
    const params = new URLSearchParams();
    params.set("patch", id);
    if (selectedRankId !== DEFAULT_RANK_ID) params.set("rank", selectedRankId);
    startTransition(() => router.push(`/patches?${params.toString()}`));
  };

  return (
    <div className="space-y-8">
      {/* Barra de seleção de patch */}
      <SlantFrame
        shape="narrowTop"
        border="#c97a2e"
        background="linear-gradient(160deg, rgba(46,30,12,0.88), rgba(8,10,10,0.96))"
        className="!py-4 !px-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <p className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
            Comparação de Atualização
          </p>
          <p className="text-xs text-neutral-300">
            Comparando o patch selecionado com o anterior: <strong className="text-[#f4efe6]">{prevPatchLabel}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPatchId}
            disabled={isPending}
            onChange={(e) => handlePatchChange(e.target.value)}
            aria-label="Selecionar patch para comparação"
            className="rounded-[5px] border border-white/15 bg-black/50 px-3 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            {patches.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </SlantFrame>

      {/* Destaques: Maiores altas e maiores quedas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SlantFrame
          shape="slantLeft"
          border="#389770"
          background="linear-gradient(160deg, rgba(14,44,32,0.88), rgba(8,11,10,0.96))"
          className="space-y-4"
        >
          <div className="border-b border-emerald-500/25 pb-2.5">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-emerald-400">
              Maiores Altas de Win Rate
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-neutral-400">Heróis</p>
              {topHeroBuffs.map((h) => (
                <Link
                  key={h.id}
                  href={`/heroes/${h.id}?patch=${selectedPatchId}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-emerald-400/55 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {h.image && (
                      <img src={h.image} alt="" className="h-7 w-7 shrink-0 rounded-[3px] object-cover" />
                    )}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</span>
                  </div>
                  <DeltaBadge value={h.winDelta} />
                </Link>
              ))}
            </div>

            <div className="space-y-2">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-neutral-400">Itens</p>
              {topItemBuffs.map((it) => (
                <Link
                  key={it.className}
                  href={`/items/${it.className}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-emerald-400/55 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {it.image && (
                      <img src={it.image} alt="" className="h-7 w-7 shrink-0 rounded-[3px] object-cover bg-neutral-900" />
                    )}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{it.name}</span>
                  </div>
                  <DeltaBadge value={it.winDelta} />
                </Link>
              ))}
            </div>
          </div>
        </SlantFrame>

        <SlantFrame
          shape="slantRight"
          border="#9f3246"
          background="linear-gradient(160deg, rgba(46,16,24,0.88), rgba(9,10,11,0.96))"
          className="space-y-4"
        >
          <div className="border-b border-rose-500/25 pb-2.5">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-rose-400">
              Maiores Quedas de Win Rate
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-neutral-400">Heróis</p>
              {topHeroNerfs.map((h) => (
                <Link
                  key={h.id}
                  href={`/heroes/${h.id}?patch=${selectedPatchId}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-rose-400/55 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {h.image && (
                      <img src={h.image} alt="" className="h-7 w-7 shrink-0 rounded-[3px] object-cover" />
                    )}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</span>
                  </div>
                  <DeltaBadge value={h.winDelta} />
                </Link>
              ))}
            </div>

            <div className="space-y-2">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-widest text-neutral-400">Itens</p>
              {topItemNerfs.map((it) => (
                <Link
                  key={it.className}
                  href={`/items/${it.className}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-rose-400/55 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {it.image && (
                      <img src={it.image} alt="" className="h-7 w-7 shrink-0 rounded-[3px] object-cover bg-neutral-900" />
                    )}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{it.name}</span>
                  </div>
                  <DeltaBadge value={it.winDelta} />
                </Link>
              ))}
            </div>
          </div>
        </SlantFrame>
      </div>

      {/* Filtros e tabela completa */}
      <div className="rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 overflow-hidden shadow-2xl">
        <div className="dl-noise dl-halftone relative border-b border-white/10 bg-[#10181a]/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("heroes")}
              className={`rounded-[4px] px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                tab === "heroes"
                  ? "bg-amber-500 text-black"
                  : "border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
              }`}
            >
              Heróis ({heroes.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("items")}
              className={`rounded-[4px] px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                tab === "items"
                  ? "bg-amber-500 text-black"
                  : "border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
              }`}
            >
              Itens ({items.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "heroes" ? "Filtrar herói..." : "Filtrar item..."}
              className="rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar impacto"
              className="rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-1.5 text-xs font-semibold text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="winDelta-desc">Maior ganho de Win Rate</option>
              <option value="winDelta-asc">Maior queda de Win Rate</option>
              <option value="pickDelta-desc">Maior ganho de Pick Rate</option>
              <option value="win-desc">Maior Win Rate atual</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tab === "heroes" ? (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-[#070908] font-deadlock text-[10px] uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Herói</th>
                  <th className="px-4 py-3 text-right">Win Rate</th>
                  <th className="px-4 py-3 text-right">Variação WR</th>
                  <th className="px-4 py-3 text-right">Pick Rate</th>
                  <th className="px-4 py-3 text-right">Variação PR</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Partidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filteredHeroes.map((h) => (
                  <tr key={h.id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/heroes/${h.id}?patch=${selectedPatchId}`}
                        className="flex items-center gap-2.5 font-bold text-[#f4efe6] hover:text-amber-400 transition-colors"
                      >
                        {h.image && (
                          <img src={h.image} alt="" className="h-8 w-8 rounded-[4px] object-cover border border-neutral-800" />
                        )}
                        <span>{h.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-[#f4efe6]">
                      {h.winRateNow.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DeltaBadge value={h.winDelta} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-300">
                      {h.pickRateNow.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DeltaBadge value={h.pickDelta} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-neutral-400 hidden sm:table-cell">
                      {h.matchesNow.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-[#070908] font-deadlock text-[10px] uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-right">Win Rate</th>
                  <th className="px-4 py-3 text-right">Variação WR</th>
                  <th className="px-4 py-3 text-right">Pick Rate</th>
                  <th className="px-4 py-3 text-right">Variação PR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filteredItems.map((it) => {
                  const slot = SLOT_STYLE[it.slot];
                  return (
                    <tr key={it.className} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/items/${it.className}`}
                          className="flex items-center gap-2.5 font-bold text-[#f4efe6] hover:text-amber-400 transition-colors"
                        >
                          {it.image && (
                            <img src={it.image} alt="" className="h-8 w-8 rounded-[4px] object-cover border border-neutral-800 bg-neutral-900" />
                          )}
                          <span>{it.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className={`rounded-[4px] border px-2 py-0.5 text-[10px] font-bold ${slot.badge}`}>
                          {slot.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-[#f4efe6]">
                        {it.winRateNow.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DeltaBadge value={it.winDelta} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-neutral-300">
                        {it.pickRateNow.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DeltaBadge value={it.pickDelta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}