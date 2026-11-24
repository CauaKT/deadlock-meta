"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_TIER_METRIC, type TierMetricOption } from "@/lib/data/config";

interface Props {
  metrics: TierMetricOption[];
  selected: string;
}

export default function MetricSelect({ metrics, selected }: Props) {
  const pathname = usePathname() || "/tier-list";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMetric = metrics.find((m) => m.id === selected) ?? metrics[0];

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

  const selectMetric = (id: string) => {
    setOpen(false);
    if (id === selected) return;
    const params = new URLSearchParams(searchParams.toString());
    if (id === DEFAULT_TIER_METRIC) {
      params.delete("metric");
    } else {
      params.set("metric", id);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-start md:items-end gap-1.5 select-none">
      {isPending && (
        <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden bg-amber-500/10">
          <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      )}

      <button
        type="button"
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`group relative flex min-w-[128px] items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-[5px] border bg-[#0a0e0d] shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 outline-none cursor-pointer ${
          open
            ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50"
            : isPending
              ? "border-amber-500/80 ring-1 ring-amber-500/40 opacity-80"
              : "border-neutral-700/80 hover:border-amber-500/70 hover:shadow-[0_0_18px_rgba(245,158,11,0.22)] focus-visible:border-amber-500"
        }`}
      >
        <span className="font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-[#f4efe6] truncate">
          {currentMetric?.label}
        </span>

        <div className="pointer-events-none flex shrink-0 items-center">
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

      <div
        role="listbox"
        className={`absolute right-0 top-full z-50 mt-2 min-w-full w-max max-w-[calc(100vw-2rem)] origin-top overflow-hidden rounded-[6px] border border-neutral-800/90 bg-neutral-950/95 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="lp-scroll max-h-[340px] overflow-y-auto p-1.5 space-y-1">
          {metrics.map((m) => {
            const isSelected = m.id === selected;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectMetric(m.id)}
                className={`group flex w-full items-center justify-center rounded-[4px] px-3 py-2 text-center transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold"
                    : "text-neutral-300 hover:bg-neutral-800/70 hover:text-[#f4efe6] border border-transparent"
                }`}
              >
                <span className="font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider whitespace-nowrap">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}