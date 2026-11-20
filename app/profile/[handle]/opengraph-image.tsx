/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getPublicProfileResult } from "@/lib/backend/server";
import { fetchHeroesAssets } from "@/lib/deadlock";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProfileOgImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [res, heroesMap] = await Promise.all([
    getPublicProfileResult(handle),
    fetchHeroesAssets().catch(() => ({} as Record<number, { name?: string; images?: { icon_hero_card?: string } }>)),
  ]);

  const profile = res.profile;
  const hero = profile?.favorite_hero_id ? heroesMap[profile.favorite_hero_id] : null;
  const heroImg = hero?.images?.icon_hero_card ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #070807 0%, #102022 60%, #1e160c 100%)",
          color: "#f4efe6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: "#f59e0b" }}>
            LOCKPRO • PERFIL
          </div>
          <div style={{ fontSize: 22, color: "#9ca3af" }}>@{profile?.handle || handle}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {heroImg && (
            <img
              src={heroImg}
              alt=""
              width={180}
              height={240}
              style={{ borderRadius: 12, objectFit: "cover", border: "2px solid #f59e0b" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>
              {profile?.username || `@${handle}`}
            </div>
            {hero?.name && (
              <div style={{ fontSize: 28, fontWeight: 700, color: "#5ce1b6" }}>
                Main: {hero.name}
              </div>
            )}
            {profile?.bio && (
              <div style={{ fontSize: 22, color: "#d1d5db", lineHeight: 1.35 }}>
                {profile.bio.slice(0, 120)}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#9ca3af" }}>lockpro.vercel.app</div>
      </div>
    ),
    size,
  );
}