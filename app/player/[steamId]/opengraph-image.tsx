/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { fetchHeroesAssets } from "@/lib/deadlock";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface PlayerSummaryOg {
  accountId: string;
  personaName: string | null;
  matches: number;
  wins: number;
  winRate: number;
  kda: number;
  topHeroes?: Array<{ heroId: number; matches: number; winRate: number }>;
}

export default async function PlayerOgImage({
  params,
}: {
  params: Promise<{ steamId: string }>;
}) {
  const { steamId } = await params;
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  const [summary, heroesMap] = await Promise.all([
    fetch(`${base}/external-data/player/${encodeURIComponent(steamId)}/summary`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
      .then((r) => (r.ok ? (r.json() as Promise<PlayerSummaryOg>) : null))
      .catch(() => null),
    fetchHeroesAssets().catch(() => ({} as Record<number, { name?: string; images?: { icon_hero_card?: string } }>)),
  ]);

  const topHeroId = summary?.topHeroes?.[0]?.heroId;
  const topHero = topHeroId ? heroesMap[topHeroId] : null;

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
          background: "linear-gradient(135deg, #070807 0%, #0e2428 60%, #16110a 100%)",
          color: "#f4efe6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: "#f59e0b" }}>
          LOCKPRO • TRACKER DE JOGADOR
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {topHero?.images?.icon_hero_card && (
            <img
              src={topHero.images.icon_hero_card}
              alt=""
              width={170}
              height={230}
              style={{ borderRadius: 12, objectFit: "cover", border: "2px solid #3897a1" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 58, fontWeight: 900 }}>
              {summary?.personaName || `Jogador #${steamId}`}
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 30, fontWeight: 800 }}>
              <span style={{ color: "#34d399" }}>
                WR: {summary ? `${summary.winRate.toFixed(1)}%` : "—"}
              </span>
              <span style={{ color: "#5ce1b6" }}>
                KDA: {summary ? summary.kda.toFixed(2) : "—"}
              </span>
              <span style={{ color: "#d1d5db" }}>
                Partidas: {summary ? summary.matches : "—"}
              </span>
            </div>
            {topHero?.name && (
              <div style={{ fontSize: 24, color: "#9ca3af" }}>Mais jogado: {topHero.name}</div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#9ca3af" }}>lockpro.vercel.app</div>
      </div>
    ),
    size,
  );
}