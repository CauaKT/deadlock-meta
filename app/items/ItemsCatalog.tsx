"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import type { ItemSlot, ShopItem } from "@/lib/deadlock";

// Cores aproximadas, medidas em prints da loja do jogo; ajuste aqui se algo destoar
interface Vendor {
  name: string;
  label: string;
  board: string;
  plate: string;
  panel: string;
  panelLast: string;
  accent: string;
  tileArt: [string, string, string, string];
}

const VENDORS: Record<ItemSlot | "all", Vendor> = {
  all: {
    name: "Todos",
    label: "Todos os itens",
    board: "#bdb4a2",
    plate: "#2b2a26",
    panel: "#7b7868",
    panelLast: "#2a2925",
    accent: "#e8e0d0",
    tileArt: ["#b3a894", "#6d6a5c", "#3d3b33", "#2a2925"],
  },
  weapon: {
    name: "Fairfax",
    label: "Arma",
    board: "#b8a282",
    plate: "#3b2d1a",
    panel: "#7a6a45",
    panelLast: "#2e281c",
    accent: "#e2a23f",
    tileArt: ["#b49a74", "#8a5a2c", "#4a3320", "#2f2519"],
  },
  vitality: {
    name: "MPS",
    label: "Vitalidade",
    board: "#c3b8a2",
    plate: "#394d2d",
    panel: "#80806b",
    panelLast: "#334335",
    accent: "#8fc43a",
    tileArt: ["#b3a894", "#4d7e73", "#2f3228", "#2f4234"],
  },
  spirit: {
    name: "Curiosity Catalog",
    label: "Espírito",
    board: "#cab4b6",
    plate: "#3a2d3d",
    panel: "#766272",
    panelLast: "#2d2236",
    accent: "#c79af0",
    tileArt: ["#c2adb6", "#7d5a8e", "#4a3556", "#2d2236"],
  },
};
const SLOT_ORDER: ItemSlot[] = ["weapon", "vitality", "spirit"];

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// O jogo mostra um custo por tier; usamos o custo mais comum entre os itens do tier
function tierCost(items: ShopItem[]) {
  const count = new Map<number, number>();
  items.forEach((i) => count.set(i.cost, (count.get(i.cost) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

const EXPERT_TIER = 4;

const byName = (a: ShopItem, b: ShopItem) => a.name.localeCompare(b.name, "pt-BR");
type SortKey = "cost-asc" | "cost-desc" | "name-asc" | "name-desc" | "active";
const SORTS: { key: SortKey; label: string; fn: (a: ShopItem, b: ShopItem) => number }[] = [
  { key: "cost-asc", label: "Custo (menor primeiro)", fn: (a, b) => a.cost - b.cost || byName(a, b) },
  { key: "cost-desc", label: "Custo (maior primeiro)", fn: (a, b) => b.cost - a.cost || byName(a, b) },
  { key: "name-asc", label: "Nome (A-Z)", fn: byName },
  { key: "name-desc", label: "Nome (Z-A)", fn: (a, b) => byName(b, a) },
  { key: "active", label: "Ativos primeiro", fn: (a, b) => Number(b.isActive) - Number(a.isActive) || a.cost - b.cost || byName(a, b) },
];

const chipClass = (active: boolean) =>
  `px-3.5 py-1.5 rounded-[3px] border text-xs font-black uppercase tracking-wider transition-colors ${
    active
      ? "border-amber-500/70 bg-amber-500/15 text-amber-300"
      : "border-neutral-800 bg-black/40 text-neutral-400 hover:text-neutral-200"
  }`;

function Tile({ item, vendor, tierIndex, last, dim }: { item: ShopItem; vendor: Vendor; tierIndex: number; last: boolean; dim: boolean }) {
  return (
    <div
      title={item.name}
      className={`overflow-hidden rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.45)] transition-opacity ${dim ? "opacity-20" : ""}`}
      style={{ background: last ? "rgba(0,0,0,0.55)" : "#e2d2b9" }}
    >
      <div
        className="relative flex aspect-square items-center justify-center p-1.5"
        style={{ background: vendor.tileArt[Math.min(tierIndex, 3)] }}
      >
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" />
        ) : null}
        {item.isActive && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-[2px] bg-black/80 px-1 text-[8px] font-black uppercase tracking-wider text-white">
            Ativo
          </span>
        )}
      </div>
      <p
        className={`flex min-h-[2.6em] items-center justify-center px-1 py-1 text-center text-[10px] font-bold leading-tight ${
          last ? "text-[#e2d2b9]" : "text-[#2a241a]"
        }`}
      >
        {item.name}
      </p>
    </div>
  );
}

export default function ItemsCatalog({ items }: { items: ShopItem[] }) {
  const [slot, setSlot] = useState<ItemSlot | null>("weapon");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("cost-asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const allTiers = useMemo(() => Array.from(new Set(items.map((i) => i.tier))).sort((a, b) => a - b), [items]);
  const [shownTiers, setShownTiers] = useState<number[]>(() => allTiers.filter((t) => t <= EXPERT_TIER));
  const activeFilters = allTiers.length - shownTiers.length + (onlyActive ? 1 : 0);

  const boards = useMemo(() => {
    const q = normalize(query.trim());
    const key: ItemSlot | "all" = slot ?? "all";
    return [key]
      .map((s) => {
        const own = items
          .filter((i) => (s === "all" || i.slot === s) && shownTiers.includes(i.tier) && (!onlyActive || i.isActive))
          .sort((SORTS.find((o) => o.key === sort) ?? SORTS[0]).fn);
        const tiers = Array.from(new Set(own.map((i) => i.tier)))
          .sort((a, b) => a - b)
          .map((t) => ({ tier: t, items: own.filter((i) => i.tier === t) }));
        const hits = own.filter((i) => normalize(i.name).includes(q)).length;
        return { key: s, tiers, hits };
      })
      .filter((b) => b.hits > 0);
  }, [items, slot, query, sort, onlyActive, shownTiers]);

  const q = normalize(query.trim());

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar item pelo nome"
          className="w-full max-w-sm rounded-[3px] border border-neutral-800 bg-black/50 px-4 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSlot(null)} className={chipClass(slot === null)}>
            Todos
          </button>
          {SLOT_ORDER.map((s) => (
            <button key={s} type="button" onClick={() => setSlot(s)} className={chipClass(slot === s)}>
              {VENDORS[s].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
            className={chipClass(filterOpen)}
          >
            Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
            Ordenar por
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-[3px] border border-neutral-800 bg-black/50 px-3 py-1.5 text-xs font-bold normal-case tracking-normal text-[#f4efe6] focus:border-amber-500/60 focus:outline-none"
            >
              {SORTS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filterOpen && (
          <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-neutral-800 bg-black/40 p-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Tiers</span>
            {allTiers.map((t) => {
              const on = shownTiers.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setShownTiers((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))}
                  className={chipClass(on)}
                >
                  Tier {t}
                </button>
              );
            })}
            <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Tipo</span>
            <button
              type="button"
              aria-pressed={onlyActive}
              onClick={() => setOnlyActive((v) => !v)}
              className={chipClass(onlyActive)}
            >
              Somente ativos
            </button>
          </div>
        )}
      </div>

      {boards.length === 0 && <p className="text-sm text-neutral-500 italic">Nenhum item encontrado.</p>}

      {boards.map((b) => {
        const v = VENDORS[b.key];
        return (
          <section
            key={b.key}
            className="dl-noise relative space-y-4 overflow-hidden rounded-[4px] border-4 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.7)] sm:p-5"
            style={{ background: v.board, borderColor: v.plate }}
          >
            <div
              className="inline-flex items-baseline gap-3 rounded-[3px] px-5 py-2"
              style={{ background: v.plate }}
            >
              <h2 className="font-deadlock text-2xl font-black uppercase tracking-wider text-[#f4efe6]">{v.name}</h2>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: v.accent }}>
                {v.label}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[5fr_6fr]">
              {b.tiers.map((g) => {
                const last = g.tier >= EXPERT_TIER;
                return (
                  <div
                    key={g.tier}
                    className="rounded-[3px] p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    style={{ background: last ? v.panelLast : v.panel }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className="font-deadlock rounded-[3px] px-3 py-1 text-base font-black text-white"
                        style={{ background: v.plate }}
                      >
                        ${tierCost(g.items)}
                      </span>
                      <span className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]/70">
                        Tier {g.tier}
                      </span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}>
                      {g.items.map((item) => (
                        <Tile
                          key={item.className}
                          item={item}
                          vendor={VENDORS[item.slot]}
                          tierIndex={g.tier - 1}
                          last={last}
                          dim={q !== "" && !normalize(item.name).includes(q)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}