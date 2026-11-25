"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { MakerHero } from "@/app/tiers";
import type { TierQuadrantData } from "@/lib/backend/types";

export const MIN_QUADRANT_AXES = 3;
export const MAX_QUADRANT_AXES = 10;

export const DEFAULT_QUADRANT_AXES: string[] = [
  "Difícil de dominar",
  "Difícil de aprender",
  "Fácil de dominar",
  "Fácil de aprender",
];

export function getQuadrantAxes(
  quadrant: Pick<TierQuadrantData, "topLabel" | "rightLabel" | "bottomLabel" | "leftLabel" | "axes">,
): string[] {
  if (Array.isArray(quadrant.axes) && quadrant.axes.length >= MIN_QUADRANT_AXES) {
    return quadrant.axes.slice(0, MAX_QUADRANT_AXES);
  }
  return [
    quadrant.topLabel,
    quadrant.rightLabel,
    quadrant.bottomLabel,
    quadrant.leftLabel,
  ];
}

export function buildLegacyLabelsFromAxes(axes: string[]) {
  return {
    topLabel: axes[0] || "Eixo 1",
    rightLabel: axes[1] || "Eixo 2",
    bottomLabel: axes[2] || "Eixo 3",
    leftLabel: axes[3] ?? axes[axes.length - 1] ?? "Eixo 4",
  };
}

export function getPolygonShapeName(count: number): string {
  const names: Record<number, string> = {
    3: "Triângulo",
    4: "Quadrado",
    5: "Pentágono",
    6: "Hexágono",
    7: "Heptágono",
    8: "Octógono",
    9: "Eneágono",
    10: "Decágono",
  };
  return names[count] || `${count} Pontas`;
}

export const DEFAULT_QUADRANT_DATA: TierQuadrantData = {
  ...buildLegacyLabelsFromAxes(DEFAULT_QUADRANT_AXES),
  axes: DEFAULT_QUADRANT_AXES,
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
  onChangeAxisLabel?: (index: number, value: string) => void;
  onAddAxis?: (afterIndex?: number) => void;
  onRemoveAxis?: (index: number) => void;
  onDragOverPoolChange?: (over: boolean) => void;
  onPoolDropHover?: (target: { id: number; position: "before" | "after" } | null) => void;
  onQuadrantDragChange?: (heroId: number | null) => void;
  onDragEnd?: () => void;
}

const clampSquareCoord = (v: number) =>
  Math.round(Math.min(95, Math.max(5, v)) * 100) / 100;

type Point = { x: number; y: number };

export function getPolygonVertices(count: number): Point[] {
  if (count === 3) {
    return [
      { x: 50, y: 1.5 },
      { x: 98.5, y: 98.5 },
      { x: 1.5, y: 98.5 },
    ];
  }
  const raw: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    raw.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = 97 / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return raw.map((p) => ({
    x: 50 + (p.x - cx) * scale,
    y: 50 + (p.y - cy) * scale,
  }));
}

export function getPolygonCenter(count: number): Point {
  if (count === 3) return { x: 50, y: 66.17 };
  return { x: 50, y: 50 };
}

function isPointInPolygon(x: number, y: number, vertices: Point[]): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross < 0) return false;
  }
  return true;
}

function clampToPolygonInset(
  x: number,
  y: number,
  vertices: Point[],
  center: Point,
  insetScale = 0.88,
): Point {
  const vx = x - center.x;
  const vy = y - center.y;
  if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001) {
    return { x: center.x, y: center.y };
  }

  let tMin = Infinity;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const dCenter = -((center.x - a.x) * ey - (center.y - a.y) * ex);
    const dRay = vx * ey - vy * ex;
    if (dRay > 0 && dCenter > 0) {
      tMin = Math.min(tMin, dCenter / dRay);
    }
  }

  const tLimit = tMin * insetScale;
  if (Number.isFinite(tLimit) && tLimit < 1) {
    return {
      x: Math.round((center.x + vx * tLimit) * 100) / 100,
      y: Math.round((center.y + vy * tLimit) * 100) / 100,
    };
  }

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

