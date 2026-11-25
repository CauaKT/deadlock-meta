"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties, type DragEvent } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { MakerHero } from "@/app/tiers";
import {
  createFeedPost,
  createTierList,
  createTierListComment,
  deleteTierList,
  deleteTierListComment,
  getCommunityTierLists,
  getCurrentClientUser,
  getTierListById,
  getTierListComments,
  subscribeToAuthChanges,
  toggleTierListLike,
  updateTierList,
} from "@/lib/backend/client";
import type {
  AuthUser,
  TierListComment,
  TierListItem,
  TierListStyle,
  TierQuadrantData,
} from "@/lib/backend/types";
import { exportTierListToPng } from "./exportTierListPng";
import TierAuthorBadge from "./TierAuthorBadge";
import TierQuadrantBoard, {
  DEFAULT_QUADRANT_DATA,
  MAX_QUADRANT_AXES,
  MIN_QUADRANT_AXES,
  buildLegacyLabelsFromAxes,
  getPolygonShapeName,
  getQuadrantAxes,
  remapHeroCoordOnAxisChange,
} from "./TierQuadrantBoard";

export interface CustomTier {
  id: string;
  label: string;
  color: string;
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

function createEmptyBoard(heroes: MakerHero[], targetTiers: CustomTier[]): Record<string, number[]> {
  const b: Record<string, number[]> = { POOL: heroes.map((h) => h.id) };
  targetTiers.forEach((t) => {
    b[t.id] = [];
  });
  return b;
}

function findDropTargetInZone(
  zoneEl: HTMLElement,
  clientX: number,
  clientY: number,
  excludeId: number | null,
): { id: number; position: "before" | "after" } | null {
  const cards = zoneEl.querySelectorAll<HTMLElement>("[data-chip-hero-id]");
  let best: { id: number; position: "before" | "after"; dist: number } | null = null;

  for (const card of cards) {
    const id = Number(card.dataset.chipHeroId);
    if (!Number.isInteger(id) || id <= 0 || id === excludeId) continue;
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top - 8 || clientY > rect.bottom + 8) continue;
    const distX =
      clientX < rect.left
        ? rect.left - clientX
        : clientX > rect.right
          ? clientX - rect.right
          : 0;
    if (distX > 18) continue;
    if (!best || distX < best.dist) {
      const position: "before" | "after" =
        clientX - rect.left >= rect.width / 2 ? "after" : "before";
      best = { id, position, dist: distX };
    }
  }

  return best ? { id: best.id, position: best.position } : null;
}

