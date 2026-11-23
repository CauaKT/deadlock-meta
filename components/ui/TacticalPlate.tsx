import type { ReactNode } from "react";

export const TACTICAL_PLATE_CLASS =
  "rounded-[3px] border border-black/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]";

export function TacticalSection({
  accent,
  className = "",
  children,
}: {
  accent: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`dl-noise dl-halftone relative overflow-hidden rounded-[3px_8px_3px_6px] border-2 p-5 sm:p-6 space-y-5 ${className}`}
      style={{
        borderColor: `color-mix(in srgb, ${accent} 45%, #1b2621)`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 20%, #0c1110), #0c1110 70%)`,
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.65), 0 10px 28px rgba(0,0,0,0.85)",
      }}
    >
      {children}
    </div>
  );
}