export function clampHeroCoordToShape(x: number, y: number, axisCount: number): Point {
  if (axisCount === 4) {
    return { x: clampSquareCoord(x), y: clampSquareCoord(y) };
  }
  const verts = getPolygonVertices(axisCount);
  const center = getPolygonCenter(axisCount);
  return clampToPolygonInset(x, y, verts, center, 0.88);
}

const TAU = Math.PI * 2;

function getShapeInsetRadius(ux: number, uy: number, axisCount: number): number {
  if (axisCount === 4) {
    const denom = Math.max(Math.abs(ux), Math.abs(uy), 1e-6);
    return 45 / denom;
  }

  const verts = getPolygonVertices(axisCount);
  const center = getPolygonCenter(axisCount);
  let tMin = Infinity;
  const n = verts.length;

  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const dCenter = -((center.x - a.x) * ey - (center.y - a.y) * ex);
    const dRay = ux * ey - uy * ex;
    if (dRay > 0 && dCenter > 0) {
      tMin = Math.min(tMin, dCenter / dRay);
    }
  }

  return Number.isFinite(tMin) ? tMin * 0.88 : 44;
}

export function remapHeroCoordOnAxisChange(
  x: number,
  y: number,
  oldCount: number,
  newCount: number,
  change: { type: "add"; afterIndex: number } | { type: "remove"; index: number },
): Point {
  if (oldCount === newCount || oldCount < MIN_QUADRANT_AXES || newCount < MIN_QUADRANT_AXES) {
    return clampHeroCoordToShape(x, y, newCount);
  }

  const oldCenter = getPolygonCenter(oldCount);
  const newCenter = getPolygonCenter(newCount);
  const dx = x - oldCenter.x;
  const dy = y - oldCenter.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.01) {
    return clampHeroCoordToShape(newCenter.x, newCenter.y, newCount);
  }

  const ux = dx / dist;
  const uy = dy / dist;
  const oldMax = getShapeInsetRadius(ux, uy, oldCount);
  const rNorm = Math.min(1, dist / (oldMax || 1));

  // Ângulo relativo ao topo (-PI/2) no sentido horário [0, 2*PI)
  const relAngle = (((Math.atan2(dy, dx) + Math.PI / 2) % TAU) + TAU) % TAU;
  const oldStep = TAU / oldCount;
  const newStep = TAU / newCount;

  const mapSurvivingIndex = (oldIdx: number): number => {
    if (change.type === "add") {
      return oldIdx <= change.afterIndex ? oldIdx : oldIdx + 1;
    }
    return oldIdx < change.index ? oldIdx : oldIdx - 1;
  };

  let newRelAngle = relAngle;

  if (change.type === "add") {
    const segIdx = Math.floor(relAngle / oldStep) % oldCount;
    const nextIdx = (segIdx + 1) % oldCount;
    const t = (relAngle - segIdx * oldStep) / oldStep;
    const newStart = mapSurvivingIndex(segIdx) * newStep;
    const newEnd = mapSurvivingIndex(nextIdx) * newStep;
    const span = (((newEnd - newStart) % TAU) + TAU) % TAU || newStep;
    newRelAngle = (newStart + t * span) % TAU;
  } else {
    const removed = change.index;
    const prevIdx = (removed - 1 + oldCount) % oldCount;
    const nextIdx = (removed + 1) % oldCount;
    const prevStart = prevIdx * oldStep;
    const distFromPrev = (((relAngle - prevStart) % TAU) + TAU) % TAU;

    if (distFromPrev <= oldStep * 2 + 1e-6) {
      const t = Math.min(1, distFromPrev / (oldStep * 2));
      const newStart = mapSurvivingIndex(prevIdx) * newStep;
      const newEnd = mapSurvivingIndex(nextIdx) * newStep;
      const span = (((newEnd - newStart) % TAU) + TAU) % TAU || newStep;
      newRelAngle = (newStart + t * span) % TAU;
    } else {
      const segIdx = Math.floor(relAngle / oldStep) % oldCount;
      const segNext = (segIdx + 1) % oldCount;
      const t = (relAngle - segIdx * oldStep) / oldStep;
      const newStart = mapSurvivingIndex(segIdx) * newStep;
      const newEnd = mapSurvivingIndex(segNext) * newStep;
      const span = (((newEnd - newStart) % TAU) + TAU) % TAU || newStep;
      newRelAngle = (newStart + t * span) % TAU;
    }
  }

  const absAngle = newRelAngle - Math.PI / 2;
  const nux = Math.cos(absAngle);
  const nuy = Math.sin(absAngle);
  const newMax = getShapeInsetRadius(nux, nuy, newCount);
  const nextX = newCenter.x + nux * rNorm * newMax;
  const nextY = newCenter.y + nuy * rNorm * newMax;

  return clampHeroCoordToShape(nextX, nextY, newCount);
}

