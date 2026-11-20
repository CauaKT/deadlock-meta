import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getServerAuthUser } from "@/lib/backend/server";
import TournamentsClient, {
  type PickemLeaderEntry,
  type TournamentItem,
} from "./TournamentsClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Torneios & Pick'Em",
  description: "Acompanhe campeonatos de Deadlock, chaveamentos e dê seus palpites no Pick'Em da comunidade.",
};

export default async function TournamentsPage() {
  await connection();
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  const cookieStore = await cookies();
  const token = cookieStore.get("lockpro_session")?.value;
  const headers: Record<string, string> = token ? { Cookie: `lockpro_session=${token}` } : {};

  const [user, tournaments, leaderboard] = await Promise.all([
    getServerAuthUser(),
    fetch(`${base}/tournaments`, { headers, cache: "no-store", signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? (r.json() as Promise<TournamentItem[]>) : []))
      .catch(() => [] as TournamentItem[]),
    fetch(`${base}/tournaments/pickem-leaderboard`, { cache: "no-store", signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? (r.json() as Promise<PickemLeaderEntry[]>) : []))
      .catch(() => [] as PickemLeaderEntry[]),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6 space-y-2">
        <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
          Competitivo
        </p>
        <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Torneios & <span className="text-amber-500">Pick&apos;Em</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
          Campeonatos em andamento, futuros e encerrados, com chaveamento visual e bolão da comunidade.
        </p>
      </header>

      <TournamentsClient
        initialTournaments={Array.isArray(tournaments) ? tournaments : []}
        initialLeaderboard={Array.isArray(leaderboard) ? leaderboard : []}
        initialUser={user}
      />
    </div>
  );
}