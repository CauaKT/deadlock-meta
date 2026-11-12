"use client";
// app/profile/ImageCropModal.tsx
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  title: string;
  shape: "circle" | "rect";
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  maxChars?: number;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;

type Size = { width: number; height: number };

function clampPan(x: number, y: number, zoom: number, nat: Size, boxW: number, boxH: number) {
  if (!nat.width || !nat.height) return { x: 0, y: 0 };
  const scale = Math.max(boxW / nat.width, boxH / nat.height) * zoom;
  const maxX = Math.max(0, (nat.width * scale - boxW) / 2);
  const maxY = Math.max(0, (nat.height * scale - boxH) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
}

export default function ImageCropModal({
  src,
  title,
  shape,
  aspect,
  outputWidth,
  outputHeight,
  maxChars,
  onConfirm,
  onCancel,
}: Props) {
  const baseW = shape === "circle" ? 300 : 480;
  const [boxW] = useState(() => Math.min(baseW, window.innerWidth - 96));
  const boxH = boxW / aspect;

  const [nat, setNat] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => setError("Não foi possível carregar essa imagem.");
    img.src = src;
  }, [src]);

  // Wheel não-passivo para dar zoom sem rolar a página
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const offX = e.clientX - rect.left - rect.width / 2;
      const offY = e.clientY - rect.top - rect.height / 2;
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setView((v) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((v.zoom + delta).toFixed(2))));
        if (zoom === v.zoom) return v;
        const ratio = zoom / v.zoom;
        return { zoom, ...clampPan(offX - ratio * (offX - v.x), offY - ratio * (offY - v.y), zoom, nat, boxW, boxH) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    document.body.style.overflow = "hidden";
    return () => {
      el.removeEventListener("wheel", onWheel);
      document.body.style.overflow = "";
    };
  }, [nat, boxW, boxH]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX - view.x, y: e.clientY - view.y };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const nx = e.clientX - d.x;
    const ny = e.clientY - d.y;
    setView((v) => ({ ...v, ...clampPan(nx, ny, v.zoom, nat, boxW, boxH) }));
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img || !nat.width) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setError("Não foi possível processar essa imagem.");
    ctx.fillStyle = "#0a0d0c";
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    const scale = Math.max(boxW / nat.width, boxH / nat.height) * view.zoom;
    const sw = boxW / scale;
    const sh = boxH / scale;
    const sx = nat.width / 2 - view.x / scale - sw / 2;
    const sy = nat.height / 2 - view.y / scale - sh / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    let quality = 0.9;
    let out = canvas.toDataURL("image/jpeg", quality);
    if (maxChars) {
      while (out.length > maxChars && quality > 0.4) {
        quality -= 0.1;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      if (out.length > maxChars) return setError("A imagem ficou grande demais. Dê mais zoom ou use outra imagem.");
    }
    onConfirm(out);
  };

  const baseScale = nat.width ? Math.max(boxW / nat.width, boxH / nat.height) : 1;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ajustar ${title}`}
        className={`w-full space-y-6 rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] ${
          shape === "circle" ? "max-w-md" : "max-w-xl"
        }`}
      >
        <div className="space-y-1 text-center">
          <h3 className="font-deadlock text-2xl font-black uppercase tracking-wider text-[#f4efe6]">
            Ajustar <span className="text-amber-500">{title}</span>
          </h3>
          <p className="text-xs text-neutral-400">Arraste para posicionar e use o scroll ou a barra para dar zoom.</p>
        </div>

        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ width: boxW, height: boxH }}
          className={`relative mx-auto touch-none select-none overflow-hidden overscroll-none border-2 border-neutral-800 bg-black/95 ${
            shape === "circle" ? "rounded-2xl" : "rounded-lg"
          } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {nat.width > 0 && (
            <img
              ref={imgRef}
              src={src}
              alt="Para recortar"
              draggable={false}
              style={{
                left: "50%",
                top: "50%",
                width: nat.width * baseScale,
                height: nat.height * baseScale,
                transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.zoom})`,
                transformOrigin: "center center",
              }}
              className="pointer-events-none absolute max-h-none max-w-none"
            />
          )}
          {shape === "circle" && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.75),0_0_16px_rgba(245,158,11,0.5)]"
            />
          )}
        </div>

        <div className="space-y-1.5 px-2">
          <div className="flex justify-between font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-400">
            <span>Zoom</span>
            <span className="text-amber-400">{Math.round(view.zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.02"
            value={view.zoom}
            onChange={(e) => {
              const zoom = Number(e.target.value);
              setView((v) => ({ zoom, ...clampPan(v.x, v.y, zoom, nat, boxW, boxH) }));
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-amber-500"
          />
        </div>

        {error && <p className="text-center text-xs text-rose-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/2 cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!nat.width}
            className="w-1/2 cursor-pointer rounded-xl border border-amber-400 bg-amber-500 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}