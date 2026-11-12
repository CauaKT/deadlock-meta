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
}

export default function ProfileBanner({
  hero,
  customImage,
}: {
  hero?: BannerHero | null;
  customImage?: string | null;
}) {
  if (customImage) {
    return <img src={customImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />;
  }
  if (!hero) return null;

  return (
    <div
      aria-hidden
      className="pf-smoke dl-noise absolute inset-0 overflow-hidden"
      style={
        {
          "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11",
          background: `radial-gradient(ellipse at 80% 45%, color-mix(in srgb, ${hero.tagBg} 35%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, ${hero.tagBg} 18%, #0c1110), #0c1110 70%)`,
        } as CSSProperties
      }
    >
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
          className="h-full w-full object-cover object-top"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 40%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 40%)",
          }}
        />
      </div>
    </div>
  );
}