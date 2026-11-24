"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { MakerHero } from "@/app/tiers";
import type { TierQuadrantData } from "@/lib/backend/types";

export const DEFAULT_QUADRANT_DATA: TierQuadrantData = {
  topLabel: "Difícil de dominar",
  bottomLabel: "Fácil de dominar",
  leftLabel: "Fácil de aprender",
  rightLabel: "Difícil de aprender",
  items: [],
};

interface Props {
  mode: "editor" | "detail" | "preview";
  quadrant: TierQuadrantData;
  byId: Map<number, MakerHero>;
  poolRef?: RefObject<HTMLElement | null>;
  selectedHeroId?: number | null;
  dragHeroId?: number | null;
  onSelectHero?: (heroId: number | null) => void;
  onPlaceHero?: (heroId: number, x: number, y: number) => void;
  onRemoveHero?: (heroId: number, refHeroId?: number, position?: "before" | "after") => void;
  onChangeLabel?: (axis: "topLabel" | "bottomLabel" | "leftLabel" | "rightLabel", value: string) => void;
  onDragOverPoolChange?: (over: boolean) => void;
  onPoolDropHover?: (target: { id: number; position: "before" | "after" } | null) => void;
  onQuadrantDragChange?: (heroId: number | null) => void;
  onDragEnd?: () => void;
}

const clampCoord = (v: number) =>
  Math.round(Math.min(95, Math.max(5, v)) * 100) / 100;

