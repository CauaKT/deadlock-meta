"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { ItemSlot, ShopItem } from "@/lib/deadlock";
import ItemTooltip, { TIP_WIDTH } from "@/app/items/ItemTooltip";
import SlantFrame from "@/components/ui/SlantFrame";

export interface CalcHero {
  id: number;
  name: string;
  image: string | null;
  maxHealth: number;
  healthRegen: number;
  moveSpeed: number;
  stamina: number;
}

interface Props {
  heroes: CalcHero[];
  items: ShopItem[];
}

const MAX_SLOTS = 12;

const SLOT_META: Record<
  ItemSlot,
  { label: string; color: string; border: string; bg: string; accent: string }
> = {
  weapon: {
    label: "Arma",
    color: "text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    accent: "#c97a2e",
  },
  vitality: {
    label: "Vitalidade",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    accent: "#659337",
  },
  spirit: {
    label: "Espírito",
    color: "text-purple-400",
    border: "border-purple-500/40",
    bg: "bg-purple-500/10",
    accent: "#9153b8",
  },
};

function parseStatNumber(raw: string): { num: number; isPercent: boolean; unit: string } | null {
  const clean = raw.trim().replace(",", ".");
  const match = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*(%|m\/s|m|s)?$/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const unit = match[2] ?? "";
  return { num, isPercent: unit === "%", unit };
}

