"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function NavTierDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTierActive = pathname === "/" || pathname === "/tier-maker";

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className={`inline-flex items-center gap-1.5 py-1 text-sm font-semibold transition-colors ${
          isTierActive ? "text-amber-400 font-bold" : "text-[#f4efe6] hover:text-amber-400"
        }`}
      >
        <span>Tier List</span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-3 w-3 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-400" : "text-neutral-400"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </Link>

      {/* Menu suspenso com animação de fade, escala e delay de transição */}
      <div
        className={`absolute left-0 top-full pt-2 z-50 transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-64 rounded-xl border border-neutral-800/90 bg-neutral-950/95 p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md space-y-1">
          {/* Opção 1: Tier List do Meta */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
              pathname === "/"
                ? "bg-amber-500/15 border border-amber-500/40"
                : "hover:bg-neutral-800/60 border border-transparent"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-black/50 text-amber-400">
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5V5h12V2.5a.5.5 0 0 0-.5-.5h-11zM2 6v3.5h12V6H2zm0 4.5v3a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-3H2z" />
              </svg>
            </div>
            <div>
              <span className="font-deadlock block text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                Tier List do Meta
              </span>
              <span className="block text-[11px] font-medium leading-tight text-neutral-400 mt-0.5">
                Classificação oficial baseada no win rate do patch
              </span>
            </div>
          </Link>

          {/* Opção 2: TierMaker */}
          <Link
            href="/tier-maker"
            onClick={() => setOpen(false)}
            className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
              pathname === "/tier-maker"
                ? "bg-amber-500/15 border border-amber-500/40"
                : "hover:bg-neutral-800/60 border border-transparent"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400">
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6zM3 6h10M3 10h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-deadlock block text-xs font-black uppercase tracking-wider text-[#f4efe6]">
                  TierMaker
                </span>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                  Novo
                </span>
              </div>
              <span className="block text-[11px] font-medium leading-tight text-neutral-400 mt-0.5">
                Monte, personalize e compartilhe a sua tier list
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}