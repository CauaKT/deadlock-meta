"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

interface SelectHero {
  id: number;
  name: string;
  image: string;
  head?: string;
  playable: boolean;
  rgb?: [number, number, number];
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function FavoriteHeroSelect({
  heroes,
  value,
  onChange,
}: {
  heroes: SelectHero[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const released = useMemo(() => heroes.filter((h) => h.playable), [heroes]);
  const visible = useMemo(() => {
    const q = norm(query.trim());
    return q ? released.filter((h) => norm(h.name).includes(q)) : released;
  }, [released, query]);
  const selected = heroes.find((h) => h.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="space-y-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-black/60 px-3 py-2.5 text-left transition-colors ${
          open ? "border-amber-500" : "border-neutral-800 hover:border-neutral-600"
        }`}
      >
        {selected?.head || selected?.image ? (
          <img src={selected.head || selected.image} alt="" className="h-9 w-9 shrink-0 object-contain" />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-lg border border-dashed border-neutral-700" />
        )}
        <span className={`flex-1 truncate text-sm font-semibold ${selected ? "text-[#f4efe6]" : "text-neutral-500"}`}>
          {selected ? selected.name : "Selecione um herói..."}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-black/40 p-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar herói..."
              aria-label="Buscar herói"
              className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
            />
            {value != null && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="shrink-0 cursor-pointer rounded-lg border border-neutral-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-500">Nenhum herói encontrado.</p>
          ) : (
            <div
              role="listbox"
              className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin] sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
            >
              {visible.map((h) => {
                const active = h.id === value;
                const color = h.rgb ? `rgb(${h.rgb.join(",")})` : "#f59e0b";
                return (
                  <button
                    key={h.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(h.id)}
                    style={{ "--hc": color } as CSSProperties}
                    className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border-2 bg-neutral-900 transition-all ${
                      active ? "border-[var(--hc)] shadow-[0_0_12px_var(--hc)]" : "border-neutral-800 hover:border-[var(--hc)]"
                    }`}
                  >
                    {h.image && <img src={h.image} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-0.5 pb-0.5 pt-4 text-center font-deadlock text-[8px] font-black uppercase tracking-wide text-[#f4efe6]">
                      {h.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}