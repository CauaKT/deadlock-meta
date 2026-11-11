"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  patches: { id: string; label: string }[];
  selected: string;
}

export default function PatchSelect({ patches, selected }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPatch = patches.find((p) => p.id === selected) ?? patches[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectPatch = (id: string) => {
    setOpen(false);
    if (id === selected) return;
    startTransition(() => router.push(`/?patch=${id}`));
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-start md:items-end gap-1.5 select-none">
      {/* Barra de progresso discreta no topo da tela durante a troca de patch */}
      {isPending && (
        <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden bg-amber-500/10">
          <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      )}

      {/* Rótulo superior alinhado com a tipografia do Deadlock */}
      <div className="flex items-center gap-1.5">
        <span className="font-deadlock text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] text-[#8b9a96]">
          Dados do Patch
        </span>
        <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
      </div>

      {/* Botão Gatilho Estilizado no padrão Deadlock */}
      <button
        type="button"
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`group relative flex min-w-[280px] sm:min-w-[340px] items-center justify-center rounded-[5px] border bg-[#0a0e0d] shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 outline-none cursor-pointer ${
          open
            ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50"
            : isPending
              ? "border-amber-500/80 ring-1 ring-amber-500/40 opacity-80"
              : "border-neutral-700/80 hover:border-amber-500/70 hover:shadow-[0_0_18px_rgba(245,158,11,0.22)] focus-visible:border-amber-500"
        }`}
      >
        {/* Ícone de Relógio/Histórico de Patch à esquerda */}
        <div className="pointer-events-none absolute left-3.5 flex items-center text-amber-500/80 transition-colors group-hover:text-amber-400">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v3.8l2.5 1.5" />
          </svg>
        </div>

        {/* Texto do Patch Centralizado */}
        <span className="font-deadlock w-full py-2.5 pl-10 pr-10 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-[#f4efe6] truncate">
          {currentPatch?.label}
        </span>

        {/* Indicador à direita: Spinner ou Chevron animado com rotação */}
        <div className="pointer-events-none absolute right-3.5 flex items-center">
          {isPending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
                open ? "rotate-180 text-amber-400" : "group-hover:translate-y-0.5 group-hover:text-amber-400"
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          )}
        </div>
      </button>

      {/* Menu Dropdown com Animação de Escala, Deslize e Opacidade */}
      <div
        role="listbox"
        className={`absolute right-0 top-full z-50 mt-2 w-full sm:min-w-[340px] origin-top overflow-hidden rounded-xl border border-neutral-800/90 bg-neutral-950/95 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="lp-scroll max-h-[340px] overflow-y-auto p-1.5 pr-2 space-y-1">
          {patches.map((p) => {
            const isSelected = p.id === selected;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectPatch(p.id)}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold"
                    : "text-neutral-300 hover:bg-neutral-800/70 hover:text-[#f4efe6] border border-transparent"
                }`}
              >
                <span className="font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider truncate">
                  {p.label}
                </span>

                {isSelected && (
                  <span className="ml-2 flex h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}