"use client";
import { useEffect, useRef, useState } from "react";

// 6 linhas (text-sm + leading-relaxed = 22.75px por linha). Para mudar, troque o 6.
const COLLAPSED_PX = 6 * 22.75;

export default function LoreText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [fullHeight, setFullHeight] = useState(COLLAPSED_PX);
  const innerRef = useRef<HTMLParagraphElement>(null);

  // Mede a altura real do texto completo (e remede se a tela mudar de tamanho)
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setFullHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const height = open ? Math.max(fullHeight, COLLAPSED_PX) : COLLAPSED_PX;
  const needsToggle = fullHeight > COLLAPSED_PX + 1;

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[height] duration-500 ease-in-out"
        style={{ height }}
      >
        <p ref={innerRef} className="text-sm text-neutral-300 leading-relaxed">
          {text}
        </p>
        {/* Degradê que some quando abre (e não aparece se o texto é curto) */}
        {needsToggle && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0d1411] to-transparent transition-opacity duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
        )}
      </div>

      {needsToggle && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-2 text-xs font-extrabold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
        >
          {open ? "- Recolher texto ↑" : "+ Ler mais da história"}
        </button>
      )}
    </div>
  );
}