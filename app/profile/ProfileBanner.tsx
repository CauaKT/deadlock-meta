// app/profile/ProfileBanner.tsx
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

export type BannerMode = "default" | "hero" | "custom";

export interface BannerHero {
  id: number;
  name: string;
  image: string;
  art: string;
  tagBg: string;
  playable: boolean;
  rgb?: [number, number, number];
  tagText?: string;
  tags?: string[];
  nameSvg?: string;
}

const TAG_ROTATIONS = ["-rotate-[3deg]", "rotate-[3deg]", "-rotate-[2deg]"];

export default function ProfileBanner({
  hero,
  customImage,
  compact = false,
}: {
  hero?: BannerHero | null;
  customImage?: string | null;
  compact?: boolean;
}) {
  if (customImage) {
    return <img src={customImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />;
  }
  if (!hero) return null;

  const rgb = hero.rgb ? hero.rgb.join(" ") : "245 158 11";
  const tags = hero.tags ?? [];

  return (
    <div
      aria-hidden
      className="pf-smoke dl-noise absolute inset-0 overflow-hidden"
      style={
        {
          "--hc": rgb,
          "--atm": rgb,
          background: `radial-gradient(ellipse at 80% 45%, color-mix(in srgb, ${hero.tagBg} 35%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, ${hero.tagBg} 18%, #0c1110), #0c1110 70%)`,
        } as CSSProperties
      }
    >
      <div className="hero-glow absolute inset-0" />
      <i className="absolute hero-tip-puff hero-tip-puff-a" />
      <i className="absolute hero-tip-puff hero-tip-puff-b" />
      <i className="absolute hero-tip-puff hero-tip-puff-c" />
      <div className="absolute inset-y-0 right-0 w-full md:w-1/2">
        <img
          src={hero.art}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="h-full w-full object-contain object-right-bottom"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 40%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 40%)",
          }}
        />
      </div>
      {!compact && (hero.nameSvg || tags.length > 0) && (
        <div className="pointer-events-none absolute bottom-6 right-6 z-[5] hidden max-w-[44%] flex-col items-end gap-2 md:flex">
          {hero.nameSvg && (
            <img
              src={hero.nameSvg}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="h-16 w-44 max-w-full object-contain object-right drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] lg:h-24 lg:w-60"
            />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                style={{ backgroundColor: hero.tagBg, color: hero.tagText ?? "#0b0c0c" }}
                className={`inline-block -skew-x-6 px-3 py-1 font-deadlock text-[11px] font-black uppercase tracking-wider shadow-lg ${
                  TAG_ROTATIONS[i % TAG_ROTATIONS.length]
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}