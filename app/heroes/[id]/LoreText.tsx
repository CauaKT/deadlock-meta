"use client";
import { useEffect, useRef, useState } from "react";

// 6 linhas (text-sm + leading-relaxed = 22.75px por linha). Para mudar, troque o 6.
const COLLAPSED_PX = 140;

export default function LoreText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [fullHeight, setFullHeight] = useState(COLLAPSED_PX);
  const innerRef = useRef<HTMLDivElement>(null);

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
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[height] duration-500 ease-in-out"
        style={{ height }}
      >
        <div ref={innerRef} className="space-y-3 text-sm leading-relaxed text-neutral-300">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {needsToggle && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0c120f] to-transparent transition-opacity duration-300 ${
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
          className="mt-3.5 font-deadlock text-xs font-extrabold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          {open ? "- Recolher texto ↑" : "+ Ler mais da história"}
        </button>
      )}
    </div>
  );
}