function buildRoundedPolygonPath(
  vertices: Point[],
  radius: number,
  scale = 1,
): string {
  const n = vertices.length;
  if (n < 3) return "";
  const corners = vertices.map((curr, i) => {
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];
    const d1x = prev.x - curr.x;
    const d1y = prev.y - curr.y;
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len1 = Math.hypot(d1x, d1y) || 1;
    const len2 = Math.hypot(d2x, d2y) || 1;
    const r = Math.min(radius, len1 * 0.35, len2 * 0.35);
    return {
      cx: curr.x * scale,
      cy: curr.y * scale,
      p1x: (curr.x + (d1x / len1) * r) * scale,
      p1y: (curr.y + (d1y / len1) * r) * scale,
      p2x: (curr.x + (d2x / len2) * r) * scale,
      p2y: (curr.y + (d2y / len2) * r) * scale,
    };
  });

  const parts: string[] = [`M ${corners[0].p2x.toFixed(4)} ${corners[0].p2y.toFixed(4)}`];
  for (let i = 1; i < n; i++) {
    const c = corners[i];
    parts.push(`L ${c.p1x.toFixed(4)} ${c.p1y.toFixed(4)}`);
    parts.push(`Q ${c.cx.toFixed(4)} ${c.cy.toFixed(4)} ${c.p2x.toFixed(4)} ${c.p2y.toFixed(4)}`);
  }
  const c0 = corners[0];
  parts.push(`L ${c0.p1x.toFixed(4)} ${c0.p1y.toFixed(4)}`);
  parts.push(`Q ${c0.cx.toFixed(4)} ${c0.cy.toFixed(4)} ${c0.p2x.toFixed(4)} ${c0.p2y.toFixed(4)} Z`);
  return parts.join(" ");
}

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
  onChangeAxisLabel,
  onAddAxis,
  onRemoveAxis,
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
  const [dropGuide, setDropGuide] = useState<Point | null>(null);
  const justDraggedRef = useRef(false);

  const axes = getQuadrantAxes(quadrant);
  const axisCount = axes.length;
  const isSquare = axisCount === 4;
  const isEditor = mode === "editor";
  const isPreview = mode === "preview";

  const polyVertices = getPolygonVertices(axisCount);
  const polyCenter = getPolygonCenter(axisCount);

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

  const rawPercentFromClient = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  }, []);

  const coordsFromClient = useCallback(
    (clientX: number, clientY: number, requireInside = false): Point | null => {
      const raw = rawPercentFromClient(clientX, clientY);
      if (!raw) return null;
      if (isSquare) {
        if (requireInside && (raw.x < 0 || raw.x > 100 || raw.y < 0 || raw.y > 100)) {
          return null;
        }
        return { x: clampSquareCoord(raw.x), y: clampSquareCoord(raw.y) };
      }
      if (requireInside && !isPointInPolygon(raw.x, raw.y, polyVertices)) {
        return null;
      }
      return clampToPolygonInset(raw.x, raw.y, polyVertices, polyCenter, 0.88);
    },
    [isSquare, polyCenter, polyVertices, rawPercentFromClient],
  );

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
      const insideBox = Boolean(
        rect &&
          ev.clientX >= rect.left &&
          ev.clientX <= rect.right &&
          ev.clientY >= rect.top &&
          ev.clientY <= rect.bottom,
      );

      if (insideBox) {
        setFloatingDrag(null);
        onDragOverPoolChange?.(false);
        onPoolDropHover?.(null);
        const pos = coordsFromClient(ev.clientX, ev.clientY, false);
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
    const pos = coordsFromClient(e.clientX, e.clientY, true);
    if (pos) {
      onPlaceHero?.(selectedHeroId, pos.x, pos.y);
      onSelectHero?.(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!isEditor) return;
    const pos = coordsFromClient(e.clientX, e.clientY, true);
    if (!pos) {
      if (dropGuide !== null) setDropGuide(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropGuide(pos);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropGuide(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!isEditor) return;
    const pos = coordsFromClient(e.clientX, e.clientY, true);
    setDropGuide(null);
    if (!pos) {
      onDragEnd?.();
      return;
    }
    e.preventDefault();
    const rawId = Number(e.dataTransfer.getData("text/plain"));
    const targetHeroId = dragHeroId ?? (Number.isInteger(rawId) && rawId > 0 ? rawId : null);
    if (targetHeroId) {
      onPlaceHero?.(targetHeroId, pos.x, pos.y);
      onSelectHero?.(null);
    }
    onDragEnd?.();
  };

  const rawUid = useId().replace(/:/g, "");
  const polyClipId = `lp-poly-clip-${rawUid}`;
  const polyGradId = `lp-poly-grad-${rawUid}`;
  const cornerRadius = isPreview ? 3.2 : 2.6;
  const svgRoundedPath = buildRoundedPolygonPath(polyVertices, cornerRadius, 1);
  const clipRoundedPath = buildRoundedPolygonPath(polyVertices, cornerRadius, 0.01);

  const labelGapPx = isPreview ? 10 : 12;

 const labelStyleForAxis = (idx: number): CSSProperties => {
    if (idx === 0) {
      const topGap = isPreview ? 10 : isEditor ? 44 : 12;
      return {
        left: "50%",
        top: `calc(0% - ${topGap}px)`,
        transform: "translate(-50%, -100%)",
      };
    }

    if (isSquare) {
      const sideGap = isPreview ? 10 : 12;
      if (idx === 1) {
        return {
          left: `calc(100% + ${sideGap}px)`,
          top: "50%",
          transform: "translate(0%, -50%)",
        };
      }
      if (idx === 2) {
        return {
          left: "50%",
          top: `calc(100% + ${sideGap}px)`,
          transform: "translate(-50%, 0%)",
        };
      }
      return {
        left: `calc(0% - ${sideGap}px)`,
        top: "50%",
        transform: "translate(-100%, -50%)",
      };
    }

    const v = polyVertices[idx];
    const dx = (v.x - polyCenter.x) / 48.5;
    const dy = (v.y - polyCenter.y) / 48.5;
    const clampedDx = Math.max(-1, Math.min(1, dx));
    const clampedDy = Math.max(-1, Math.min(1, dy));
    const tx = -50 * (1 - clampedDx);
    const ty = -50 * (1 - clampedDy);
    const gapY = isEditor && clampedDy < -0.25 ? 40 : labelGapPx;

    return {
      left: `calc(${v.x.toFixed(2)}% + ${(clampedDx * labelGapPx).toFixed(1)}px)`,
      top: `calc(${v.y.toFixed(2)}% + ${(clampedDy * gapY).toFixed(1)}px)`,
      transform: `translate(${tx.toFixed(1)}%, ${ty.toFixed(1)}%)`,
    };
  };

  const squareSurfaceStyle: CSSProperties = {
    backgroundImage:
      "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.06), transparent 68%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: isPreview
      ? "100% 100%, 16.666% 16.666%, 16.666% 16.666%"
      : "100% 100%, 12.5% 12.5%, 12.5% 12.5%",
  };

  const polySurfaceStyle: CSSProperties = {
    backgroundImage: `radial-gradient(circle at ${polyCenter.x}% ${polyCenter.y}%, rgba(245,158,11,0.06), transparent 68%)`,
  };

  const polyGridScales = isPreview
    ? [0.33, 0.66]
    : axisCount === 3
      ? [0.34, 0.67]
      : [0.25, 0.5, 0.75];

  const polyGridPaths = !isSquare
    ? polyGridScales.map((scale) => {
        const scaled = polyVertices.map((v) => ({
          x: polyCenter.x + (v.x - polyCenter.x) * scale,
          y: polyCenter.y + (v.y - polyCenter.y) * scale,
        }));
        return buildRoundedPolygonPath(scaled, cornerRadius * scale, 1);
      })
    : [];

  const boardContent = (
    <div
      ref={boardRef}
      onClick={handleBoardClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative select-none ${
        isPreview
          ? "aspect-square h-48 sm:h-64 lg:h-56 xl:h-64"
          : "mx-auto aspect-square w-full max-w-[680px]"
      } ${isEditor && selectedHeroId !== null ? "cursor-crosshair" : ""}`}
    >
     {/* Fundo do polígono (3 e 5–10 pontas) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          isSquare ? "opacity-0" : "opacity-100"
        }`}
      >
        <svg className="pointer-events-none absolute h-0 w-0">
          <defs>
            <clipPath id={polyClipId} clipPathUnits="objectBoundingBox">
              <path d={clipRoundedPath} />
            </clipPath>
          </defs>
        </svg>
        <div
          className="pointer-events-none absolute inset-0"
          style={
            isPreview
              ? undefined
              : { filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.9))" }
          }
        >
          <div
            className="absolute inset-0 bg-[#070a09]"
            style={{ ...polySurfaceStyle, clipPath: `url(#${polyClipId})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              clipPath: `url(#${polyClipId})`,
              background: `radial-gradient(circle at ${polyCenter.x}% ${polyCenter.y}%, transparent 55%, rgba(0,0,0,0.55) 100%)`,
            }}
          />
        </div>
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <radialGradient
              id={polyGradId}
              gradientUnits="userSpaceOnUse"
              cx={polyCenter.x}
              cy={polyCenter.y}
              r={48}
            >
              <stop offset="0%" stopColor="#f4efe6" stopOpacity={1} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
            </radialGradient>
          </defs>
          {polyGridPaths.map((d, i) => (
            <path
              key={`pg-${i}`}
              d={d}
              fill="none"
              stroke={isPreview ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.035)"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g opacity={isPreview ? 0.24 : 0.15}>
            {polyVertices.map((v, i) => {
              const x2 = polyCenter.x + (v.x - polyCenter.x) * 0.93;
              const y2 = polyCenter.y + (v.y - polyCenter.y) * 0.93;
              return (
                <line
                  key={i}
                  x1={polyCenter.x}
                  y1={polyCenter.y}
                  x2={x2}
                  y2={y2}
                  stroke={`url(#${polyGradId})`}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
          <path
            d={svgRoundedPath}
            fill="none"
            stroke={isPreview ? "rgba(82, 82, 91, 0.75)" : "rgba(38, 38, 38, 0.9)"}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

     {/* Fundo do quadrado clássico (4 pontas) */}
      <div
        aria-hidden
        style={squareSurfaceStyle}
        className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#070a09] ${
          isSquare ? "opacity-100" : "opacity-0"
        } ${
          isPreview
            ? "rounded-xl border border-neutral-800/80 shadow-inner"
            : "rounded-2xl border border-neutral-800/90 shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-white/[0.03] via-[#f4efe6]/15 to-white/[0.03] ${
            isPreview ? "inset-x-3" : "inset-x-5"
          }`}
        />
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-white/[0.03] via-[#f4efe6]/15 to-white/[0.03] ${
            isPreview ? "inset-y-3" : "inset-y-5"
          }`}
        />
      </div>

     {/* Rótulos das pontas */}
      {axes.map((value, idx) => {
        const posStyle = labelStyleForAxis(idx);

        if (isPreview) {
          return (
            <span
              key={idx}
              style={posStyle}
              className="pointer-events-none absolute z-20 max-w-[115px] sm:max-w-[135px] line-clamp-2 whitespace-pre-line text-center leading-tight rounded border border-white/12 bg-[#070a09]/92 px-2 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider text-[#f4efe6]/95 shadow"
            >
              {value}
            </span>
          );
        }

        if (!isEditor) {
          return (
            <div
              key={idx}
              style={posStyle}
              className="pointer-events-none absolute z-20 max-w-[160px] sm:max-w-[215px] rounded-[5px] border border-white/15 bg-[#090d0c]/92 px-2.5 py-1 text-center shadow-[0_6px_18px_rgba(0,0,0,0.85)] backdrop-blur-sm"
            >
              <span className="font-deadlock block whitespace-pre-line leading-tight text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                {value}
              </span>
            </div>
          );
        }

        const axisLines = value.split("\n");
        const maxLineLen = Math.max(...axisLines.map((l) => l.length), 0);

       return (
          <div
            key={idx}
            style={posStyle}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20"
          >
            <div className="group/axis relative flex items-center rounded-[5px] border border-white/15 bg-[#090d0c]/92 px-2 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.85)] backdrop-blur-sm hover:border-amber-500/50 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/40">
              <textarea
                maxLength={35}
                rows={axisLines.length > 1 ? 2 : 1}
                value={value}
                aria-label={`Editar rótulo da ponta ${idx + 1}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && value.includes("\n")) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const unified = e.target.value.replace(/\r\n?/g, "\n");
                  const parts = unified.split("\n");
                  const clamped =
                    parts.length <= 2
                      ? unified
                      : `${parts[0]}\n${parts.slice(1).join(" ")}`.slice(0, 35);
                  onChangeAxisLabel?.(idx, clamped);
                }}
                style={{
                  width: `${Math.min(24, Math.max(8, maxLineLen + 1))}ch`,
                }}
                className="font-deadlock max-w-[140px] sm:max-w-[205px] resize-none overflow-hidden bg-transparent text-center text-[10px] sm:text-xs font-black uppercase leading-tight tracking-wider text-[#f4efe6] outline-none placeholder:text-neutral-600"
              />
              {(onAddAxis || onRemoveAxis) && (
                <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-[5px] border border-neutral-800/90 bg-neutral-950/95 p-0.5 shadow-md">
                 {onAddAxis && (
                    <button
                      type="button"
                      title="Adicionar nova ponta"
                      aria-label={`Adicionar ponta após ${idx + 1}`}
                      disabled={axisCount >= MAX_QUADRANT_AXES}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAxis(idx);
                      }}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-emerald-950/60 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </button>
                  )}
                  {onRemoveAxis && (
                    <button
                      type="button"
                      title="Remover esta ponta"
                      aria-label={`Remover ponta ${idx + 1}`}
                      disabled={axisCount <= MIN_QUADRANT_AXES}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAxis(idx);
                      }}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-rose-950/60 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

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
                isPreview ? "h-8 w-8 sm:h-9 sm:w-9" : "h-11 w-11 sm:h-14 sm:w-14"
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

  if (isPreview) {
    return (
      <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-800/40 bg-neutral-950/40 px-12 py-10 sm:px-20 lg:px-14 xl:px-20 sm:py-11">
        {boardContent}
      </div>
    );
  }

  return (
    <div className="py-16 sm:py-20 px-20 sm:px-36 md:px-44">
      {boardContent}
    </div>
  );
}