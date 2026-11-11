"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useEffect, type CSSProperties, type DragEvent } from "react";
import type { MakerHero } from "@/app/TierMaker";

export interface CustomTier {
  id: string;
  label: string;
  color: string;
}

export interface PublishedTierList {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  tiers: { label: string; color: string; heroes: number[] }[];
}

const DEFAULT_TIERS: CustomTier[] = [
  { id: "T1", label: "META", color: "#22d3ee" },
  { id: "T2", label: "A", color: "#22c55e" },
  { id: "T3", label: "B", color: "#a3e635" },
  { id: "T4", label: "C", color: "#facc15" },
  { id: "T5", label: "D", color: "#f97316" },
  { id: "T6", label: "F", color: "#dc2626" },
];

const PRESET_COLORS = [
  "#22d3ee", "#22c55e", "#a3e635", "#facc15", "#f97316", "#ef4444",
  "#d946ef", "#8b5cf6", "#ec4899", "#64748b",
];

const STORAGE_KEY = "lockpro_community_tierlists";

export default function TierMakerClient({
  heroes,
  metaTiers,
}: {
  heroes: MakerHero[];
  metaTiers: Record<string, number[]>;
}) {
  const [tab, setTab] = useState<"builder" | "community">("builder");
  const [title, setTitle] = useState("Minha Tier List");
  const [author, setAuthor] = useState("");
  const [tiers, setTiers] = useState<CustomTier[]>(DEFAULT_TIERS);
  const [board, setBoard] = useState<Record<string, number[]>>(() => {
    const b: Record<string, number[]> = { POOL: heroes.map((h) => h.id) };
    DEFAULT_TIERS.forEach((t) => (b[t.id] = []));
    return b;
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: "before" | "after" } | null>(null);
  const [publishedLists, setPublishedLists] = useState<PublishedTierList[]>([]);

  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPublishedLists(JSON.parse(saved));
    } catch {
      // fallback
    }
  }, []);

  const moveHero = (
    heroId: number,
    targetTierId: string,
    refHeroId?: number,
    position: "before" | "after" = "before"
  ) => {
    setBoard((prev) => {
      const next: Record<string, number[]> = {};
      const allZones = [...tiers.map((t) => t.id), "POOL"];
      for (const z of allZones) next[z] = (prev[z] || []).filter((id) => id !== heroId);

      const targetList = [...(next[targetTierId] || [])];
      if (refHeroId !== undefined) {
        const at = targetList.indexOf(refHeroId);
        if (at >= 0) {
          const insertIdx = position === "after" ? at + 1 : at;
          targetList.splice(insertIdx, 0, heroId);
        } else {
          targetList.push(heroId);
        }
      } else {
        targetList.push(heroId);
      }
      next[targetTierId] = targetList;
      return next;
    });
    setSelected(null);
  };

  const updateTierLabel = (tierId: string, label: string) => {
    setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, label } : t)));
  };

  const updateTierColor = (tierId: string, color: string) => {
    setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, color } : t)));
  };

  const moveTierUp = (idx: number) => {
    if (idx <= 0) return;
    setTiers((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const moveTierDown = (idx: number) => {
    if (idx >= tiers.length - 1) return;
    setTiers((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const addTier = (afterIdx: number) => {
    const newId = `T_${Date.now()}`;
    const nextColor = PRESET_COLORS[tiers.length % PRESET_COLORS.length];
    const newTier: CustomTier = { id: newId, label: "NOVO", color: nextColor };

    setTiers((prev) => {
      const copy = [...prev];
      copy.splice(afterIdx + 1, 0, newTier);
      return copy;
    });
    setBoard((prev) => ({ ...prev, [newId]: [] }));
  };

  const deleteTier = (tierId: string) => {
    if (tiers.length <= 1) return alert("A tier list precisa ter pelo menos uma categoria!");
    const heroesToFree = board[tierId] || [];

    setBoard((prev) => {
      const next = { ...prev };
      delete next[tierId];
      next.POOL = [...(prev.POOL || []), ...heroesToFree];
      return next;
    });
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  const fillWithMeta = () => {
    const keys = Object.keys(metaTiers);
    const next: Record<string, number[]> = { POOL: [] };
    const used = new Set<number>();

    tiers.forEach((t, i) => {
      const metaKey = keys[i];
      const list = (metaTiers[metaKey] || []).filter((id) => byId.has(id));
      list.forEach((id) => used.add(id));
      next[t.id] = list;
    });

    next.POOL = heroes.map((h) => h.id).filter((id) => !used.has(id));
    setBoard(next);
  };

  const clearBoard = () => {
    const next: Record<string, number[]> = { POOL: heroes.map((h) => h.id) };
    tiers.forEach((t) => (next[t.id] = []));
    setBoard(next);
  };

  const publishCurrent = () => {
    if (!title.trim()) return alert("Insira um título para sua tier list!");
    const newList: PublishedTierList = {
      id: String(Date.now()),
      title: title.trim(),
      author: author.trim() || "Anônimo",
      createdAt: new Date().toLocaleDateString("pt-BR"),
      tiers: tiers.map((t) => ({
        label: t.label,
        color: t.color,
        heroes: board[t.id] || [],
      })),
    };

    const updated = [newList, ...publishedLists];
    setPublishedLists(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    alert("Tier list publicada com sucesso!");
    setTab("community");
  };

  const loadPublished = (pub: PublishedTierList) => {
    setTitle(pub.title);
    setAuthor(pub.author);
    const newTiers: CustomTier[] = pub.tiers.map((t, i) => ({
      id: `T${i + 1}`,
      label: t.label,
      color: t.color,
    }));
    setTiers(newTiers);

    const next: Record<string, number[]> = { POOL: [] };
    const used = new Set<number>();
    pub.tiers.forEach((t, i) => {
      const id = `T${i + 1}`;
      next[id] = t.heroes;
      t.heroes.forEach((hId) => used.add(hId));
    });
    next.POOL = heroes.map((h) => h.id).filter((id) => !used.has(id));
    setBoard(next);
    setTab("builder");
  };

  const renderHeroChip = (id: number, currentTierId: string) => {
    const hero = byId.get(id);
    if (!hero) return null;

    const isTopTier = currentTierId === tiers[0]?.id;
    const isBottomTier = currentTierId === tiers[tiers.length - 1]?.id;
    const displayImage = isTopTier
      ? hero.gloatImage || hero.image
      : isBottomTier
      ? hero.critImage || hero.image
      : hero.image;

    const isSelected = selected === id;

    const isTarget = dropTarget?.id === id && dragId !== null && dragId !== id;
    const isTargetBefore = isTarget && dropTarget?.position === "before";
    const isTargetAfter = isTarget && dropTarget?.position === "after";

    return (
      <div
        key={id}
        draggable
        style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
        onClick={(e) => {
          e.stopPropagation();
          if (selected !== null && selected !== id) moveHero(selected, currentTierId, id, "before");
          else setSelected(isSelected ? null : id);
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(id));
          e.dataTransfer.effectAllowed = "move";
          if (e.currentTarget) {
            e.dataTransfer.setDragImage(
              e.currentTarget,
              e.currentTarget.offsetWidth / 2,
              e.currentTarget.offsetHeight / 2
            );
          }
          setDragId(id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dragId === null || dragId === id) return;
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const position = e.clientX - rect.left >= rect.width / 2 ? "after" : "before";
          if (dropTarget?.id !== id || dropTarget?.position !== position) {
            setDropTarget({ id, position });
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetPos = dropTarget?.id === id ? dropTarget.position : "before";
          setDropTarget(null);
          setDragOverZone(null);
          if (dragId !== null && dragId !== id) {
            moveHero(dragId, currentTierId, id, targetPos);
          }
          setDragId(null);
        }}
        onDragEnd={() => {
          setDragId(null);
          setDragOverZone(null);
          setDropTarget(null);
        }}
        className={`group relative w-[72px] sm:w-[78px] shrink-0 cursor-grab select-none rounded-xl border bg-neutral-900/40 text-center shadow-md transition-all duration-150 ${
          isSelected
            ? "border-amber-400 ring-2 ring-amber-400/80 -translate-y-1 z-20 scale-105"
            : "border-neutral-800/70 hover:border-amber-500/80 hover:scale-105 hover:z-10"
        } ${dragId === id ? "opacity-25 scale-95 border-dashed border-amber-500/80 shadow-none" : ""}`}
      >
        {/* Feixe de inserção absoluto no vão esquerdo (brilho sólido contínuo, sem piscar) */}
        {isTargetBefore && (
          <div
            aria-hidden
            className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-14 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.95)] z-30"
          />
        )}

        {/* Imagem do Herói com pointer-events-none para eliminar disparos falsos de dragLeave */}
        <div className="hero-card-art pointer-events-none relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-xl">
          <img
            src={displayImage}
            alt={hero.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
        </div>

        {/* Rótulo com pointer-events-none */}
        <div className="pointer-events-none w-full py-1.5 px-1 text-center bg-transparent">
          <p className="truncate text-[10.5px] font-bold leading-tight text-neutral-200 group-hover:text-amber-400 transition-colors">
            {hero.name}
          </p>
        </div>

        {/* Feixe de inserção absoluto no vão direito (brilho sólido contínuo, sem piscar) */}
        {isTargetAfter && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-14 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.95)] z-30"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Abas Superiores */}
      <div className="inline-flex overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/80">
        <button
          type="button"
          onClick={() => setTab("builder")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
            tab === "builder" ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          Montar Tier List
        </button>
        <button
          type="button"
          onClick={() => setTab("community")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
            tab === "community" ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          Comunidade ({publishedLists.length})
        </button>
      </div>

      {tab === "builder" && (
        <div className="space-y-6">
          {/* Cabeçalho do Editor */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-2 flex-1 max-w-xl">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da sua Tier List"
                className="font-deadlock w-full border-b border-neutral-700 bg-transparent text-3xl font-black text-[#f4efe6] outline-none focus:border-amber-500"
              />
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Seu Nickname / Autor"
                className="w-full text-xs font-semibold text-neutral-400 bg-transparent outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Preencher com Meta */}
              <button
                type="button"
                onClick={fillWithMeta}
                className="rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 shadow transition-all duration-150 hover:border-amber-500/70 hover:bg-neutral-800 hover:text-[#f4efe6] hover:scale-[1.02] active:scale-[0.98]"
              >
                Preencher com Meta
              </button>

              {/* Limpar */}
              <button
                type="button"
                onClick={clearBoard}
                className="group inline-flex items-center gap-1.5 rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400 shadow transition-all duration-150 hover:border-rose-500/70 hover:bg-rose-950/30 hover:text-rose-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 transition-transform group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                </svg>
                <span>Limpar</span>
              </button>

              {/* Publicar no Site */}
              <button
                type="button"
                onClick={publishCurrent}
                className="group inline-flex items-center gap-2 rounded-[5px] border border-emerald-400/80 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_12px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(16,185,129,0.55)] active:scale-[0.98]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 11V2M4 5l4-3 4 3M2 14h12" />
                </svg>
                <span>Publicar no Site</span>
              </button>
            </div>
          </div>

          {/* Prancha do Editor */}
          <div className="divide-y divide-neutral-800/90 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 shadow-2xl backdrop-blur-sm overflow-hidden">
            {tiers.map((tier, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === tiers.length - 1;
              const list = board[tier.id] || [];

              return (
                <div
                  key={tier.id}
                  className={`flex min-h-[105px] flex-row transition-colors ${
                    isFirst ? "rounded-t-2xl" : ""
                  } ${isLast ? "rounded-b-2xl" : ""}`}
                >
                  {/* Bloco Lateral Editável (Nome e Cor) com Cantos Arredondados */}
                  <div
                    style={{ backgroundColor: tier.color }}
                    className={`relative flex w-20 sm:w-28 md:w-32 shrink-0 flex-col items-center justify-center p-2 text-center select-none ${
                      isFirst ? "rounded-tl-2xl" : ""
                    } ${isLast ? "rounded-bl-2xl" : ""}`}
                  >
                    <input
                      value={tier.label}
                      onChange={(e) => updateTierLabel(tier.id, e.target.value)}
                      className="font-deadlock w-full bg-transparent text-center text-lg sm:text-xl font-black uppercase text-black outline-none leading-none px-1"
                    />

                    {/* Botão de Pincel com a Estética do Deadlock */}
                    <label
                      title="Alterar cor deste tier"
                      className="group/brush absolute bottom-1.5 left-1.5 flex h-6 w-6 cursor-pointer items-center justify-center -skew-x-6 rounded-[3px] border border-black/50 bg-[#0d1210]/85 text-[#f4efe6] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:border-amber-400/80 hover:bg-black hover:text-amber-400 hover:scale-110 active:scale-95"
                    >
                      {/* Ícone Nítido de Pincel de Pintura (Cabo, Virola e Cerdas com Tinta) */}
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        className="h-3.5 w-3.5 transition-transform group-hover/brush:rotate-12"
                        fill="currentColor"
                      >
                        {/* Cabo e virola */}
                        <path d="M14.85 1.15a1.5 1.5 0 0 0-2.12 0L7.5 6.38l2.12 2.12 5.23-5.23a1.5 1.5 0 0 0 0-2.12z" />
                        {/* Cerdas com ponta de tinta afunilada */}
                        <path d="M6.8 7.2 2.3 11.7c-.6.6-.9 1.4-1.1 2.2-.1.5.3.9.8.8.8-.2 1.6-.5 2.2-1.1l4.5-4.5-1.9-1.9z" />
                      </svg>
                      {/* Input de cor nativo invisível sobreposto */}
                      <input
                        type="color"
                        value={tier.color}
                        onChange={(e) => updateTierColor(tier.id, e.target.value)}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Área de Soltar Heróis */}
                    <div
                    onClick={() => selected !== null && moveHero(selected, tier.id)}
                    onDragOver={(e: DragEvent) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragId !== null && dragOverZone !== tier.id) setDragOverZone(tier.id);
                    }}
                    onDragLeave={(e: DragEvent) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setDragOverZone(null);
                        setDropTarget(null);
                      }
                    }}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault();
                      setDragOverZone(null);
                      setDropTarget(null);
                      if (dragId !== null) moveHero(dragId, tier.id);
                      setDragId(null);
                    }}
                    className={`flex flex-1 flex-wrap content-center items-center gap-2 p-3 transition-colors cursor-pointer ${
                      dragOverZone === tier.id ? "bg-amber-500/15 ring-2 ring-inset ring-amber-500/40" : "bg-neutral-950/75"
                    }`}
                  >
                    {list.map((id) => renderHeroChip(id, tier.id))}
                  </div>

                  {/* Painel de Controles do Tier no Canto Direito */}
                  <div
                    className={`flex flex-col items-center justify-center gap-1 px-2 shrink-0 border-l border-neutral-800/80 bg-neutral-950/90 select-none ${
                      isFirst ? "rounded-tr-2xl" : ""
                    } ${isLast ? "rounded-br-2xl" : ""}`}
                  >
                    {/* Seta para Cima */}
                    <button
                      type="button"
                      title="Mover categoria para cima"
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveTierUp(idx);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path fillRule="evenodd" d="M8 3.293l4.146 4.147a.5.5 0 0 1-.708.708L8 4.707 4.56 8.148a.5.5 0 1 1-.707-.708L8 3.293z" />
                      </svg>
                    </button>

                    {/* Adicionar Novo Tier Abaixo (+) */}
                    <button
                      type="button"
                      title="Adicionar novo tier abaixo"
                      onClick={(e) => {
                        e.stopPropagation();
                        addTier(idx);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </button>

                    {/* Apagar / Remover Tier (Lixeira) */}
                    <button
                      type="button"
                      title="Remover este tier (heróis voltam para a bandeja)"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTier(tier.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-rose-950/60 hover:text-rose-400 transition-colors"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                      </svg>
                    </button>

                    {/* Seta para Baixo */}
                    <button
                      type="button"
                      title="Mover categoria para baixo"
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveTierDown(idx);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path fillRule="evenodd" d="M8 12.707l-4.146-4.147a.5.5 0 0 1 .708-.708L8 11.293l3.44-3.441a.5.5 0 0 1 .707.708L8 12.707z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bandeja de Heróis Disponíveis */}
          <section
            onClick={() => selected !== null && moveHero(selected, "POOL")}
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragId !== null && dragOverZone !== "POOL") setDragOverZone("POOL");
            }}
            onDragLeave={(e: DragEvent) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragOverZone(null);
                setDropTarget(null);
              }
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setDragOverZone(null);
              setDropTarget(null);
              if (dragId !== null) moveHero(dragId, "POOL");
              setDragId(null);
            }}
            className={`rounded-2xl border transition-colors p-4 shadow-xl ${
              dragOverZone === "POOL" ? "border-amber-500/80 bg-neutral-900/90" : "border-neutral-800/90 bg-neutral-950/95"
            }`}
          >
            <div className="flex items-center justify-between pb-2 text-[11px] font-black uppercase tracking-wider text-neutral-400">
              <span>Heróis Disponíveis</span>
              <span>{(board.POOL || []).length} restantes</span>
            </div>
            <div
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              className="flex flex-wrap gap-2 max-h-[36svh] overflow-y-auto [scrollbar-width:thin] p-1"
            >
              {(board.POOL || []).map((id) => renderHeroChip(id, "POOL"))}
            </div>
          </section>
        </div>
      )}

      {tab === "community" && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-neutral-400">
            Tier lists criadas e publicadas pelos jogadores:
          </p>
          {publishedLists.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500 italic">
              Nenhuma tier list publicada ainda. Monte a sua na aba anterior e clique em &quot;Publicar no Site&quot;!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {publishedLists.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 shadow-lg backdrop-blur-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-deadlock text-lg font-black text-[#f4efe6]">{item.title}</h4>
                      <p className="text-xs text-neutral-400">
                        Por <strong className="text-neutral-200">{item.author}</strong> • {item.createdAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadPublished(item)}
                      className="rounded bg-amber-500 px-3 py-1 text-xs font-black uppercase text-black hover:brightness-110"
                    >
                      Abrir no Editor
                    </button>
                  </div>

                  {/* Prévia dos Tiers */}
                  <div className="space-y-1">
                    {item.tiers.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                          style={{ backgroundColor: t.color }}
                          className="font-deadlock w-16 px-1.5 py-0.5 text-center text-[10px] font-black uppercase text-black rounded"
                        >
                          {t.label}
                        </span>
                        <span className="text-neutral-400 text-[11px]">
                          {t.heroes.length} heróis
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}