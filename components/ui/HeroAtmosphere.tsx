import type { CSSProperties } from "react";

export default function HeroAtmosphere({ rgb }: { rgb: [number, number, number] | null }) {
  if (!rgb) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ "--atm": rgb.join(" ") } as CSSProperties}
    >
      <div className="hero-glow absolute inset-x-0 top-0 h-[720px]" />
      <div className="hero-smoke hero-smoke-a" />
      <div className="hero-smoke hero-smoke-b" />
      <div className="hero-smoke hero-smoke-c" />
    </div>
  );
}