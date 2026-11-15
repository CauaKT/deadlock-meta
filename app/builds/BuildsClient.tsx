"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  createBuild,
  deleteBuild,
  getBuildById,
  getCommunityBuilds,
  getCurrentClientUser,
  subscribeToAuthChanges,
  updateBuild,
} from "@/lib/backend/client";
import type { AuthUser, BuildPhases, CommunityBuildItem } from "@/lib/backend/types";
import type { ItemSlot, ShopItem } from "@/lib/deadlock";

export interface BuildHeroOption {
  id: number;
  name: string;
  image: string | null;
}

interface Props {
  heroes: BuildHeroOption[];
  items: ShopItem[];
}

type PhaseKey = keyof BuildPhases;

const PHASES: Array<{ key: PhaseKey; label: string; hint: string }> = [
  { key: "early", label: "Early Game", hint: "Itens iniciais e fase de rotas" },
  { key: "mid", label: "Mid Game", hint: "Pico de poder e lutas por objetivos" },
  { key: "late", label: "Late Game", hint: "Fechamento da build" },
  { key: "situational", label: "Situacional", hint: "Contra-respostas e adaptação" },
];

const EMPTY_PHASES: BuildPhases = { early: [], mid: [], late: [], situational: [] };

export default function BuildsClient({ heroes, items }: Props) {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const initialHeroParam = searchParams.get("heroId");

  const itemsByClass = useMemo(() => new Map(items.map((i) => [i.className, i])), [items]);
  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [builds, setBuilds] = useState<CommunityBuildItem[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [heroId, setHeroId] = useState<number>(() => {
    const parsed = initialHeroParam ? Number(initialHeroParam) : 0;
    return parsed > 0 && heroes.some((h) => h.id === parsed) ? parsed : (heroes[0]?.id ?? 1);
  });
  const [title, setTitle] = useState("");
  const [activePhase, setActivePhase] = useState<PhaseKey>("early");
  const [phases, setPhases] = useState<BuildPhases>(EMPTY_PHASES);

  const [slotFilter, setSlotFilter] = useState<ItemSlot | "all">("all");
  const [search, setSearch] = useState("");
  const [communityHeroFilter, setCommunityHeroFilter] = useState<number | "all">("all");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void getCurrentClientUser().then(setUser);
    return subscribeToAuthChanges(setUser);
  }, []);

  useEffect(() => {
    setLoadingBuilds(true);
    void getCommunityBuilds()
      .then(setBuilds)
      .finally(() => setLoadingBuilds(false));
  }, []);

  useEffect(() => {
    if (!editId) return;
    void getBuildById(editId).then((b) => {
      if (!b || !b.canEdit) return;
      setEditingId(b.id);
      setHeroId(b.heroId);
      setTitle(b.title);
      setPhases(b.phases);
    });
  }, [editId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (slotFilter !== "all" && it.slot !== slotFilter) return false;
      if (q && !it.name.toLowerCase().includes(q) && !it.searchText.includes(q)) return false;
      return true;
    });
  }, [items, slotFilter, search]);

  const totalCost = useMemo(() => {
    const unique = new Set([
      ...phases.early,
      ...phases.mid,
      ...phases.late,
      ...phases.situational,
    ]);
    let sum = 0;
    for (const cn of unique) {
      sum += itemsByClass.get(cn)?.cost ?? 0;
    }
    return sum;
  }, [phases, itemsByClass]);

  const toggleItemInPhase = (className: string) => {
    setPhases((prev) => {
      const list = prev[activePhase];
      if (list.includes(className)) {
        return { ...prev, [activePhase]: list.filter((c) => c !== className) };
      }
      if (list.length >= 12) return prev;
      return { ...prev, [activePhase]: [...list, className] };
    });
  };

  const handleSave = async () => {
    if (!user) {
      setFeedback({ type: "error", text: "Faça login para publicar sua build na comunidade." });
      return;
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setFeedback({ type: "error", text: "Informe um título com pelo menos 2 caracteres." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = { heroId, title: cleanTitle, phases };
    const res = editingId
      ? await updateBuild(editingId, payload)
      : await createBuild(payload);

    setSaving(false);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }

    setBuilds((prev) => {
      const exists = prev.some((b) => b.id === res.item.id);
      return exists
        ? prev.map((b) => (b.id === res.item.id ? res.item : b))
        : [res.item, ...prev];
    });
    setEditingId(null);
    setTitle("");
    setPhases(EMPTY_PHASES);
    setFeedback({ type: "success", text: "Build publicada na comunidade!" });
  };

  const handleDelete = async (id: string) => {
    const res = await deleteBuild(id);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setBuilds((prev) => prev.filter((b) => b.id !== id));
  };

  const visibleBuilds = useMemo(() => {
    if (communityHeroFilter === "all") return builds;
    return builds.filter((b) => b.heroId === communityHeroFilter);
  }, [builds, communityHeroFilter]);

  return (
    <div className="space-y-10">
      {feedback && (
        <div
          className={`rounded-[5px] border px-4 py-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* EDITOR DE BUILD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-4 space-y-4 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                  Herói
                </label>
                <select
                  value={heroId}
                  onChange={(e) => setHeroId(Number(e.target.value))}
                  className="w-full rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-2 font-deadlock text-xs font-black uppercase text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                  Título da Build
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Haze Espírito Explosivo"
                  className="w-full rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Fases da Build */}
            <div className="space-y-3">
              {PHASES.map((phase) => {
                const selected = activePhase === phase.key;
                const list = phases[phase.key];
                return (
                  <div
                    key={phase.key}
                    onClick={() => setActivePhase(phase.key)}
                    className={`rounded-[4px] border p-3 transition-colors cursor-pointer ${
                      selected
                        ? "border-amber-500/70 bg-amber-500/5"
                        : "border-neutral-800 bg-[#070908] hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                          {phase.label} ({list.length}/12)
                        </p>
                        <p className="text-[10px] text-neutral-500">{phase.hint}</p>
                      </div>
                      {selected && (
                        <span className="rounded-[3px] bg-amber-500 px-2 py-0.5 font-deadlock text-[9px] font-black uppercase text-black">
                          Editando
                        </span>
                      )}
                    </div>

                    {list.length === 0 ? (
                      <p className="text-[11px] text-neutral-600 italic">
                        Clique nos itens ao lado para adicionar nesta fase.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((cn) => {
                          const it = itemsByClass.get(cn);
                          if (!it) return null;
                          return (
                            <button
                              key={`${phase.key}-${cn}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhases((prev) => ({
                                  ...prev,
                                  [phase.key]: prev[phase.key].filter((x) => x !== cn),
                                }));
                              }}
                              title={`Remover ${it.name}`}
                              className="flex items-center gap-1.5 rounded-[4px] border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-[#f4efe6] hover:border-rose-500/70 cursor-pointer"
                            >
                              {it.image && (
                                <img src={it.image} alt="" className="h-5 w-5 rounded-[2px] object-cover" />
                              )}
                              <span>{it.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
              <span className="font-mono text-xs font-bold text-[#5ce1b6]">
                Custo total estimado: {totalCost.toLocaleString("pt-BR")} Almas
              </span>
              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setTitle("");
                      setPhases(EMPTY_PHASES);
                    }}
                    className="rounded-[4px] border border-neutral-700 px-3 py-2 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-[4px] bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Publicar Build"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Catálogo de itens para adicionar na fase ativa */}
        <div className="lg:col-span-5 rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 overflow-hidden shadow-xl">
          <div className="border-b border-neutral-800/90 p-3.5 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "weapon", "vitality", "spirit"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlotFilter(s)}
                  className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase cursor-pointer ${
                    slotFilter === s
                      ? "bg-amber-500 text-black"
                      : "border border-neutral-800 bg-neutral-900 text-neutral-300"
                  }`}
                >
                  {s === "all" ? "Todos" : s === "weapon" ? "Arma" : s === "vitality" ? "Vitalidade" : "Espírito"}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item..."
              className="w-full rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="p-3 grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[540px] overflow-y-auto lp-scroll">
            {filteredItems.map((it) => {
              const inPhase = phases[activePhase].includes(it.className);
              return (
                <button
                  key={it.className}
                  type="button"
                  onClick={() => toggleItemInPhase(it.className)}
                  title={`${it.name} (${it.cost})`}
                  className={`flex flex-col items-center gap-1 rounded-[4px] border p-1.5 transition-all cursor-pointer ${
                    inPhase
                      ? "border-amber-400 bg-amber-500/20"
                      : "border-neutral-800 bg-[#070908] hover:border-neutral-600"
                  }`}
                >
                  {it.image && (
                    <img src={it.image} alt={it.name} className="h-9 w-9 rounded-[3px] object-cover" />
                  )}
                  <span className="font-mono text-[9px] text-[#5ce1b6]">{it.cost}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GALERIA DE BUILDS DA COMUNIDADE */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
          <div>
            <h2 className="font-deadlock text-xl font-black uppercase tracking-wider text-[#f4efe6]">
              Builds da Comunidade ({visibleBuilds.length})
            </h2>
            <p className="text-xs text-neutral-400">
              Builds compartilhadas pelos jogadores do LockPro.
            </p>
          </div>

          <select
            value={communityHeroFilter}
            onChange={(e) =>
              setCommunityHeroFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="rounded-[4px] border border-neutral-700 bg-[#0a0d0c] px-3 py-1.5 text-xs font-semibold text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os heróis</option>
            {heroes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {loadingBuilds ? (
          <p className="text-xs text-neutral-400">Carregando builds...</p>
        ) : visibleBuilds.length === 0 ? (
          <div className="rounded-[5px] border border-neutral-800 bg-[#0a0d0c]/80 p-8 text-center text-xs text-neutral-500">
            Nenhuma build publicada ainda. Seja o primeiro a criar uma acima!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleBuilds.map((b) => {
              const hero = heroesById.get(b.heroId);
              return (
                <div
                  key={b.id}
                  className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {hero?.image && (
                        <img
                          src={hero.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-[4px] object-cover border border-neutral-700"
                        />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/builds/${b.id}`}
                          className="block truncate font-deadlock text-base font-black text-[#f4efe6] hover:text-amber-400 transition-colors"
                        >
                          {b.title}
                        </Link>
                        <p className="text-[11px] text-neutral-400">
                          {hero?.name ?? `Herói #${b.heroId}`} • por{" "}
                          {b.authorHandle ? (
                            <Link href={`/profile/${b.authorHandle}`} className="text-amber-400 hover:underline">
                              @{b.authorHandle}
                            </Link>
                          ) : (
                            b.author
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/builds/${b.id}`}
                        className="rounded-[4px] border border-neutral-700 px-2.5 py-1 text-[11px] font-bold text-neutral-200 hover:border-amber-500 hover:text-amber-400"
                      >
                        Abrir
                      </Link>
                      {b.canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          className="rounded-[4px] border border-rose-500/40 px-2 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}