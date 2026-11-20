import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface MatchOg {
  matchId: number;
  durationSec: number;
  winningTeam: number;
  players: Array<{ team: number; kills: number; deaths: number; assists: number }>;
}

export default async function MatchOgImage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  const match = await fetch(`${base}/external-data/matches/${encodeURIComponent(matchId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  })
    .then((r) => (r.ok ? (r.json() as Promise<MatchOg>) : null))
    .catch(() => null);

  const mins = match ? Math.floor(match.durationSec / 60) : 0;
  const secs = match ? String(match.durationSec % 60).padStart(2, "0") : "00";
  const winner = match ? (match.winningTeam === 0 ? "The Amber Hand" : "The Sapphire Flame") : "—";

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
          background: "linear-gradient(135deg, #070807 0%, #1c140c 55%, #0c1f24 100%)",
          color: "#f4efe6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: "#f59e0b" }}>
          LOCKPRO • RELATÓRIO DE PARTIDA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 900 }}>Partida #{matchId}</div>
          <div style={{ display: "flex", gap: 36, fontSize: 32, fontWeight: 800 }}>
            <span style={{ color: "#34d399" }}>Vencedor: {winner}</span>
            {match && <span style={{ color: "#5ce1b6" }}>Duração: {mins}:{secs}</span>}
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#9ca3af" }}>lockpro.vercel.app</div>
      </div>
    ),
    size,
  );
}