export default function TierMakerClient({
  heroes,
  metaTiers,
}: {
  heroes: MakerHero[];
  metaTiers: Record<string, number[]>;
}) {
  const { confirm, modal } = useConfirm();
  const pathname = usePathname();
  const tab: "builder" | "community" = pathname.startsWith("/tier-maker/comunidade") ? "community" : "builder";
  const [title, setTitle] = useState("Minha Tier List");
  const [description, setDescription] = useState("");
  const [boardStyle, setBoardStyle] = useState<TierListStyle>("classic");
  // Troca só a URL, sem remontar o editor: o quadro em montagem não se perde ao ver a Comunidade
  const setTab = useCallback(
    (next: "builder" | "community", styleOverride?: TierListStyle) => {
      const activeStyle = styleOverride ?? boardStyle;
      const builderUrl =
        activeStyle === "quadrant" ? "/tier-maker?modo=quadrante" : "/tier-maker";
      window.history.pushState(
        null,
        "",
        next === "community" ? "/tier-maker/comunidade" : builderUrl,
      );
    },
    [boardStyle],
  );
  const syncStyleUrl = useCallback((nextStyle: TierListStyle) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.pathname.startsWith("/tier-maker") || url.pathname.startsWith("/tier-maker/comunidade")) {
      return;
    }
    if (nextStyle === "quadrant") url.searchParams.set("modo", "quadrante");
    else url.searchParams.delete("modo");
    const search = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}`);
  }, []);
  const [tiers, setTiers] = useState<CustomTier[]>(DEFAULT_TIERS);
  const [board, setBoard] = useState<Record<string, number[]>>(() =>
    createEmptyBoard(heroes, DEFAULT_TIERS),
  );
  const [quadrant, setQuadrant] = useState<TierQuadrantData>(DEFAULT_QUADRANT_DATA);
  const [quadrantPool, setQuadrantPool] = useState<number[]>(() => heroes.map((h) => h.id));
  const [quadrantDragId, setQuadrantDragId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const authorAvatarUrl =
    currentUser?.profile?.avatar_url || currentUser?.suggestedAvatarUrl || null;
  const authorDisplay =
    currentUser?.profile?.username ||
    (currentUser?.suggestedUsername && !/^steam_\d+$/.test(currentUser.suggestedUsername)
      ? currentUser.suggestedUsername
      : null) ||
    currentUser?.profile?.handle ||
    "Jogador";
  const [publishedLists, setPublishedLists] = useState<TierListItem[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    needsLogin?: boolean;
    actionHref?: string;
    actionLabel?: string;
  } | null>(null);

  const [selected, setSelected] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: "before" | "after" } | null>(null);
  const updateDropTarget = useCallback(
    (next: { id: number; position: "before" | "after" } | null) => {
      setDropTarget((prev) => {
        if (prev?.id === next?.id && prev?.position === next?.position) return prev;
        return next;
      });
    },
    [],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLElement>(null);
  const [dynamicExpressions, setDynamicExpressions] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("lockpro_dynamic_expressions");
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return true;
  });

  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const toggleDynamicExpressions = (val: boolean) => {
    setDynamicExpressions(val);
    try {
      localStorage.setItem("lockpro_dynamic_expressions", String(val));
    } catch {}
  };

  const resetBuilder = useCallback(() => {
    setEditingId(null);
    setTitle("Minha Tier List");
    setDescription("");
    setBoardStyle("classic");
    setTiers(DEFAULT_TIERS);
    setBoard(createEmptyBoard(heroes, DEFAULT_TIERS));
    setQuadrant(DEFAULT_QUADRANT_DATA);
    setQuadrantPool(heroes.map((h) => h.id));
    setSelected(null);
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", "/tier-maker");
    }
  }, [heroes]);

  const applyListToBuilder = useCallback(
    (pub: TierListItem, asCopy = false) => {
      setEditingId(asCopy ? null : pub.id);
      setTitle(asCopy ? `Cópia de ${pub.title}`.slice(0, 80) : pub.title);
      setDescription(pub.description ?? "");
      if (pub.style === "quadrant" && pub.quadrant) {
        setBoardStyle("quadrant");
        const validItems = pub.quadrant.items.filter((it) => byId.has(it.heroId));
        const placed = new Set(validItems.map((it) => it.heroId));
        const axes = getQuadrantAxes(pub.quadrant);
        setQuadrant({
          ...buildLegacyLabelsFromAxes(axes),
          axes,
          items: validItems,
        });
        setQuadrantPool(heroes.map((h) => h.id).filter((id) => !placed.has(id)));
      } else {
        setBoardStyle("classic");
        const newTiers: CustomTier[] = pub.tiers.map((t, i) => ({
          id: `T${i + 1}`,
          label: t.label,
          color: t.color,
        }));
        setTiers(newTiers.length > 0 ? newTiers : DEFAULT_TIERS);

        const next: Record<string, number[]> = { POOL: [] };
        const used = new Set<number>();
        pub.tiers.forEach((t, i) => {
          const id = `T${i + 1}`;
          next[id] = t.heroes;
          t.heroes.forEach((hId) => used.add(hId));
        });
        next.POOL = heroes.map((h) => h.id).filter((id) => !used.has(id));
        setBoard(next);
        setQuadrantPool(heroes.map((h) => h.id));
      }
      setSelected(null);
      setFeedback(null);
      setTab("builder", pub.style === "quadrant" && pub.quadrant ? "quadrant" : "classic");
    },
    [byId, heroes, setTab],
  );

  const refreshCommunity = useCallback(async () => {
    setLoadingCommunity(true);
    const lists = await getCommunityTierLists();
    setPublishedLists(lists);
    setLoadingCommunity(false);
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const [user, lists] = await Promise.all([
        getCurrentClientUser(),
        getCommunityTierLists(),
      ]);
      if (!active) return;

      setCurrentUser(user);
      setPublishedLists(lists);
      setLoadingCommunity(false);

      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const editId = searchParams?.get("edit") ?? null;
      const duplicateId = searchParams?.get("duplicate") ?? null;
      const modoParam = searchParams?.get("modo") ?? null;

      if (!editId && !duplicateId && modoParam === "quadrante") {
        setBoardStyle("quadrant");
      }

      if (editId) {
        const res = await getTierListById(editId);
        if (!active) return;
        if (!res.ok) {
          setFeedback({ type: "error", text: res.message });
          window.history.replaceState(null, "", "/tier-maker");
        } else if (!res.data.canEdit) {
          setFeedback({
            type: "error",
            text: "Apenas o criador desta tier list pode abri-la no editor.",
            needsLogin: !user,
          });
          window.history.replaceState(null, "", "/tier-maker");
        } else {
          applyListToBuilder(res.data, false);
        }
      } else if (duplicateId) {
        const res = await getTierListById(duplicateId);
        if (!active) return;
        if (!res.ok) {
          setFeedback({ type: "error", text: res.message });
          window.history.replaceState(null, "", "/tier-maker");
        } else {
          applyListToBuilder(res.data, true);
        }
      }
    };

    void init();

    const unsubscribe = subscribeToAuthChanges((u) => {
      setCurrentUser(u);
      void refreshCommunity();
    });

    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [settingsOpen]);

  const moveHero = (
    heroId: number,
    targetTierId: string,
    refHeroId?: number,
    position: "before" | "after" = "before",
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

  const deleteTier = async (tierId: string) => {
    if (tiers.length <= 1) {
      setFeedback({ type: "error", text: "A tier list precisa ter pelo menos uma categoria." });
      return;
    }
    const tierLabel = tiers.find((t) => t.id === tierId)?.label.trim() || "este tier";
    const ok = await confirm({
      title: `Remover tier "${tierLabel}"?`,
      description: "Os heróis desta linha voltarão para a bandeja de seleção.",
      confirmLabel: "Remover",
      tone: "warning",
    });
    if (!ok) return;
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
    const META_KEYS = ["META", "A", "B", "C", "D", "F"];
    const allRanked: number[] = [];

    META_KEYS.forEach((key) => {
      (metaTiers[key] || []).forEach((id) => {
        if (byId.has(id) && !allRanked.includes(id)) {
          allRanked.push(id);
        }
      });
    });

    const next: Record<string, number[]> = { POOL: [] };
    const used = new Set<number>();

    const hasCanonicalTiers =
      tiers.length === 6 &&
      tiers.every((t) => META_KEYS.includes(t.label.trim().toUpperCase()));

    if (hasCanonicalTiers) {
      tiers.forEach((t) => {
        const key = t.label.trim().toUpperCase();
        const list = (metaTiers[key] || []).filter((id) => byId.has(id));
        list.forEach((id) => used.add(id));
        next[t.id] = list;
      });
    } else {
      const total = allRanked.length;
      const numTiers = Math.max(tiers.length, 1);

      tiers.forEach((t, i) => {
        const start = Math.round((i * total) / numTiers);
        const end = Math.round(((i + 1) * total) / numTiers);
        const list = allRanked.slice(start, end);
        list.forEach((id) => used.add(id));
        next[t.id] = list;
      });
    }

    next.POOL = heroes.map((h) => h.id).filter((id) => !used.has(id));
    setBoard(next);
  };

  const placeQuadrantHero = useCallback((heroId: number, x: number, y: number) => {
    setQuadrant((prev) => ({
      ...prev,
      items: [...prev.items.filter((it) => it.heroId !== heroId), { heroId, x, y }],
    }));
    setQuadrantPool((prev) => prev.filter((id) => id !== heroId));
  }, []);

  const removeQuadrantHero = useCallback(
    (heroId: number, refHeroId?: number, position: "before" | "after" = "before") => {
      setQuadrant((prev) => ({
        ...prev,
        items: prev.items.filter((it) => it.heroId !== heroId),
      }));
      setQuadrantPool((prev) => {
        const next = prev.filter((id) => id !== heroId);
        if (refHeroId !== undefined) {
          const at = next.indexOf(refHeroId);
          if (at >= 0) {
            const insertIdx = position === "after" ? at + 1 : at;
            next.splice(insertIdx, 0, heroId);
            return next;
          }
        }
        next.push(heroId);
        return next;
      });
      setSelected(null);
    },
    [],
  );

  const clearBoard = async () => {
    const ok = await confirm({
      title: boardStyle === "quadrant" ? "Limpar gráfico?" : "Limpar tabuleiro?",
      description:
        boardStyle === "quadrant"
          ? "Todos os heróis posicionados no gráfico voltarão para a bandeja."
          : "Todos os heróis posicionados nos tiers voltarão para a bandeja.",
      confirmLabel: "Limpar",
      tone: "warning",
    });
    if (!ok) return;
    if (boardStyle === "quadrant") {
      setQuadrant((prev) => ({ ...prev, items: [] }));
      setQuadrantPool(heroes.map((h) => h.id));
      setSelected(null);
    } else {
      setBoard(createEmptyBoard(heroes, tiers));
    }
  };

  const publishCurrent = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFeedback({ type: "error", text: "Insira um título para sua tier list." });
      return;
    }

    if (boardStyle === "classic" && tiers.some((t) => !t.label.trim())) {
      setFeedback({ type: "error", text: "Todas as categorias precisam ter um nome." });
      return;
    }

    const cleanQuadrantAxes = getQuadrantAxes(quadrant).map((a) => a.trim());
    if (
      boardStyle === "quadrant" &&
      (cleanQuadrantAxes.length < MIN_QUADRANT_AXES || cleanQuadrantAxes.some((a) => !a))
    ) {
      setFeedback({ type: "error", text: "Preencha todos os rótulos das pontas do gráfico." });
      return;
    }

    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para publicar sua tier list na comunidade.",
        needsLogin: true,
      });
      return;
    }

    setPublishing(true);
    setFeedback(null);

    const cleanDesc = description.trim() || null;

    const payload =
      boardStyle === "quadrant"
        ? {
            title: cleanTitle,
            description: cleanDesc,
            style: "quadrant" as const,
            tiers: [],
            quadrant: {
              ...buildLegacyLabelsFromAxes(cleanQuadrantAxes),
              axes: cleanQuadrantAxes,
              items: quadrant.items,
            },
          }
        : {
            title: cleanTitle,
            description: cleanDesc,
            style: "classic" as const,
            tiers: tiers.map((t) => ({
              label: t.label.trim(),
              color: t.color,
              heroes: board[t.id] || [],
            })),
          };

    const res = editingId
      ? await updateTierList(editingId, payload)
      : await createTierList(payload);

    setPublishing(false);

    if (!res.ok) {
      setFeedback({
        type: "error",
        text: res.message,
        needsLogin: res.status === 401,
      });
      return;
    }

    setPublishedLists((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === res.data.id ? res.data : item));
      }
      return [res.data, ...prev];
    });

    const wasEditing = Boolean(editingId);
    resetBuilder();
    setFeedback({
      type: "success",
      text: wasEditing ? "Tier list atualizada com sucesso!" : "Tier list publicada na comunidade!",
    });
    setTab("community");
  };

  const handleExportCurrentPng = async () => {
    setExportingId("builder");
    setFeedback(null);
    try {
      if (boardStyle === "quadrant") {
        await exportTierListToPng({
          title: title.trim() || "Minha Tier List",
          author: (currentUser ? authorDisplay : "") || "Comunidade",
          dateLabel: new Date().toLocaleDateString("pt-BR"),
          style: "quadrant",
          tiers: [],
          quadrant: {
            topLabel: quadrant.topLabel,
            bottomLabel: quadrant.bottomLabel,
            leftLabel: quadrant.leftLabel,
            rightLabel: quadrant.rightLabel,
            axes: getQuadrantAxes(quadrant),
            heroes: quadrant.items
              .map((it) => {
                const h = byId.get(it.heroId);
                if (!h) return null;
                return {
                  id: h.id,
                  name: h.name,
                  image: h.icon || h.image,
                  rgb: h.rgb,
                  x: it.x,
                  y: it.y,
                };
              })
              .filter((h): h is NonNullable<typeof h> => Boolean(h)),
          },
        });
      } else {
        await exportTierListToPng({
          title: title.trim() || "Minha Tier List",
          author: (currentUser ? authorDisplay : "") || "Comunidade",
          dateLabel: new Date().toLocaleDateString("pt-BR"),
          style: "classic",
          tiers: tiers.map((t, idx) => {
            const isTopTier = dynamicExpressions && idx === 0;
            const isBottomTier = dynamicExpressions && idx === tiers.length - 1;
            return {
              label: t.label,
              color: t.color,
              heroes: (board[t.id] || [])
                .map((hId) => byId.get(hId))
                .filter((h): h is MakerHero => Boolean(h))
                .map((h) => ({
                  id: h.id,
                  name: h.name,
                  image: isTopTier
                    ? h.gloatImage || h.image
                    : isBottomTier
                      ? h.critImage || h.image
                      : h.image,
                })),
            };
          }),
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Não foi possível gerar o arquivo PNG." });
    } finally {
      setExportingId(null);
    }
  };

  const handleExportItemPng = async (item: TierListItem) => {
    setExportingId(item.id);
    setFeedback(null);
    try {
      if (item.style === "quadrant" && item.quadrant) {
        await exportTierListToPng({
          title: item.title,
          author: item.author,
          dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
          style: "quadrant",
          tiers: [],
          quadrant: {
            topLabel: item.quadrant.topLabel,
            bottomLabel: item.quadrant.bottomLabel,
            leftLabel: item.quadrant.leftLabel,
            rightLabel: item.quadrant.rightLabel,
            axes: getQuadrantAxes(item.quadrant),
            heroes: item.quadrant.items
              .map((it) => {
                const h = byId.get(it.heroId);
                if (!h) return null;
                return {
                  id: h.id,
                  name: h.name,
                  image: h.icon || h.image,
                  rgb: h.rgb,
                  x: it.x,
                  y: it.y,
                };
              })
              .filter((h): h is NonNullable<typeof h> => Boolean(h)),
          },
        });
      } else {
        await exportTierListToPng({
          title: item.title,
          author: item.author,
          dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
          style: "classic",
          tiers: item.tiers.map((t) => ({
            label: t.label,
            color: t.color,
            heroes: (t.heroes || [])
              .map((hId) => byId.get(hId))
              .filter((h): h is MakerHero => Boolean(h))
              .map((h) => ({ id: h.id, name: h.name, image: h.image })),
          })),
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Não foi possível gerar o arquivo PNG." });
    } finally {
      setExportingId(null);
    }
  };

  type CommunitySort = "relevance" | "likes" | "comments" | "recent" | "views";
  type CommunityStyleFilter = "all" | "classic" | "quadrant";
  type CommunityScopeFilter = "all" | "mine" | "liked";

  const [communityQuery, setCommunityQuery] = useState("");
  const [communitySort, setCommunitySort] = useState<CommunitySort>("relevance");
  const [communityStyleFilter, setCommunityStyleFilter] = useState<CommunityStyleFilter>("all");
  const [communityScopeFilter, setCommunityScopeFilter] = useState<CommunityScopeFilter>("all");
  const [communityHeroId, setCommunityHeroId] = useState<number | null>(null);
  const [communityTopTierOnly, setCommunityTopTierOnly] = useState(false);

  const [likeBusyIds, setLikeBusyIds] = useState<Record<string, boolean>>({});
  const [openCommentsIds, setOpenCommentsIds] = useState<Record<string, boolean>>({});
  const [fullCommentsMap, setFullCommentsMap] = useState<Record<string, TierListComment[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyIds, setCommentBusyIds] = useState<Record<string, boolean>>({});
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [copiedShareState, setCopiedShareState] = useState<string | null>(null);
  const [feedModalItem, setFeedModalItem] = useState<TierListItem | null>(null);
  const [feedPostContent, setFeedPostContent] = useState("");
  const [postingToFeed, setPostingToFeed] = useState(false);
  const [feedModalError, setFeedModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!openShareId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-share-menu]")) setOpenShareId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenShareId(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openShareId]);

  useEffect(() => {
    if (!feedModalItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !postingToFeed) setFeedModalItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedModalItem, postingToFeed]);

  const topRelevanceId = useMemo(() => {
    let bestId: string | null = null;
    let bestScore = -1;

    for (const item of publishedLists) {
      const likes = item.likesCount ?? 0;
      const comments = item.commentsCount ?? 0;
      const score = item.relevanceScore ?? likes * 4 + comments * 6;
      if (likes + comments > 0 && score > bestScore) {
        bestScore = score;
        bestId = item.id;
      }
    }

    return bestId;
  }, [publishedLists]);

  const filteredPublishedLists = useMemo(() => {
    const q = communityQuery.trim().toLowerCase();

    const list = publishedLists.filter((l) => {
      if (communityStyleFilter === "classic" && l.style === "quadrant") return false;
      if (communityStyleFilter === "quadrant" && l.style !== "quadrant") return false;

      if (communityScopeFilter === "mine" && (!currentUser || l.userId !== currentUser.id)) {
        return false;
      }
      if (communityScopeFilter === "liked" && !l.likedByMe) {
        return false;
      }

      if (communityHeroId !== null) {
        if (communityTopTierOnly) {
          if (l.style === "quadrant") return false;
          const topHeroes = l.tiers[0]?.heroes || [];
          if (!topHeroes.includes(communityHeroId)) return false;
        } else if (l.style === "quadrant" && l.quadrant) {
          if (!l.quadrant.items.some((it) => it.heroId === communityHeroId)) return false;
        } else if (!l.tiers.some((t) => (t.heroes || []).includes(communityHeroId))) {
          return false;
        }
      }

      if (q) {
        const matchesText =
          l.title.toLowerCase().includes(q) ||
          (l.description?.toLowerCase().includes(q) ?? false) ||
          l.author.toLowerCase().includes(q) ||
          (l.authorHandle?.toLowerCase().includes(q) ?? false);
        if (!matchesText) return false;
      }

      return true;
    });

    const sorted = [...list];
    if (communitySort === "likes") {
      sorted.sort(
        (a, b) =>
          (b.likesCount ?? 0) - (a.likesCount ?? 0) ||
          (b.commentsCount ?? 0) - (a.commentsCount ?? 0) ||
          b.createdAt.localeCompare(a.createdAt),
      );
    } else if (communitySort === "comments") {
      sorted.sort(
        (a, b) =>
          (b.commentsCount ?? 0) - (a.commentsCount ?? 0) ||
          (b.likesCount ?? 0) - (a.likesCount ?? 0) ||
          b.createdAt.localeCompare(a.createdAt),
      );
    } else if (communitySort === "views") {
      sorted.sort(
        (a, b) =>
          (b.viewsCount ?? 0) - (a.viewsCount ?? 0) ||
          (b.likesCount ?? 0) - (a.likesCount ?? 0) ||
          b.createdAt.localeCompare(a.createdAt),
      );
    } else if (communitySort === "recent") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      sorted.sort(
        (a, b) =>
          (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
          (b.likesCount ?? 0) - (a.likesCount ?? 0) ||
          b.createdAt.localeCompare(a.createdAt),
      );
    }

    return sorted;
  }, [
    publishedLists,
    communityQuery,
    communityStyleFilter,
    communityScopeFilter,
    communityHeroId,
    communityTopTierOnly,
    communitySort,
    currentUser,
  ]);

  const hasActiveCommunityFilters =
    Boolean(communityQuery.trim()) ||
    communityStyleFilter !== "all" ||
    communityScopeFilter !== "all" ||
    communityHeroId !== null;

  const resetCommunityFilters = () => {
    setCommunityQuery("");
    setCommunityStyleFilter("all");
    setCommunityScopeFilter("all");
    setCommunityHeroId(null);
    setCommunityTopTierOnly(false);
  };

  const handleToggleLike = async (item: TierListItem) => {
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para curtir tier lists da comunidade.",
        needsLogin: true,
      });
      return;
    }
    if (likeBusyIds[item.id]) return;

    const prevLiked = Boolean(item.likedByMe);
    const prevCount = item.likesCount ?? 0;

    setLikeBusyIds((m) => ({ ...m, [item.id]: true }));
    setPublishedLists((prev) =>
      prev.map((l) =>
        l.id === item.id
          ? {
              ...l,
              likedByMe: !prevLiked,
              likesCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
            }
          : l,
      ),
    );

    const res = await toggleTierListLike(item.id);
    setLikeBusyIds((m) => ({ ...m, [item.id]: false }));

    if (!res.ok) {
      setPublishedLists((prev) =>
        prev.map((l) =>
          l.id === item.id ? { ...l, likedByMe: prevLiked, likesCount: prevCount } : l,
        ),
      );
      setFeedback({
        type: "error",
        text: res.message ?? "Não foi possível curtir.",
        needsLogin: res.status === 401,
      });
      return;
    }

    setPublishedLists((prev) =>
      prev.map((l) =>
        l.id === item.id
          ? { ...l, likedByMe: res.liked, likesCount: res.likesCount }
          : l,
      ),
    );
  };

  const handleToggleComments = async (item: TierListItem) => {
    const nextOpen = !openCommentsIds[item.id];
    setOpenCommentsIds((m) => ({ ...m, [item.id]: nextOpen }));
    if (nextOpen && !fullCommentsMap[item.id] && !loadingCommentsMap[item.id]) {
      setLoadingCommentsMap((m) => ({ ...m, [item.id]: true }));
      const comments = await getTierListComments(item.id);
      setFullCommentsMap((m) => ({ ...m, [item.id]: comments }));
      setLoadingCommentsMap((m) => ({ ...m, [item.id]: false }));
    }
  };

  const handleAddTierComment = async (item: TierListItem, e: React.FormEvent) => {
    e.preventDefault();
    const draft = (commentDrafts[item.id] ?? "").trim();
    if (!draft || commentBusyIds[item.id]) return;

    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para comentar nas tier lists.",
        needsLogin: true,
      });
      return;
    }

    setCommentBusyIds((m) => ({ ...m, [item.id]: true }));
    const { comment, status, error } = await createTierListComment(item.id, draft);
    setCommentBusyIds((m) => ({ ...m, [item.id]: false }));

    if (error || !comment) {
      setFeedback({
        type: "error",
        text: error ?? "Não foi possível comentar.",
        needsLogin: status === 401,
      });
      return;
    }

    setCommentDrafts((m) => ({ ...m, [item.id]: "" }));
    setFullCommentsMap((m) => ({
      ...m,
      [item.id]: [...(m[item.id] ?? item.recentComments ?? []), comment],
    }));
    setPublishedLists((prev) =>
      prev.map((l) =>
        l.id === item.id
          ? {
              ...l,
              commentsCount: (l.commentsCount ?? 0) + 1,
              recentComments: [...(l.recentComments ?? []), comment].slice(-3),
            }
          : l,
      ),
    );
  };

  const handleDeleteTierComment = async (tierListId: string, commentId: string) => {
    const ok = await confirm({
      title: "Excluir comentário?",
      description: "Este comentário será removido permanentemente.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;

    const { ok: deleted, error } = await deleteTierListComment(commentId);
    if (!deleted) {
      setFeedback({ type: "error", text: error ?? "Não foi possível excluir o comentário." });
      return;
    }

    setFullCommentsMap((m) => ({
      ...m,
      [tierListId]: (m[tierListId] ?? []).filter((c) => c.id !== commentId),
    }));
    setPublishedLists((prev) =>
      prev.map((l) =>
        l.id === tierListId
          ? {
              ...l,
              commentsCount: Math.max(0, (l.commentsCount ?? 0) - 1),
              recentComments: (l.recentComments ?? []).filter((c) => c.id !== commentId),
            }
          : l,
      ),
    );
  };

  const getPublicShareUrl = (id: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/tier-maker/comunidade/${id}`
      : `/tier-maker/comunidade/${id}`;

  const handleCopyShareLink = async (item: TierListItem, withSummary = false) => {
    const url = getPublicShareUrl(item.id);
    const payload = withSummary
      ? `Tier List de Deadlock: "${item.title}" por ${item.author}\n${url}`
      : url;
    try {
      await navigator.clipboard.writeText(payload);
      const token = `${item.id}:${withSummary ? "summary" : "link"}`;
      setCopiedShareState(token);
      setTimeout(() => setCopiedShareState((curr) => (curr === token ? null : curr)), 2000);
    } catch {
      setFeedback({ type: "error", text: "Não foi possível copiar para a área de transferência." });
    }
  };

  const handleNativeShare = async (item: TierListItem) => {
    const url = getPublicShareUrl(item.id);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${item.title} • LockPro`,
          text: `Confira esta tier list de Deadlock por ${item.author}`,
          url,
        });
        setOpenShareId(null);
        return;
      } catch {}
    }
    await handleCopyShareLink(item, false);
  };

  const openFeedShareModal = (item: TierListItem) => {
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para postar tier lists no Feed.",
        needsLogin: true,
      });
      return;
    }
    setFeedModalError(null);
    setFeedPostContent(
      item.userId === currentUser.id
        ? `Acabei de publicar minha tier list "${item.title}"! O que acharam?`
        : `Olhem essa tier list "${item.title}" de ${item.author}:`,
    );
    setFeedModalItem(item);
  };

  const submitFeedShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedModalItem || !feedPostContent.trim() || postingToFeed) return;
    setPostingToFeed(true);
    setFeedModalError(null);
    const { post, error } = await createFeedPost({
      content: feedPostContent.trim(),
      tierListId: feedModalItem.id,
    });
    setPostingToFeed(false);
    if (error || !post) {
      setFeedModalError(error ?? "Não foi possível publicar no Feed.");
      return;
    }
    const sharedTitle = feedModalItem.title;
    setFeedModalItem(null);
    setFeedPostContent("");
    setFeedback({
      type: "success",
      text: `Tier list "${sharedTitle}" publicada no Feed da Comunidade!`,
      actionHref: "/feed",
      actionLabel: "Ver no Feed",
    });
  };

  const deletePublished = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = publishedLists.find((l) => l.id === id);
    const ok = await confirm({
      title: "Excluir tier list?",
      description: target
        ? `A tier list "${target.title}" será removida permanentemente da galeria.`
        : "Esta tier list será removida permanentemente da galeria.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;

    const res = await deleteTierList(id);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }

    setPublishedLists((prev) => prev.filter((l) => l.id !== id));
    if (editingId === id) {
      resetBuilder();
    }
    setFeedback({ type: "success", text: "Tier list removida." });
  };

  const loadPublished = (pub: TierListItem) => {
    if (!pub.canEdit) {
      setFeedback({ type: "error", text: "Apenas o criador pode abrir esta tier list no editor." });
      return;
    }
    applyListToBuilder(pub, false);
  };

  const poolHeroIds = boardStyle === "quadrant" ? quadrantPool : board.POOL || [];

  const renderHeroChip = (id: number, currentTierId: string) => {
    const hero = byId.get(id);
    if (!hero) return null;

    const isTopTier =
      boardStyle === "classic" && dynamicExpressions && currentTierId === tiers[0]?.id;
    const isBottomTier =
      boardStyle === "classic" && dynamicExpressions && currentTierId === tiers[tiers.length - 1]?.id;
    const displayImage = isTopTier
      ? hero.gloatImage || hero.image
      : isBottomTier
        ? hero.critImage || hero.image
        : hero.image;

    const isSelected = selected === id;
    const activeDragId = dragId ?? quadrantDragId;
    const isTarget =
      dropTarget?.id === id && activeDragId !== null && activeDragId !== id;
    const isTargetBefore = isTarget && dropTarget?.position === "before";
    const isTargetAfter = isTarget && dropTarget?.position === "after";

    return (
      <div
        key={id}
        data-chip-hero-id={id}
        data-pool-hero-id={currentTierId === "POOL" ? id : undefined}
        draggable
        style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
        onClick={(e) => {
          e.stopPropagation();
          if (boardStyle === "quadrant") {
            if (selected !== null && selected !== id && currentTierId === "POOL") {
              removeQuadrantHero(selected, id, "before");
            } else {
              setSelected(isSelected ? null : id);
            }
            return;
          }
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
              e.currentTarget.offsetHeight / 2,
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
            if (boardStyle === "quadrant" && currentTierId === "POOL") {
              removeQuadrantHero(dragId, id, targetPos);
            } else {
              moveHero(dragId, currentTierId, id, targetPos);
            }
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
        {isTargetBefore && (
          <div
            aria-hidden
            className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-14 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.95)] z-30"
          />
        )}

        <div className="hero-card-art pointer-events-none relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-xl">
          <img
            src={displayImage}
            alt={hero.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
        </div>

        <div className="hero-card-name pointer-events-none w-full overflow-hidden rounded-b-xl px-1.5 py-1.5 text-center transition-all duration-150">
          <p className="truncate text-[10.5px] font-extrabold leading-tight text-white transition-colors group-hover:text-amber-300 [paint-order:stroke_fill] [-webkit-text-stroke:2px_rgba(0,0,0,0.95)] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_6px_rgba(0,0,0,0.9)]">
            {hero.name}
          </p>
        </div>

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Deadlock <span className="text-amber-500">TierMaker</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
            Personalize nomes, cores e ordens. Publique sua tier list na comunidade ou compartilhe o link.
          </p>
        </div>

        {tab === "builder" && (
          <div
            role="radiogroup"
            aria-label="Estilo da Tier List"
            className="relative inline-grid w-fit shrink-0 grid-cols-2 gap-1 self-start sm:self-auto rounded-lg border border-neutral-800 bg-neutral-950/85 p-1 shadow-lg backdrop-blur-sm"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute left-1 top-1 bottom-1 w-[calc(50%-6px)] rounded-md bg-amber-500 shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                boardStyle === "quadrant" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              role="radio"
              aria-checked={boardStyle === "classic"}
              onClick={() => {
                setBoardStyle("classic");
                setSelected(null);
                syncStyleUrl("classic");
              }}
              className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-colors duration-200 ${
                boardStyle === "classic"
                  ? "text-black"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
              <span>Clássica</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={boardStyle === "quadrant"}
              onClick={() => {
                setBoardStyle("quadrant");
                setSelected(null);
                setSettingsOpen(false);
                syncStyleUrl("quadrant");
              }}
              className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-colors duration-200 ${
                boardStyle === "quadrant"
                  ? "text-black"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
              <span>Quadrante 2D</span>
            </button>
          </div>
        )}
      </header>

      {feedback && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <div className="flex flex-wrap items-center gap-2">
            {feedback.actionHref && feedback.actionLabel && (
              <Link
                href={feedback.actionHref}
                className="rounded-lg border border-emerald-400/60 bg-emerald-500 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
              >
                {feedback.actionLabel}
              </Link>
            )}
            {feedback.needsLogin && (
              <Link
                href={`/login?next=${encodeURIComponent(
                  boardStyle === "quadrant" ? "/tier-maker?modo=quadrante" : "/tier-maker",
                )}`}
                className="rounded-lg border border-amber-500 bg-amber-500 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
              >
                Fazer Login
              </Link>
            )}
          </div>
        </div>
      )}

      {tab === "builder" && (
        <div className="space-y-6">
          {editingId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs">
              <span className="font-semibold text-amber-200">
                Editando tier list publicada
              </span>
              <button
                type="button"
                onClick={() => resetBuilder()}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-300 hover:border-amber-400 hover:text-white transition-colors"
              >
                Cancelar Edição
              </button>
            </div>
          )}

          {/* Cabeçalho do Editor */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-2 flex-1 max-w-xl">
              <input
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da sua Tier List"
                className="font-deadlock w-full border-b border-neutral-700 bg-transparent text-3xl font-black text-[#f4efe6] outline-none focus:border-amber-500"
              />
              <input
                value={description}
                maxLength={280}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição ou critérios do ranking (opcional)"
                className="w-full border-b border-neutral-800/90 bg-transparent pb-1 text-xs text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-amber-500/70"
              />
              {currentUser ? (
                <div className="pt-0.5">
                  <TierAuthorBadge
                    name={authorDisplay}
                    avatarUrl={authorAvatarUrl}
                    size="sm"
                    clickable={false}
                    showHandle={false}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-neutral-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-neutral-700 bg-neutral-900/70 text-neutral-500">
                    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </span>
                  <span className="font-semibold">Entre na conta para publicar com seu perfil</span>
                  <Link
                    href={`/login?next=${encodeURIComponent(
                      boardStyle === "quadrant" ? "/tier-maker?modo=quadrante" : "/tier-maker",
                    )}`}
                    className="font-bold text-amber-400 hover:underline"
                  >
                    Entrar
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Configurações da Prancha (Engrenagem) */}
              {boardStyle === "classic" && (
                <div ref={settingsRef} className="relative">
                  <button
                    type="button"
                    title="Configurações da prancha"
                    aria-label="Configurações da prancha"
                    aria-expanded={settingsOpen}
                    onClick={() => setSettingsOpen((prev) => !prev)}
                    className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[5px] border shadow transition-all duration-150 hover:scale-105 active:scale-95 ${
                      settingsOpen
                        ? "border-neutral-500 bg-neutral-800 text-[#f4efe6]"
                        : "border-neutral-700/80 bg-neutral-900/90 text-neutral-400 hover:border-neutral-500 hover:text-white"
                    }`}
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>

                  {settingsOpen && (
                    <div
                      role="dialog"
                      aria-label="Configurações da prancha"
                      className="absolute left-0 top-full z-40 mt-2 w-76 rounded-xl border border-neutral-800 bg-neutral-950/95 p-3.5 shadow-2xl backdrop-blur-md space-y-3"
                    >
                      <p className="font-deadlock border-b border-neutral-800 pb-2 text-xs font-black uppercase tracking-wider text-neutral-400">
                        Configurações da Prancha
                      </p>

                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={dynamicExpressions}
                          onChange={(e) => toggleDynamicExpressions(e.target.checked)}
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-amber-500"
                        />
                        <div className="space-y-0.5">
                          <span className="font-deadlock block text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                            Expressões Dinâmicas
                          </span>
                          <span className="block text-[11px] font-medium leading-tight text-neutral-400">
                            Exibir ícones alternativos de gloat (vitória) no primeiro tier e de dano/crítico no último tier.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {boardStyle === "classic" && (
                <button
                  type="button"
                  onClick={fillWithMeta}
                  className="rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 shadow transition-all duration-150 hover:border-amber-500/70 hover:bg-neutral-800 hover:text-[#f4efe6] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Preencher com Meta
                </button>
              )}

              {/* Limpar */}
              <button
                type="button"
                onClick={() => void clearBoard()}
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

              {/* Exportar PNG */}
              <button
                type="button"
                disabled={exportingId === "builder"}
                onClick={handleExportCurrentPng}
                className="inline-flex items-center gap-1.5 rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-amber-400 shadow transition-all duration-150 hover:border-amber-400 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
                </svg>
                <span>{exportingId === "builder" ? "Gerando..." : "Exportar PNG"}</span>
              </button>

              {/* Publicar / Salvar Alterações */}
              <button
                type="button"
                disabled={publishing}
                onClick={publishCurrent}
                className="group inline-flex items-center gap-2 rounded-[5px] border border-emerald-400/80 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_12px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(16,185,129,0.55)] active:scale-[0.98] disabled:opacity-60"
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
                <span>
                  {publishing
                    ? "Salvando..."
                    : editingId
                      ? "Salvar Alterações"
                      : "Publicar no Site"}
                </span>
              </button>
            </div>
          </div>

          {/* Prancha do Editor */}
          {boardStyle === "quadrant" ? (
            <TierQuadrantBoard
              mode="editor"
              quadrant={quadrant}
              byId={byId}
              poolRef={poolRef}
              selectedHeroId={selected}
              dragHeroId={dragId}
              onSelectHero={setSelected}
              onPlaceHero={placeQuadrantHero}
              onRemoveHero={removeQuadrantHero}
              onChangeAxisLabel={(index, value) =>
                setQuadrant((prev) => {
                  const nextAxes = [...getQuadrantAxes(prev)];
                  nextAxes[index] = value;
                  return {
                    ...prev,
                    ...buildLegacyLabelsFromAxes(nextAxes),
                    axes: nextAxes,
                  };
                })
              }
              onAddAxis={(afterIndex) =>
                setQuadrant((prev) => {
                  const axes = getQuadrantAxes(prev);
                  if (axes.length >= MAX_QUADRANT_AXES) return prev;
                  const resolvedAfter =
                    typeof afterIndex === "number" ? afterIndex : axes.length - 1;
                  const nextAxes = [...axes];
                  nextAxes.splice(resolvedAfter + 1, 0, `Eixo ${axes.length + 1}`);
                  return {
                    ...prev,
                    ...buildLegacyLabelsFromAxes(nextAxes),
                    axes: nextAxes,
                    items: prev.items.map((it) => ({
                      ...it,
                      ...remapHeroCoordOnAxisChange(it.x, it.y, axes.length, nextAxes.length, {
                        type: "add",
                        afterIndex: resolvedAfter,
                      }),
                    })),
                  };
                })
              }
              onRemoveAxis={(index) =>
                setQuadrant((prev) => {
                  const axes = getQuadrantAxes(prev);
                  if (axes.length <= MIN_QUADRANT_AXES) return prev;
                  const nextAxes = axes.filter((_, i) => i !== index);
                  return {
                    ...prev,
                    ...buildLegacyLabelsFromAxes(nextAxes),
                    axes: nextAxes,
                    items: prev.items.map((it) => ({
                      ...it,
                      ...remapHeroCoordOnAxisChange(it.x, it.y, axes.length, nextAxes.length, {
                        type: "remove",
                        index,
                      }),
                    })),
                  };
                })
              }
              onDragOverPoolChange={(over) => setDragOverZone(over ? "POOL" : null)}
              onPoolDropHover={setDropTarget}
              onQuadrantDragChange={setQuadrantDragId}
              onDragEnd={() => setDragId(null)}
            />
          ) : (
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
                  <div
                    style={{ backgroundColor: tier.color }}
                    className={`relative flex w-24 sm:w-36 md:w-40 shrink-0 flex-col items-center justify-center p-2 pb-7 text-center select-none ${
                      isFirst ? "rounded-tl-2xl" : ""
                    } ${isLast ? "rounded-bl-2xl" : ""}`}
                  >
                    <textarea
                      rows={1}
                      maxLength={35}
                      value={tier.label}
                      onChange={(e) => {
                        const lines = e.target.value.split("\n");
                        if (lines.length > 3) return;
                        updateTierLabel(tier.id, e.target.value);
                      }}
                      className={`font-deadlock w-full bg-transparent text-center font-black uppercase text-black outline-none resize-none leading-tight [overflow-wrap:anywhere] px-1 [field-sizing:content] ${
                        tier.label.length > 14
                          ? "text-[11px] sm:text-xs"
                          : tier.label.length > 8
                            ? "text-xs sm:text-sm"
                            : tier.label.length > 4
                              ? "text-sm sm:text-base"
                              : "text-base sm:text-lg md:text-xl"
                      }`}
                    />

                    <label
                      title="Alterar cor deste tier"
                      className="group/brush absolute bottom-1.5 left-1.5 flex h-6 w-6 cursor-pointer items-center justify-center -skew-x-6 rounded-[3px] border border-black/50 bg-[#0d1210]/85 text-[#f4efe6] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:border-amber-400/80 hover:bg-black hover:text-amber-400 hover:scale-110 active:scale-95"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        className="h-3.5 w-3.5 transition-transform group-hover/brush:rotate-12"
                        fill="currentColor"
                      >
                        <path d="M14.85 1.15a1.5 1.5 0 0 0-2.12 0L7.5 6.38l2.12 2.12 5.23-5.23a1.5 1.5 0 0 0 0-2.12z" />
                        <path d="M6.8 7.2 2.3 11.7c-.6.6-.9 1.4-1.1 2.2-.1.5.3.9.8.8.8-.2 1.6-.5 2.2-1.1l4.5-4.5-1.9-1.9z" />
                      </svg>
                      <input
                        type="color"
                        value={tier.color}
                        onChange={(e) => updateTierColor(tier.id, e.target.value)}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div
                    onClick={() => selected !== null && moveHero(selected, tier.id)}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragId !== null) {
                        if (dragOverZone !== tier.id) setDragOverZone(tier.id);
                        updateDropTarget(
                          findDropTargetInZone(e.currentTarget, e.clientX, e.clientY, dragId),
                        );
                      }
                    }}
                    onDragLeave={(e: DragEvent) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setDragOverZone(null);
                        setDropTarget(null);
                      }
                    }}
                    onDrop={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      const target =
                        dragId !== null
                          ? findDropTargetInZone(e.currentTarget, e.clientX, e.clientY, dragId)
                          : null;
                      setDragOverZone(null);
                      setDropTarget(null);
                      if (dragId !== null) {
                        moveHero(dragId, tier.id, target?.id, target?.position);
                      }
                      setDragId(null);
                    }}
                    className={`flex flex-1 flex-wrap content-center items-center gap-2 p-3 transition-colors cursor-pointer ${
                      dragOverZone === tier.id ? "bg-amber-500/15 ring-2 ring-inset ring-amber-500/40" : "bg-neutral-950/75"
                    }`}
                  >
                    {list.map((id) => renderHeroChip(id, tier.id))}
                  </div>

                  <div
                    className={`flex flex-col items-center justify-center gap-1 px-2 shrink-0 border-l border-neutral-800/80 bg-neutral-950/90 select-none ${
                      isFirst ? "rounded-tr-2xl" : ""
                    } ${isLast ? "rounded-br-2xl" : ""}`}
                  >
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

                    <button
                      type="button"
                      title="Remover este tier (heróis voltam para a bandeja)"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteTier(tier.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-rose-950/60 hover:text-rose-400 transition-colors"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                      </svg>
                    </button>

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
          )}

          {/* Bandeja de Heróis Disponíveis */}
          <section
            ref={poolRef}
            onClick={() => {
              if (selected === null) return;
              if (boardStyle === "quadrant") removeQuadrantHero(selected);
              else moveHero(selected, "POOL");
            }}
            onDragOver={(e: DragEvent<HTMLElement>) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragId !== null) {
                if (dragOverZone !== "POOL") setDragOverZone("POOL");
                updateDropTarget(
                  findDropTargetInZone(e.currentTarget, e.clientX, e.clientY, dragId),
                );
              }
            }}
            onDragLeave={(e: DragEvent) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragOverZone(null);
                setDropTarget(null);
              }
            }}
            onDrop={(e: DragEvent<HTMLElement>) => {
              e.preventDefault();
              const target =
                dragId !== null
                  ? findDropTargetInZone(e.currentTarget, e.clientX, e.clientY, dragId)
                  : null;
              setDragOverZone(null);
              setDropTarget(null);
              if (dragId !== null) {
                if (boardStyle === "quadrant") {
                  removeQuadrantHero(dragId, target?.id, target?.position);
                } else {
                  moveHero(dragId, "POOL", target?.id, target?.position);
                }
              }
              setDragId(null);
            }}
            className={`rounded-2xl border transition-colors p-4 sm:p-5 shadow-xl ${
              dragOverZone === "POOL" ? "border-amber-500/80 bg-neutral-900/90" : "border-neutral-800/90 bg-neutral-950/95"
            }`}
          >
            <div className="flex items-center justify-between pb-3 text-[11px] font-black uppercase tracking-wider text-neutral-400">
              <span>Heróis Disponíveis</span>
              <span>{poolHeroIds.length} restantes</span>
            </div>
            <div
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(78px,1fr))] justify-items-center gap-2.5 p-1"
            >
              {poolHeroIds.map((id) => renderHeroChip(id, "POOL"))}
            </div>
          </section>
        </div>
      )}

      {tab === "community" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800/90 bg-neutral-950/60 p-4 sm:p-5 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-deadlock text-xl font-black uppercase tracking-wider text-[#f4efe6]">
                  Galeria da Comunidade
                </h3>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Explore, curta, comente, duplique ou poste no Feed as tier lists dos jogadores do LockPro.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab("builder")}
                className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black shadow transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                <span>Criar Tier List</span>
              </button>
            </div>

            {publishedLists.length > 0 && (
              <>

                <div className="space-y-3 border-t border-neutral-800/80 pt-3">
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
                    <div className="relative md:col-span-5">
                      <input
                        type="search"
                        value={communityQuery}
                        onChange={(e) => setCommunityQuery(e.target.value)}
                        placeholder="Buscar por título, descrição, autor ou @handle..."
                        className="w-full rounded-lg border border-neutral-700/80 bg-neutral-900/90 py-2 pl-8 pr-3 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500 transition-colors"
                      />
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="M10.5 10.5 14 14" />
                      </svg>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2">
                      <select
                        aria-label="Filtrar por herói"
                        value={communityHeroId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCommunityHeroId(v ? Number(v) : null);
                        }}
                        className="w-full rounded-lg border border-neutral-700/80 bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-[#f4efe6] outline-none focus:border-amber-500"
                      >
                        <option value="">Filtrar por herói (todos)</option>
                        {heroes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      {communityHeroId !== null && communityStyleFilter !== "quadrant" && (
                        <button
                          type="button"
                          onClick={() => setCommunityTopTierOnly((v) => !v)}
                          title="Mostrar apenas listas clássicas com este herói no 1º tier"
                          className={`shrink-0 cursor-pointer rounded-lg border px-2.5 py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
                            communityTopTierOnly
                              ? "border-amber-500 bg-amber-500/20 text-amber-300"
                              : "border-neutral-700/80 bg-neutral-900 text-neutral-400 hover:text-white"
                          }`}
                        >
                          No Topo
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <select
                        aria-label="Ordenar por"
                        value={communitySort}
                        onChange={(e) => setCommunitySort(e.target.value as CommunitySort)}
                        className="w-full rounded-lg border border-neutral-700/80 bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-[#f4efe6] outline-none focus:border-amber-500"
                      >
                        <option value="relevance">Ordenar: Relevância</option>
                        <option value="likes">Ordenar: Mais Curtidas</option>
                        <option value="comments">Ordenar: Mais Comentadas</option>
                        <option value="recent">Ordenar: Mais Recentes</option>
                        <option value="views">Ordenar: Mais Vistas</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                          onClick={() => setCommunityStyleFilter(key)}
                          className={`cursor-pointer rounded-md border px-2.5 py-1 font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors ${
                            communityStyleFilter === key
                              ? "border-amber-500 bg-amber-500 text-black"
                              : "border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}

                      {currentUser && (
                        <>
                          <span className="mx-1 h-4 w-px bg-neutral-800" />
                          {(
                            [
                              ["all", "Todas"],
                              ["mine", "Minhas Listas"],
                              ["liked", "Curtidas por Mim"],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setCommunityScopeFilter(key)}
                              className={`cursor-pointer rounded-md border px-2.5 py-1 font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors ${
                                communityScopeFilter === key
                                  ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-300"
                                  : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:border-neutral-700 hover:text-white"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    {hasActiveCommunityFilters && (
                      <button
                        type="button"
                        onClick={resetCommunityFilters}
                        className="cursor-pointer text-[11px] font-bold text-amber-400 hover:underline"
                      >
                        Limpar filtros ({filteredPublishedLists.length} de {publishedLists.length})
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {loadingCommunity ? (
            <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 py-16 text-center text-xs text-neutral-400">
              Carregando tier lists da comunidade...
            </div>
          ) : publishedLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800/90 bg-neutral-900/20 py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mb-4 shadow-[0_0_24px_rgba(245,158,11,0.15)]">
                <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
              </div>
              <h4 className="font-deadlock text-xl font-black text-[#f4efe6]">
                Nenhuma Tier List na Galeria
              </h4>
              <p className="mt-1 text-xs text-neutral-400 max-w-sm leading-relaxed">
                Monte sua classificação personalizada na aba anterior e clique em <strong className="text-neutral-200">&quot;Publicar no Site&quot;</strong> para compartilhá-la aqui.
              </p>
              <button
                type="button"
                onClick={() => setTab("builder")}
                className="mt-5 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105 active:scale-95"
              >
                Criar Minha Primeira Tier List
              </button>
            </div>
          ) : filteredPublishedLists.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/30 py-12 px-4 text-center">
              <p className="text-xs text-neutral-400 italic">
                Nenhuma tier list encontrada com os filtros atuais.
              </p>
              <button
                type="button"
                onClick={resetCommunityFilters}
                className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-amber-400 hover:border-amber-500"
              >
                Mostrar todas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {filteredPublishedLists.map((item) => {
                const isQuadrant = item.style === "quadrant" && Boolean(item.quadrant);
                const totalPlaced =
                  isQuadrant && item.quadrant
                    ? item.quadrant.items.length
                    : item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0);
                const dateText = new Date(item.createdAt).toLocaleDateString("pt-BR");
                const shapeLabel =
                  isQuadrant && item.quadrant
                    ? getPolygonShapeName(getQuadrantAxes(item.quadrant).length)
                    : "Clássica";
                const isTopHot = topRelevanceId === item.id;
                const likesCount = item.likesCount ?? 0;
                const commentsCount = item.commentsCount ?? 0;
                const viewsCount = item.viewsCount ?? 0;
                const commentsExpanded = Boolean(openCommentsIds[item.id]);
                const commentsList = fullCommentsMap[item.id] ?? item.recentComments ?? [];

                return (
                  <article
                    key={item.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-neutral-900/55 p-5 shadow-xl backdrop-blur-sm transition-all space-y-4 ${
                      isTopHot
                        ? "border-amber-500/45 shadow-[0_12px_40px_rgba(245,158,11,0.1)] hover:border-amber-400/70"
                        : "border-neutral-800/90 hover:border-neutral-700"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isTopHot && (
                              <span className="rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider text-amber-300">
                                Em Alta
                              </span>
                            )}
                            <span className="rounded border border-white/10 bg-neutral-950/90 px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider text-neutral-300">
                              {shapeLabel}
                            </span>
                            <span className="rounded bg-neutral-800/90 px-1.5 py-0.5 text-[10px] font-bold text-neutral-300">
                              {totalPlaced} {totalPlaced === 1 ? "herói" : "heróis"}
                            </span>
                          </div>

                          <h4 className="font-deadlock truncate text-xl font-black text-[#f4efe6]">
                            <Link
                              href={`/tier-maker/comunidade/${item.id}`}
                              className="transition-colors hover:text-amber-400"
                            >
                              {item.title}
                            </Link>
                          </h4>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={exportingId === item.id}
                            title="Exportar PNG"
                            onClick={() => handleExportItemPng(item)}
                            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 transition-colors hover:border-amber-400/70 hover:bg-neutral-900 disabled:opacity-50"
                          >
                            <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
                            </svg>
                            <span>{exportingId === item.id ? "..." : "PNG"}</span>
                          </button>

                          {item.canEdit && (
                            <button
                              type="button"
                              title="Abrir no editor"
                              onClick={() => loadPublished(item)}
                              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-200 transition-colors hover:border-amber-500/70 hover:bg-neutral-900 hover:text-amber-400"
                            >
                              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L4.5 13.5 2 14l.5-2.5L11.5 2.5z" />
                              </svg>
                              <span>Editar</span>
                            </button>
                          )}

                          <Link
                            href={`/tier-maker/comunidade/${item.id}`}
                            title="Abrir página completa"
                            aria-label={`Abrir ${item.title}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950/70 text-neutral-400 transition-colors hover:border-amber-500/60 hover:text-amber-400"
                          >
                            <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 7 9" />
                            </svg>
                          </Link>

                          {item.canDelete && (
                            <button
                              type="button"
                              title="Excluir da galeria"
                              onClick={(e) => deletePublished(item.id, e)}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-neutral-500 hover:border-rose-500/40 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                            >
                              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <TierAuthorBadge
                          name={item.author}
                          handle={item.authorHandle}
                          avatarUrl={item.authorAvatarUrl}
                          size="sm"
                        />
                        <span>•</span>
                        <span>{dateText}</span>
                      </div>

                      {item.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-neutral-300">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/tier-maker/comunidade/${item.id}`}
                      className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                    >
                      {isQuadrant && item.quadrant ? (
                        <TierQuadrantBoard
                          mode="preview"
                          quadrant={item.quadrant}
                          byId={byId}
                        />
                      ) : item.tiers.length === 0 ? (
                        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/70 px-4 text-center text-xs italic text-neutral-500">
                          Prancha sem categorias disponíveis (clique para abrir ou excluir).
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950/90 divide-y divide-neutral-900/90 shadow-inner">
                          {item.tiers.slice(0, 6).map((t, idx) => {
                            const tierHeroes = (t.heroes || [])
                              .map((hId) => byId.get(hId))
                              .filter((h): h is NonNullable<typeof h> => Boolean(h));

                            const MAX_PREVIEW = 10;
                            const visibleHeroes = tierHeroes.slice(0, MAX_PREVIEW);
                            const overflowCount = tierHeroes.length - MAX_PREVIEW;

                            return (
                              <div key={idx} className="flex min-h-[36px] items-stretch">
                                <div
                                  style={{ backgroundColor: t.color }}
                                  className="flex w-16 sm:w-20 shrink-0 items-center justify-center p-1 text-center select-none"
                                >
                                  <span
                                    className="font-deadlock truncate px-1 text-[11px] font-black uppercase text-black leading-tight"
                                    title={t.label}
                                  >
                                    {t.label.replace(/\n+/g, " ")}
                                  </span>
                                </div>

                                <div className="flex flex-1 flex-wrap items-center gap-1.5 bg-neutral-950/70 p-1.5 sm:px-2.5">
                                  {tierHeroes.length === 0 ? (
                                    <span className="text-[10px] text-neutral-600 italic px-1">—</span>
                                  ) : (
                                    <>
                                      {visibleHeroes.map((h) => (
                                        <div
                                          key={h.id}
                                          title={h.name}
                                          className="relative h-6 w-6 sm:h-7 sm:w-7 shrink-0 overflow-hidden rounded-[4px] border border-neutral-800 bg-neutral-900 shadow-sm"
                                        >
                                          <img
                                            src={h.image}
                                            alt={h.name}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                          />
                                        </div>
                                      ))}
                                      {overflowCount > 0 && (
                                        <span className="flex h-6 items-center rounded-[4px] border border-neutral-800 bg-neutral-900 px-1.5 text-[9px] font-bold text-neutral-400">
                                          +{overflowCount}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {item.tiers.length > 6 && (
                            <div className="bg-neutral-950 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              +{item.tiers.length - 6} categorias na página completa
                            </div>
                          )}
                        </div>
                      )}
                    </Link>

                    <div className="space-y-3 border-t border-neutral-800/80 pt-3">
                      <div className="flex items-center justify-between gap-2 pt-0.5 text-neutral-400">
                        {/* Comentários */}
                        <button
                          type="button"
                          title="Comentários"
                          aria-label={`Comentários (${commentsCount})`}
                          onClick={() => void handleToggleComments(item)}
                          className={`group/act inline-flex cursor-pointer items-center gap-1 text-xs font-medium tabular-nums transition-colors ${
                            commentsExpanded ? "text-amber-400" : "hover:text-amber-400"
                          }`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover/act:bg-amber-500/12">
                            <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                          </span>
                          <span>{commentsCount}</span>
                        </button>

                        {/* Postar no Feed (Repost) */}
                        <button
                          type="button"
                          title="Postar no Feed"
                          aria-label="Postar no Feed"
                          onClick={() => openFeedShareModal(item)}
                          className="group/act inline-flex cursor-pointer items-center gap-1 text-xs font-medium transition-colors hover:text-emerald-400"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover/act:bg-emerald-500/12">
                            <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m17 2 4 4-4 4" />
                              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                              <path d="m7 22-4-4 4-4" />
                              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                            </svg>
                          </span>
                        </button>

                        {/* Curtir */}
                        <button
                          type="button"
                          title="Curtir"
                          aria-label={`Curtir (${likesCount})`}
                          disabled={likeBusyIds[item.id]}
                          onClick={() => handleToggleLike(item)}
                          className={`group/act inline-flex cursor-pointer items-center gap-1 text-xs font-medium tabular-nums transition-colors ${
                            item.likedByMe ? "text-rose-500" : "hover:text-rose-400"
                          }`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover/act:bg-rose-500/12">
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              className="h-[18px] w-[18px]"
                              fill={item.likedByMe ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572z" />
                            </svg>
                          </span>
                          <span>{likesCount}</span>
                        </button>

                        {/* Visualizações */}
                        <Link
                          href={`/tier-maker/comunidade/${item.id}`}
                          title={`${viewsCount} ${viewsCount === 1 ? "visualização" : "visualizações"}`}
                          aria-label={`${viewsCount} visualizações`}
                          className="group/act inline-flex items-center gap-1 text-xs font-medium tabular-nums transition-colors hover:text-sky-400"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover/act:bg-sky-500/12">
                            <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20V14M10 20V4M16 20v-9M22 20v-6" />
                            </svg>
                          </span>
                          <span>{viewsCount}</span>
                        </Link>

                        {/* Compartilhar */}
                        <div className="relative" data-share-menu>
                          <button
                            type="button"
                            title="Compartilhar"
                            aria-label="Compartilhar"
                            onClick={() =>
                              setOpenShareId((curr) => (curr === item.id ? null : item.id))
                            }
                            className="group/act inline-flex cursor-pointer items-center text-neutral-400 transition-colors hover:text-amber-400"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover/act:bg-amber-500/12">
                              <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <path d="m16 6-4-4-4 4" />
                                <path d="M12 2v13" />
                              </svg>
                            </span>
                          </button>

                          {openShareId === item.id && (
                            <div className="absolute right-0 bottom-full z-30 mb-2 w-52 rounded-xl border border-neutral-800 bg-neutral-950/98 p-1.5 shadow-2xl backdrop-blur-md space-y-1">
                              <button
                                type="button"
                                onClick={() => void handleCopyShareLink(item, false)}
                                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-amber-300"
                              >
                                <span>
                                  {copiedShareState === `${item.id}:link`
                                    ? "Link copiado!"
                                    : "Copiar link"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyShareLink(item, true)}
                                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-amber-300"
                              >
                                <span>
                                  {copiedShareState === `${item.id}:summary`
                                    ? "Resumo copiado!"
                                    : "Copiar p/ Discord"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleNativeShare(item)}
                                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-neutral-200 hover:bg-neutral-900 hover:text-amber-300"
                              >
                                <span>Compartilhar...</span>
                              </button>
                              <button
                                type="button"
                                disabled={exportingId === item.id}
                                onClick={() => {
                                  setOpenShareId(null);
                                  void handleExportItemPng(item);
                                }}
                                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-amber-400 hover:bg-neutral-900 disabled:opacity-50"
                              >
                                <span>
                                  {exportingId === item.id ? "Gerando PNG..." : "Baixar imagem PNG"}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {!commentsExpanded && (item.recentComments?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleToggleComments(item)}
                          className="w-full cursor-pointer rounded-lg border border-neutral-800/70 bg-black/30 px-3 py-2 text-left text-xs text-neutral-300 hover:border-neutral-700 transition-colors"
                        >
                          {(() => {
                            const last = item.recentComments![item.recentComments!.length - 1];
                            return (
                              <span className="line-clamp-1">
                                <strong className="text-[#f4efe6]">{last.author.username}:</strong>{" "}
                                {last.content}
                              </span>
                            );
                          })()}
                        </button>
                      )}

                      {commentsExpanded && (
                        <div className="space-y-2.5 rounded-xl border border-neutral-800/80 bg-black/35 p-3">
                          {loadingCommentsMap[item.id] ? (
                            <p className="text-[11px] text-neutral-500">Carregando comentários...</p>
                          ) : commentsList.length === 0 ? (
                            <p className="text-[11px] italic text-neutral-500">
                              Nenhum comentário ainda. Seja o primeiro a opinar!
                            </p>
                          ) : (
                            <div className="max-h-52 space-y-2 overflow-y-auto pr-1 lp-scroll">
                              {commentsList.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-start justify-between gap-2 rounded-lg bg-neutral-900/70 px-2.5 py-2"
                                >
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                      {c.author.handle ? (
                                        <Link
                                          href={`/profile/${encodeURIComponent(c.author.handle)}`}
                                          className="font-bold text-[#f4efe6] hover:text-amber-400"
                                        >
                                          {c.author.username}
                                        </Link>
                                      ) : (
                                        <span className="font-bold text-[#f4efe6]">
                                          {c.author.username}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-neutral-500">
                                        {new Date(c.createdAt).toLocaleString("pt-BR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words text-xs text-neutral-300">
                                      {c.content}
                                    </p>
                                  </div>
                                  {c.canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteTierComment(item.id, c.id)}
                                      className="shrink-0 cursor-pointer text-[10px] font-bold uppercase text-rose-400 hover:underline"
                                    >
                                      Excluir
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {currentUser ? (
                            <form
                              onSubmit={(e) => void handleAddTierComment(item, e)}
                              className="flex gap-2 pt-1"
                            >
                              <input
                                type="text"
                                maxLength={300}
                                value={commentDrafts[item.id] ?? ""}
                                onChange={(e) =>
                                  setCommentDrafts((m) => ({
                                    ...m,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                placeholder="Comentar nessa tier list..."
                                className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500/60"
                              />
                              <button
                                type="submit"
                                disabled={
                                  commentBusyIds[item.id] ||
                                  !(commentDrafts[item.id] ?? "").trim()
                                }
                                className="cursor-pointer rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs font-black uppercase text-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Enviar
                              </button>
                            </form>
                          ) : (
                            <p className="text-[11px] text-neutral-400">
                              <Link href="/login?next=/tier-maker/comunidade" className="font-bold text-amber-400 hover:underline">
                                Entre na sua conta
                              </Link>{" "}
                              para comentar.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {feedModalItem && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Postar tier list no Feed"
              onClick={() => {
                if (!postingToFeed) setFeedModalItem(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div>
                    <h4 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
                      Postar no Feed da Comunidade
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Sua postagem vai incluir um card interativo para esta tier list.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={postingToFeed}
                    onClick={() => setFeedModalItem(null)}
                    className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-neutral-400 hover:bg-neutral-900 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5">
                  <p className="font-deadlock text-sm font-black text-[#f4efe6]">
                    {feedModalItem.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    por {feedModalItem.author} •{" "}
                    {feedModalItem.style === "quadrant" && feedModalItem.quadrant
                      ? getPolygonShapeName(getQuadrantAxes(feedModalItem.quadrant).length)
                      : "Tier List Clássica"}
                  </p>
                </div>

                <form onSubmit={(e) => void submitFeedShare(e)} className="space-y-3">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={feedPostContent}
                    onChange={(e) => setFeedPostContent(e.target.value)}
                    placeholder="Escreva o que achou dessa tier list..."
                    className="w-full resize-y rounded-lg border border-neutral-800 bg-black/60 p-3 text-sm text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500"
                  />
                  {feedModalError && (
                    <p className="text-xs font-semibold text-rose-400">{feedModalError}</p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-neutral-500">
                      {feedPostContent.length}/500 caracteres
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={postingToFeed}
                        onClick={() => setFeedModalItem(null)}
                        className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={postingToFeed || !feedPostContent.trim()}
                        className="cursor-pointer rounded-lg border border-emerald-400/80 bg-emerald-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {postingToFeed ? "Publicando..." : "Publicar no Feed"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      {modal}
    </div>
  );
}