export default function TierQuadrantBoard({
  mode,
  quadrant,
  byId,
  poolRef,
  selectedHeroId = null,
  dragHeroId = null,
  onSelectHero,
  onPlaceHero,
  onRemoveHero,
  onChangeLabel,
  onDragOverPoolChange,
  onPoolDropHover,
  onQuadrantDragChange,
  onDragEnd,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [floatingDrag, setFloatingDrag] = useState<{
    heroId: number;
    clientX: number;
    clientY: number;
    overPool: boolean;
  } | null>(null);
  const [dropGuide, setDropGuide] = useState<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);

  const isPointInPool = useCallback(
    (clientX: number, clientY: number) => {
      const poolEl = poolRef?.current;
      if (!poolEl) return false;
      const r = poolEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    },
    [poolRef],
  );

  const poolTargetAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (typeof document === "undefined") return null;
      const hit = document.elementFromPoint(clientX, clientY);
      const direct = hit?.closest<HTMLElement>("[data-pool-hero-id]");
      if (direct) {
        const id = Number(direct.dataset.poolHeroId);
        if (Number.isInteger(id) && id > 0) {
          const rect = direct.getBoundingClientRect();
          const position: "before" | "after" =
            clientX - rect.left >= rect.width / 2 ? "after" : "before";
          return { id, position };
        }
      }

      const poolEl = poolRef?.current;
      if (!poolEl) return null;

      let best: { id: number; position: "before" | "after"; dist: number } | null = null;
      const cards = poolEl.querySelectorAll<HTMLElement>("[data-pool-hero-id]");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (clientY < rect.top - 8 || clientY > rect.bottom + 8) continue;
        const distX =
          clientX < rect.left
            ? rect.left - clientX
            : clientX > rect.right
              ? clientX - rect.right
              : 0;
        if (distX > 18) continue;
        const id = Number(card.dataset.poolHeroId);
        if (!Number.isInteger(id) || id <= 0) continue;
        if (!best || distX < best.dist) {
          const position: "before" | "after" =
            clientX - rect.left >= rect.width / 2 ? "after" : "before";
          best = { id, position, dist: distX };
        }
      }

      return best ? { id: best.id, position: best.position } : null;
    },
    [poolRef],
  );

  const isEditor = mode === "editor";
  const isPreview = mode === "preview";

  const coordsFromClient = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = clampCoord(((clientX - rect.left) / rect.width) * 100);
    const y = clampCoord(((clientY - rect.top) / rect.height) * 100);
    return { x, y };
  }, []);

  useEffect(() => {
    if (!isEditor || selectedHeroId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        onSelectHero?.(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && quadrant.items.some((it) => it.heroId === selectedHeroId)) {
        e.preventDefault();
        onRemoveHero?.(selectedHeroId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditor, selectedHeroId, quadrant.items, onRemoveHero, onSelectHero]);

  const startHeroPointerDrag = (heroId: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditor || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    setDraggingId(heroId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
        moved = true;
        onQuadrantDragChange?.(heroId);
      }

      if (ev.clientY > window.innerHeight - 48) {
        window.scrollBy(0, 14);
      } else if (ev.clientY < 48) {
        window.scrollBy(0, -14);
      }

      const el = boardRef.current;
      const rect = el?.getBoundingClientRect();
      const insideBoard = Boolean(
        rect &&
          ev.clientX >= rect.left &&
          ev.clientX <= rect.right &&
          ev.clientY >= rect.top &&
          ev.clientY <= rect.bottom,
      );

      if (insideBoard) {
        setFloatingDrag(null);
        onDragOverPoolChange?.(false);
        onPoolDropHover?.(null);
        const pos = coordsFromClient(ev.clientX, ev.clientY);
        if (pos) onPlaceHero?.(heroId, pos.x, pos.y);
      } else {
        const overPool = isPointInPool(ev.clientX, ev.clientY);
        onDragOverPoolChange?.(overPool);
        onPoolDropHover?.(overPool ? poolTargetAtPoint(ev.clientX, ev.clientY) : null);
        setFloatingDrag({
          heroId,
          clientX: ev.clientX,
          clientY: ev.clientY,
          overPool,
        });
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      setDraggingId(null);
      setFloatingDrag(null);
      onDragOverPoolChange?.(false);
      onPoolDropHover?.(null);
      onQuadrantDragChange?.(null);

      if (moved) {
        if (isPointInPool(ev.clientX, ev.clientY)) {
          const target = poolTargetAtPoint(ev.clientX, ev.clientY);
          onRemoveHero?.(heroId, target?.id, target?.position);
        }
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      } else {
        onSelectHero?.(selectedHeroId === heroId ? null : heroId);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditor || justDraggedRef.current || selectedHeroId === null) return;
    const pos = coordsFromClient(e.clientX, e.clientY);
    if (pos) {
      onPlaceHero?.(selectedHeroId, pos.x, pos.y);
      onSelectHero?.(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!isEditor) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const pos = coordsFromClient(e.clientX, e.clientY);
    if (pos) setDropGuide(pos);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropGuide(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!isEditor) return;
    e.preventDefault();
    const rawId = Number(e.dataTransfer.getData("text/plain"));
    const targetHeroId = dragHeroId ?? (Number.isInteger(rawId) && rawId > 0 ? rawId : null);
    const pos = coordsFromClient(e.clientX, e.clientY);
    setDropGuide(null);
    if (targetHeroId && pos) {
      onPlaceHero?.(targetHeroId, pos.x, pos.y);
      onSelectHero?.(null);
    }
    onDragEnd?.();
  };

  const renderAxisLabel = (
    axis: "topLabel" | "bottomLabel" | "leftLabel" | "rightLabel",
    posClass: string,
    value: string,
  ) => {
    if (isPreview) {
      return (
        <span
          className={`pointer-events-none absolute z-20 max-w-[115px] truncate rounded border border-white/10 bg-[#070a09]/90 px-1.5 py-0.5 font-deadlock text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#f4efe6]/90 shadow ${posClass}`}
        >
          {value}
        </span>
      );
    }

    if (!isEditor) {
      return (
        <div
          className={`pointer-events-none absolute z-20 max-w-[140px] sm:max-w-[210px] rounded-[5px] border border-white/15 bg-[#090d0c]/92 px-2.5 py-1 text-center shadow-[0_6px_18px_rgba(0,0,0,0.85)] backdrop-blur-sm ${posClass}`}
        >
          <span className="font-deadlock block truncate text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f4efe6]">
            {value}
          </span>
        </div>
      );
    }

    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`group/axis absolute z-20 flex items-center gap-1 rounded-[5px] border border-white/15 bg-[#090d0c]/92 px-2 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-colors hover:border-amber-500/50 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/40 ${posClass}`}
      >
        <input
          type="text"
          maxLength={35}
          value={value}
          aria-label={`Editar rótulo ${axis}`}
          onChange={(e) => onChangeLabel?.(axis, e.target.value)}
          style={{ width: `${Math.min(24, Math.max(10, value.length + 1))}ch` }}
          className="font-deadlock max-w-[130px] sm:max-w-[195px] bg-transparent text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f4efe6] outline-none placeholder:text-neutral-600"
        />
      </div>
    );
  };

  return (
    <div
      ref={boardRef}
      onClick={handleBoardClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full select-none overflow-hidden bg-[#070a09] ${
        isPreview
          ? "h-64 rounded-xl border border-neutral-800/80 shadow-inner"
          : "mx-auto aspect-square max-w-[760px] rounded-2xl border border-neutral-800/90 shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
      } ${isEditor && selectedHeroId !== null ? "cursor-crosshair" : ""}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.06), transparent 68%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: isPreview ? "100% 100%, 16.666% 16.666%, 16.666% 16.666%" : "100% 100%, 12.5% 12.5%, 12.5% 12.5%",
      }}
    >
      {/* Vinheta suave nas bordas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Eixo Horizontal */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-white/10 via-[#f4efe6]/45 to-white/10 ${
          isPreview ? "inset-x-3" : "inset-x-5"
        }`}
      />
      {/* Eixo Vertical */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-[1.5px] bg-gradient-to-b from-white/10 via-[#f4efe6]/45 to-white/10 ${
          isPreview ? "inset-y-3" : "inset-y-5"
        }`}
      />
      {/* Marcador Central */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/50 bg-[#090d0c] ${
          isPreview ? "h-1.5 w-1.5" : "h-2.5 w-2.5 shadow-[0_0_10px_rgba(245,158,11,0.35)]"
        }`}
      />

      {/* Rótulos dos 4 extremos */}
      {renderAxisLabel("topLabel", isPreview ? "top-2 left-1/2 -translate-x-1/2" : "top-3 left-1/2 -translate-x-1/2", quadrant.topLabel)}
      {renderAxisLabel("bottomLabel", isPreview ? "bottom-2 left-1/2 -translate-x-1/2" : "bottom-3 left-1/2 -translate-x-1/2", quadrant.bottomLabel)}
      {renderAxisLabel("leftLabel", isPreview ? "left-2 top-1/2 -translate-y-1/2" : "left-3 top-1/2 -translate-y-1/2", quadrant.leftLabel)}
      {renderAxisLabel("rightLabel", isPreview ? "right-2 top-1/2 -translate-y-1/2" : "right-3 top-1/2 -translate-y-1/2", quadrant.rightLabel)}

      {/* Mira de drop ao arrastar da bandeja */}
      {isEditor && dropGuide && (
        <div
          aria-hidden
          style={{ left: `${dropGuide.x}%`, top: `${dropGuide.y}%` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full border-2 border-dashed border-amber-400/90 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
        />
      )}

      {/* Heróis posicionados no gráfico */}
      {quadrant.items.map((item) => {
        const hero = byId.get(item.heroId);
        if (!hero) return null;

        const imgSrc = hero.icon || hero.image;
        const rgbStr = hero.rgb ? hero.rgb.join(" ") : "245 158 11";
        const isSelected = isEditor && selectedHeroId === item.heroId;
        const isDragging = isEditor && draggingId === item.heroId;
        const isDraggingOut = isEditor && floatingDrag?.heroId === item.heroId;

        return (
          <div
            key={item.heroId}
            onPointerDown={(e) => startHeroPointerDrag(item.heroId, e)}
            onClick={(e) => {
              if (isEditor) e.stopPropagation();
            }}
            title={hero.name}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              "--hc": rgbStr,
            } as CSSProperties}
            className={`group/node absolute -translate-x-1/2 -translate-y-1/2 ${
              isDraggingOut
                ? "z-10 opacity-25 scale-95 cursor-grabbing"
                : isDragging
                  ? "z-40 scale-115 cursor-grabbing"
                  : isSelected
                    ? "z-30 scale-110 cursor-grab"
                    : isPreview
                      ? "z-10"
                      : "z-10 hover:z-30 hover:scale-115 transition-transform duration-150"
            } ${isEditor && !isDragging ? "cursor-grab touch-none" : ""}`}
          >
            {/* Aura sutil na cor temática do herói por trás do recorte transparente */}
            <span
              aria-hidden
              className={`pointer-events-none absolute -inset-2 rounded-full transition-opacity duration-150 ${
                isSelected || isDragging ? "opacity-95" : "opacity-55 group-hover/node:opacity-95"
              }`}
              style={{
                background:
                  "radial-gradient(circle, rgb(var(--hc) / 0.34) 0%, rgb(var(--hc) / 0.08) 55%, transparent 75%)",
              }}
            />

            {isSelected && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-400/90 shadow-[0_0_14px_rgba(245,158,11,0.65)]"
              />
            )}

            <img
              src={imgSrc}
              alt={hero.name}
              draggable={false}
              className={`relative z-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] ${
                isPreview ? "h-7 w-7 sm:h-8 sm:w-8" : "h-11 w-11 sm:h-14 sm:w-14"
              }`}
            />

            {!isPreview && (
              <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-white/15 bg-black/90 px-1.5 py-0.5 text-[10px] font-bold text-[#f4efe6] opacity-0 shadow-lg transition-opacity duration-150 group-hover/node:opacity-100">
                {hero.name}
              </span>
            )}

            {isEditor && (
              <button
                type="button"
                aria-label={`Remover ${hero.name} do gráfico`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveHero?.(item.heroId);
                }}
                className="absolute -right-1 -top-1 z-30 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-neutral-950/95 text-[10px] font-black leading-none text-neutral-300 opacity-0 shadow transition-all hover:border-rose-400 hover:bg-rose-600 hover:text-white group-hover/node:opacity-100"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {isEditor && floatingDrag && typeof document !== "undefined" && (() => {
        const hero = byId.get(floatingDrag.heroId);
        if (!hero) return null;
        const imgSrc = hero.icon || hero.image;
        return createPortal(
          <div
            aria-hidden
            style={{ left: floatingDrag.clientX, top: floatingDrag.clientY }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
          >
            <img
              src={imgSrc}
              alt=""
              className={`h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.95)] transition-transform duration-100 ${
                floatingDrag.overPool ? "scale-90 opacity-90" : "scale-105 opacity-85"
              }`}
            />
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}