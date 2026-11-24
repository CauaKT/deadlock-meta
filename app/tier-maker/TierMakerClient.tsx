"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties, type DragEvent } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { MakerHero } from "@/app/tiers";
import {
  createTierList,
  deleteTierList,
  getCommunityTierLists,
  getCurrentClientUser,
  getTierListById,
  subscribeToAuthChanges,
  updateTierList,
} from "@/lib/backend/client";
import type { AuthUser, TierListItem, TierListStyle, TierQuadrantData } from "@/lib/backend/types";
import { exportTierListToPng } from "./exportTierListPng";
import TierAuthorBadge from "./TierAuthorBadge";
import TierQuadrantBoard, { DEFAULT_QUADRANT_DATA } from "./TierQuadrantBoard";

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
  // Troca só a URL, sem remontar o editor: o quadro em montagem não se perde ao ver a Comunidade
  const setTab = useCallback((next: "builder" | "community") => {
    window.history.pushState(null, "", next === "community" ? "/tier-maker/comunidade" : "/tier-maker");
  }, []);
  const [title, setTitle] = useState("Minha Tier List");
  const [boardStyle, setBoardStyle] = useState<TierListStyle>("classic");
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
    setBoardStyle("classic");
    setTiers(DEFAULT_TIERS);
    setBoard(createEmptyBoard(heroes, DEFAULT_TIERS));
    setQuadrant(DEFAULT_QUADRANT_DATA);
    setQuadrantPool(heroes.map((h) => h.id));
    setSelected(null);
    if (typeof window !== "undefined" && window.location.search.includes("edit=")) {
      window.history.replaceState(null, "", "/tier-maker");
    }
  }, [heroes]);

  const applyListToBuilder = useCallback(
    (pub: TierListItem) => {
      setEditingId(pub.id);
      setTitle(pub.title);
      if (pub.style === "quadrant" && pub.quadrant) {
        setBoardStyle("quadrant");
        const validItems = pub.quadrant.items.filter((it) => byId.has(it.heroId));
        const placed = new Set(validItems.map((it) => it.heroId));
        setQuadrant({
          topLabel: pub.quadrant.topLabel,
          bottomLabel: pub.quadrant.bottomLabel,
          leftLabel: pub.quadrant.leftLabel,
          rightLabel: pub.quadrant.rightLabel,
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
      setTab("builder");
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

      const editId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("edit")
          : null;

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
          applyListToBuilder(res.data);
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

    if (
      boardStyle === "quadrant" &&
      (!quadrant.topLabel.trim() ||
        !quadrant.bottomLabel.trim() ||
        !quadrant.leftLabel.trim() ||
        !quadrant.rightLabel.trim())
    ) {
      setFeedback({ type: "error", text: "Preencha os 4 rótulos dos eixos do gráfico." });
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

    const payload =
      boardStyle === "quadrant"
        ? {
            title: cleanTitle,
            style: "quadrant" as const,
            tiers: [],
            quadrant: {
              topLabel: quadrant.topLabel.trim(),
              bottomLabel: quadrant.bottomLabel.trim(),
              leftLabel: quadrant.leftLabel.trim(),
              rightLabel: quadrant.rightLabel.trim(),
              items: quadrant.items,
            },
          }
        : {
            title: cleanTitle,
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

  const [communityQuery, setCommunityQuery] = useState("");

  const filteredPublishedLists = useMemo(() => {
    const q = communityQuery.trim().toLowerCase();
    if (!q) return publishedLists;
    return publishedLists.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.author.toLowerCase().includes(q) ||
        (l.authorHandle?.toLowerCase().includes(q) ?? false),
    );
  }, [publishedLists, communityQuery]);

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
    applyListToBuilder(pub);
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

      {feedback && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          {feedback.needsLogin && (
            <Link
              href="/login?next=/tier-maker"
              className="rounded-lg border border-amber-500 bg-amber-500 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
            >
              Fazer Login
            </Link>
          )}
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
                    href="/login?next=/tier-maker"
                    className="font-bold text-amber-400 hover:underline"
                  >
                    Entrar
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Configurações da Prancha (Engrenagem) */}
              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  title="Configurações da prancha"
                  aria-label="Configurações da prancha"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[5px] border shadow transition-all duration-150 hover:scale-105 active:scale-95 ${
                    settingsOpen || !dynamicExpressions || boardStyle === "quadrant"
                      ? "border-amber-500/80 bg-neutral-800 text-amber-400"
                      : "border-neutral-700/80 bg-neutral-900/90 text-neutral-400 hover:border-amber-500/70 hover:text-white"
                  }`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? "rotate-90 text-amber-400" : ""}`}
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

                    <div className="space-y-1.5">
                      <span className="font-deadlock block text-[11px] font-black uppercase tracking-wider text-[#f4efe6]">
                        Estilo da Tier List
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="Estilo da Tier List"
                        className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-800 bg-neutral-900/80 p-1"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={boardStyle === "classic"}
                          onClick={() => {
                            setBoardStyle("classic");
                            setSelected(null);
                          }}
                          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-all ${
                            boardStyle === "classic"
                              ? "bg-amber-500 text-black shadow-sm"
                              : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
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
                          }}
                          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider transition-all ${
                            boardStyle === "quadrant"
                              ? "bg-amber-500 text-black shadow-sm"
                              : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                          }`}
                        >
                          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M8 2v12M2 8h12" />
                          </svg>
                          <span>Quadrante 2D</span>
                        </button>
                      </div>
                    </div>

                    {boardStyle === "classic" ? (
                      <div className="border-t border-neutral-800/80 pt-2.5">
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
                    ) : (
                      <p className="border-t border-neutral-800/80 pt-2.5 text-[11px] font-medium leading-tight text-neutral-400">
                        Clique nos 4 rótulos do gráfico para editar os eixos e arraste os heróis livremente pelo plano 2D.
                      </p>
                    )}
                  </div>
                )}
              </div>

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
              onChangeLabel={(axis, value) =>
                setQuadrant((prev) => ({ ...prev, [axis]: value }))
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
            <div>
              <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
                Galeria da Comunidade
              </h3>
              <p className="text-xs text-neutral-400">
                Tier lists publicadas pelos jogadores do LockPro.
              </p>
            </div>

            {publishedLists.length > 0 && (
              <div className="relative w-full sm:w-64">
                <input
                  type="search"
                  value={communityQuery}
                  onChange={(e) => setCommunityQuery(e.target.value)}
                  placeholder="Buscar por título ou autor..."
                  className="w-full rounded-lg border border-neutral-700/80 bg-neutral-900/90 py-1.5 pl-8 pr-3 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500 transition-colors"
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
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 py-12 text-center text-xs text-neutral-400 italic">
              Nenhuma tier list encontrada para &quot;{communityQuery}&quot;.
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

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-900/50 p-5 shadow-xl backdrop-blur-sm transition-all hover:border-neutral-700 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-deadlock truncate text-xl font-black text-[#f4efe6]">
                          <Link
                            href={`/tier-maker/comunidade/${item.id}`}
                            className="transition-colors hover:text-amber-400"
                          >
                            {item.title}
                          </Link>
                        </h4>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          <TierAuthorBadge
                            name={item.author}
                            handle={item.authorHandle}
                            avatarUrl={item.authorAvatarUrl}
                            size="sm"
                          />
                          <span>•</span>
                          <span>{dateText}</span>
                          <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                            {totalPlaced} {totalPlaced === 1 ? "herói" : "heróis"}
                          </span>
                        </div>
                      </div>

                      {item.canDelete && (
                        <button
                          type="button"
                          title="Excluir da galeria"
                          onClick={(e) => deletePublished(item.id, e)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                        >
                          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isQuadrant && item.quadrant ? (
                      <TierQuadrantBoard
                        mode="preview"
                        quadrant={item.quadrant}
                        byId={byId}
                      />
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950/90 divide-y divide-neutral-900/90 shadow-inner">
                        {item.tiers.map((t, idx) => {
                          const tierHeroes = (t.heroes || [])
                            .map((hId) => byId.get(hId))
                            .filter((h): h is NonNullable<typeof h> => Boolean(h));

                          const MAX_PREVIEW = 10;
                          const visibleHeroes = tierHeroes.slice(0, MAX_PREVIEW);
                          const overflowCount = tierHeroes.length - MAX_PREVIEW;

                          return (
                            <div key={idx} className="flex min-h-[38px] items-stretch">
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
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={exportingId === item.id}
                        onClick={() => handleExportItemPng(item)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/90 py-2.5 px-3 font-deadlock text-xs font-black uppercase tracking-wider text-amber-400 transition-all hover:border-amber-400 hover:bg-neutral-800 disabled:opacity-50"
                      >
                        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
                        </svg>
                        <span>{exportingId === item.id ? "Gerando..." : "Exportar PNG"}</span>
                      </button>

                      {item.canEdit && (
                        <button
                          type="button"
                          onClick={() => loadPublished(item)}
                          className="group inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/80 py-2.5 px-3 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] transition-all hover:border-amber-500/80 hover:bg-neutral-800 hover:text-amber-400"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 16 16"
                            className="h-3.5 w-3.5 transition-transform group-hover:scale-110"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L4.5 13.5 2 14l.5-2.5L11.5 2.5z" />
                          </svg>
                          <span>Abrir no Editor</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {modal}
    </div>
  );
}