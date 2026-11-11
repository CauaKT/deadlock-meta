// app/loading.tsx
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="lp-load max-w-6xl mx-auto px-4 py-10 md:px-10 min-h-[calc(100svh-57px)]"
    >
      <div className="fixed top-0 inset-x-0 z-40 h-0.5 overflow-hidden bg-amber-500/10">
        <div className="lp-bar h-full w-1/3 bg-amber-500" />
      </div>
      <span className="sr-only">Carregando…</span>
      <div className="flex justify-center mb-10">
        <div className="lp-spin">
          <img src="/logo.png" alt="" className="lp-logo h-14 w-14 object-contain" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="lp-shimmer lp-card-in aspect-[2/3] rounded-md"
            style={{ "--d": `${i * 90}ms` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}