export default function CalculatorClient({ heroes, items }: Props) {
  const { confirm, modal } = useConfirm();
  const [selectedHeroId, setSelectedHeroId] = useState<number | "">(heroes[0]?.id ?? "");
  const [equipped, setEquipped] = useState<ShopItem[]>([]);
  const [slotFilter, setSlotFilter] = useState<ItemSlot | "all">("all");
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"relevance" | "winrate-desc" | "winrate-asc" | "name-asc" | "cost-asc" | "cost-desc">("relevance");

  const [itemStats, setItemStats] = useState<Record<number, { winRate: number; matches: number }>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [tip, setTip] = useState<{ item: ShopItem; x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    const qs = selectedHeroId ? `?heroId=${selectedHeroId}` : "";
    fetch(`/api/item-stats${qs}`)
      .then((res) => (res.ok ? res.json() : { stats: {} }))
      .then((data) => {
        if (!cancelled) {
          setItemStats(data?.stats && typeof data.stats === "object" ? data.stats : {});
        }
      })
      .catch(() => {
        if (!cancelled) setItemStats({});
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedHeroId]);

  const selectedHero = useMemo(
    () => heroes.find((h) => h.id === selectedHeroId) ?? null,
    [heroes, selectedHeroId],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((it) => {
      if (slotFilter !== "all" && it.slot !== slotFilter) return false;
      if (tierFilter !== "all" && it.tier !== tierFilter) return false;
      if (q && !it.name.toLowerCase().includes(q) && !it.searchText.includes(q)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "relevance") {
        const ma = itemStats[a.id]?.matches ?? 0;
        const mb = itemStats[b.id]?.matches ?? 0;
        return mb - ma || a.cost - b.cost;
      }
      if (sort === "winrate-desc") {
        const wa = itemStats[a.id]?.winRate ?? -1;
        const wb = itemStats[b.id]?.winRate ?? -1;
        return wb - wa;
      }
      if (sort === "winrate-asc") {
        const wa = itemStats[a.id]?.winRate ?? 999;
        const wb = itemStats[b.id]?.winRate ?? 999;
        return wa - wb;
      }
      if (sort === "cost-asc") return a.cost - b.cost || a.name.localeCompare(b.name, "pt-BR");
      if (sort === "cost-desc") return b.cost - a.cost || a.name.localeCompare(b.name, "pt-BR");
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [items, slotFilter, tierFilter, search, sort, itemStats]);

  const totalCost = useMemo(
    () => equipped.reduce((sum, it) => sum + it.cost, 0),
    [equipped],
  );

  const buildWinRate = useMemo(() => {
    const valid = equipped
      .map((it) => itemStats[it.id]?.winRate)
      .filter((wr): wr is number => typeof wr === "number");
    if (valid.length === 0) return null;
    return valid.reduce((sum, v) => sum + v, 0) / valid.length;
  }, [equipped, itemStats]);

  const costBySlot = useMemo(() => {
    const acc = { weapon: 0, vitality: 0, spirit: 0 };
    for (const it of equipped) {
      acc[it.slot] += it.cost;
    }
    return acc;
  }, [equipped]);

  const aggregatedStats = useMemo(() => {
    const map = new Map<string, { label: string; total: number; unit: string; count: number }>();

    for (const it of equipped) {
      for (const sec of it.sections) {
        for (const prop of sec.stats) {
          const parsed = parseStatNumber(prop.value);
          if (!parsed) continue;
          const key = `${prop.label.toLowerCase()}::${parsed.unit.toLowerCase()}`;
          const prev = map.get(key);
          if (prev) {
            prev.total += parsed.num;
            prev.count += 1;
          } else {
            map.set(key, {
              label: prop.label,
              total: parsed.num,
              unit: parsed.unit,
              count: 1,
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [equipped]);

  const bonusHealth = useMemo(() => {
    const hit = aggregatedStats.find(
      (s) => s.label.toLowerCase().includes("vida máxima") && s.unit === "",
    );
    return hit ? hit.total : 0;
  }, [aggregatedStats]);

  const bonusMoveSpeed = useMemo(() => {
    const hit = aggregatedStats.find(
      (s) => s.label.toLowerCase().includes("velocidade de movimento") && (s.unit === "m/s" || s.unit === ""),
    );
    return hit ? hit.total : 0;
  }, [aggregatedStats]);

  const addItem = (item: ShopItem) => {
    setEquipped((prev) => {
      if (prev.length >= MAX_SLOTS) return prev;
      if (prev.some((p) => p.className === item.className)) return prev;
      return [...prev, item];
    });
  };

  const removeItem = (className: string) => {
    setEquipped((prev) => prev.filter((p) => p.className !== className));
  };

  const showTip = (item: ShopItem, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x =
      r.right + 10 + TIP_WIDTH <= window.innerWidth
        ? r.right + 10
        : Math.max(8, r.left - TIP_WIDTH - 10);
    const y = Math.min(Math.max(8, r.top), Math.max(8, window.innerHeight - 360));
    setTip({ item, x, y });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUNA ESQUERDA: Resumo da Build + Atributos */}
      <div className="lg:col-span-5 space-y-5">
        <SlantFrame
          shape="narrowTop"
          border="#3897a1"
          background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
          className="space-y-4"
        >
          <div className="border-b border-white/10 pb-3 flex items-center justify-between gap-2">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              Herói & Orçamento
            </h2>
            <div className="flex items-center gap-3">
              {buildWinRate !== null && (
                <span
                  title="Média da Win Rate dos itens equipados para o herói selecionado"
                  className={`rounded-[4px] border px-2 py-0.5 font-mono text-xs font-black ${
                    buildWinRate >= 52
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                      : buildWinRate <= 48
                        ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  WR Build: {buildWinRate.toFixed(1)}%
                </span>
              )}
              <span className="font-mono text-sm font-black text-[#5ce1b6]">
                {totalCost.toLocaleString("pt-BR")} Almas
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedHero?.image && (
                <img
                  src={selectedHero.image}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-[4px] object-cover border border-white/15"
                />
              )}
              <select
                value={selectedHeroId}
                onChange={(e) => setSelectedHeroId(e.target.value ? Number(e.target.value) : "")}
                aria-label="Selecionar herói"
                className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="">Todos os heróis (geral)</option>
                {heroes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedHero && (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Vida Máxima
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-black text-emerald-400">
                    {Math.round(selectedHero.maxHealth + bonusHealth)}
                    {bonusHealth > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-neutral-400">
                        ({Math.round(selectedHero.maxHealth)} + {Math.round(bonusHealth)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Velocidade
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-black text-[#f4efe6]">
                    {(selectedHero.moveSpeed + bonusMoveSpeed).toFixed(1)} m/s
                  </p>
                </div>
                <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Regen. Vida
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-black text-[#f4efe6]">
                    {selectedHero.healthRegen.toFixed(1)} /s
                  </p>
                </div>
                <div className="rounded-[4px] border border-white/10 bg-black/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Stamina Base
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-black text-[#f4efe6]">
                    {selectedHero.stamina}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {(["weapon", "vitality", "spirit"] as ItemSlot[]).map((slot) => (
                <div
                  key={slot}
                  className={`rounded-[4px] border px-2 py-1.5 bg-black/40 ${SLOT_META[slot].border}`}
                >
                  <p className={`font-deadlock text-[10px] font-black uppercase ${SLOT_META[slot].color}`}>
                    {SLOT_META[slot].label}
                  </p>
                  <p className="font-mono font-bold text-[#f4efe6]">
                    {costBySlot[slot].toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SlantFrame>

        {/* Slots Equipados */}
        <SlantFrame
          shape="slantLeft"
          border="#c97a2e"
          background="linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))"
          className="space-y-3"
        >
          <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
            <h2 className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
              Itens Equipados ({equipped.length}/{MAX_SLOTS})
            </h2>
            {equipped.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Limpar todos os itens?",
                    description: "Todos os itens equipados na simulação atual serão removidos.",
                    confirmLabel: "Limpar tudo",
                    tone: "warning",
                  });
                  if (ok) setEquipped([]);
                }}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div>
            {equipped.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-400">
                Clique nos itens do catálogo ao lado para simular sua build.
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
                {equipped.map((it) => (
                  <div
                    key={it.className}
                    onMouseEnter={(e) => showTip(it, e.currentTarget)}
                    onMouseLeave={() => setTip(null)}
                    className={`group relative rounded-[4px] border p-1.5 text-center ${SLOT_META[it.slot].border} bg-black/50`}
                  >
                    <button
                      type="button"
                      onClick={() => removeItem(it.className)}
                      title={`Remover ${it.name}`}
                      className="absolute -right-1.5 -top-1.5 z-10 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white group-hover:flex cursor-pointer"
                    >
                      ×
                    </button>
                    {it.image && (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="mx-auto h-10 w-10 rounded-[3px] object-cover"
                      />
                    )}
                    <p className="mt-1 truncate text-[10px] font-semibold text-[#f4efe6]">
                      {it.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlantFrame>

        {/* Soma Total dos Atributos */}
        <SlantFrame
          shape="slantRight"
          border="#659337"
          background="linear-gradient(160deg, rgba(22,38,14,0.88), rgba(8,11,9,0.96))"
          className="space-y-3"
        >
          <div className="border-b border-white/10 pb-2.5">
            <h2 className="font-deadlock text-xs font-black uppercase tracking-wider text-emerald-400">
              Atributos Somados dos Itens
            </h2>
          </div>

          <div>
            {aggregatedStats.length === 0 ? (
              <p className="text-xs text-neutral-400">
                Nenhum atributo passivo somado ainda.
              </p>
            ) : (
              <div className="divide-y divide-white/10 max-h-80 overflow-y-auto lp-scroll pr-1">
                {aggregatedStats.map((stat) => (
                  <div
                    key={`${stat.label}-${stat.unit}`}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-neutral-300">{stat.label}</span>
                    <span className="font-mono font-bold text-amber-400">
                      {stat.total > 0 ? "+" : ""}
                      {Number.isInteger(stat.total) ? stat.total : stat.total.toFixed(1)}
                      {stat.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlantFrame>
      </div>

      {/* COLUNA DIREITA: Catálogo Compacto (Ícone + Win Rate por Campeão) */}
      <div className="lg:col-span-7 rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 overflow-hidden shadow-2xl">
        <div className="dl-noise dl-halftone relative border-b border-white/10 bg-[#10181a]/90 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "weapon", "vitality", "spirit"] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSlotFilter(slot)}
                  className={`rounded-[4px] px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    slotFilter === slot
                      ? "bg-amber-500 text-black"
                      : "border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
                  }`}
                >
                  {slot === "all" ? "Todos" : SLOT_META[slot].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {(["all", 1, 2, 3, 4] as const).map((t) => (
                <button
                  key={String(t)}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  className={`rounded-[4px] px-2.5 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                    tierFilter === t
                      ? "bg-[#f4efe6] text-black"
                      : "border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  {t === "all" ? "T*" : `T${t}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item por nome ou atributo..."
              className="flex-1 min-w-[180px] rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Ordenar itens"
              className="rounded-[4px] border border-neutral-700 bg-[#070908] px-2.5 py-2 text-xs font-semibold text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="relevance">Relevância (Mais usados)</option>
              <option value="winrate-desc">Maior Win Rate</option>
              <option value="winrate-asc">Menor Win Rate</option>
              <option value="name-asc">Nome (A–Z)</option>
              <option value="cost-asc">Menor Custo</option>
              <option value="cost-desc">Maior Custo</option>
            </select>
            {statsLoading && (
              <span className="shrink-0 text-[11px] font-mono text-amber-400">
                Atualizando WR...
              </span>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2.5 max-h-[75vh] overflow-y-auto lp-scroll">
          {filteredItems.map((item) => {
            const already = equipped.some((e) => e.className === item.className);
            const full = equipped.length >= MAX_SLOTS;
            const wr = itemStats[item.id]?.winRate;
            const wrColor =
              wr === undefined
                ? "text-neutral-500"
                : wr >= 52
                  ? "text-emerald-400"
                  : wr <= 48
                    ? "text-rose-400"
                    : "text-amber-300";

            return (
              <button
                key={item.className}
                type="button"
                disabled={!already && full}
                onClick={() => (already ? removeItem(item.className) : addItem(item))}
                onMouseEnter={(e) => showTip(item, e.currentTarget)}
                onMouseLeave={() => setTip(null)}
                onFocus={(e) => showTip(item, e.currentTarget)}
                onBlur={() => setTip(null)}
                aria-label={item.name}
                className={`flex flex-col items-center justify-between gap-1 rounded-[4px] border p-2 transition-all cursor-pointer disabled:cursor-default ${
                  already
                    ? "border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50"
                    : `${SLOT_META[item.slot].border} bg-[#070908] hover:scale-105 hover:border-amber-400`
                }`}
              >
                <span className={`font-mono text-[10px] font-black leading-none ${wrColor}`}>
                  {wr !== undefined ? `${wr.toFixed(1)}%` : "—"}
                </span>

                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-11 w-11 rounded-[3px] object-cover bg-neutral-900"
                  />
                ) : (
                  <span className="h-11 w-11 rounded-[3px] bg-neutral-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tip && (
        <ItemTooltip
          item={tip.item}
          accent={SLOT_META[tip.item.slot].accent}
          x={tip.x}
          y={tip.y}
        />
      )}
      {modal}
    </div>
  );
}