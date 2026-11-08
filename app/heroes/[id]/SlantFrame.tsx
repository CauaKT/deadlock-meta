import type { ReactNode } from "react";

const SLANT = "14px";
const CLIPS = {
  narrowTop: `polygon(${SLANT} 0, calc(100% - ${SLANT}) 0, 100% 100%, 0 100%)`,
  slantLeft: `polygon(0 0, 100% 0, 100% 100%, ${SLANT} 100%)`,
  slantRight: `polygon(0 0, 100% 0, calc(100% - ${SLANT}) 100%, 0 100%)`,
} as const;
export type Slant = keyof typeof CLIPS;

// A borda é a camada de baixo; o clip-path corta as duas, então ela acompanha a inclinação
export default function SlantFrame({
  shape,
  border,
  background,
  className = "",
  children,
}: {
  shape: Slant;
  border: string;
  background: string;
  className?: string;
  children: ReactNode;
}) {
  const clipPath = CLIPS[shape];
  return (
    <div className="flex" style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.65))" }}>
      <div className="flex flex-1 p-0.5" style={{ clipPath, backgroundColor: border }}>
        <div
          className={`dl-noise dl-halftone relative flex-1 overflow-hidden p-5 ${className}`}
          style={{ clipPath, background, boxShadow: "inset 0 0 40px rgba(0,0,0,0.55)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}