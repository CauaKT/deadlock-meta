/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchHeroesAssets, fetchShopItems } from "@/lib/deadlock";
import SlantFrame from "@/components/ui/SlantFrame";

export const instant = false;

interface NormalizedMatchPlayer {
  accountId: number;
  heroId: number;
  team: number;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  lastHits: number;
  denies: number;
  heroDamage: number;
  objDamage: number;
  healing: number;
  items: number[];
}

interface NormalizedMatchDetail {
  matchId: number;
  durationSec: number;
  startTime: number;
  winningTeam: number;
  gameMode: string | number | null;
  players: NormalizedMatchPlayer[];
}

async function fetchMatch(matchId: string): Promise<NormalizedMatchDetail | null> {
  if (!/^\d+$/.test(matchId)) return null;
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/external-data/matches/${matchId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as NormalizedMatchDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  return {
    title: `LockPro • Partida #${matchId}`,
    description: `Placar detalhado, itens, dano e heróis da partida #${matchId} de Deadlock.`,
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const [match, heroesMap, shopItems] = await Promise.all([
    fetchMatch(matchId),
    fetchHeroesAssets(),
    fetchShopItems(),
  ]);

  if (!match) notFound();

  const itemsById = new Map(shopItems.map((i) => [i.id, i]));
  const mins = Math.floor(match.durationSec / 60);
  const secs = String(match.durationSec % 60).padStart(2, "0");

  const team0 = match.players.filter((p) => p.team === 0);
  const team1 = match.players.filter((p) => p.team === 1);

  const renderTeam = (
    title: string,
    players: NormalizedMatchPlayer[],
    won: boolean,
    shape: "slantLeft" | "slantRight",
    border: string,
    bg: string,
  ) => (
    <SlantFrame shape={shape} border={border} background={bg} className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
          {title}
        </h2>
        <span
          className={`rounded-[4px] border px-2 py-0.5 font-deadlock text-[10px] font-black uppercase ${
            won
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
              : "border-rose-500/40 bg-rose-500/15 text-rose-400"
          }`}
        >
          {won ? "Vitória" : "Derrota"}
        </span>
      </div>

      <div className="space-y-2.5">
        {players.map((p) => {
          const hero = heroesMap[p.heroId];
          const heroImg = hero?.images?.icon_image_small ?? hero?.images?.icon_hero_card ?? null;
          return (
            <div
              key={`${p.team}-${p.accountId}-${p.heroId}`}
              className="rounded-[4px] border border-white/10 bg-black/45 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {heroImg && (
                    <img src={heroImg} alt="" className="h-9 w-9 rounded-[3px] border border-white/15 object-cover" />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/player/${p.accountId}`}
                      className="block truncate text-xs font-bold text-[#f4efe6] hover:text-amber-400"
                    >
                      Jogador #{p.accountId}
                    </Link>
                    <p className="text-[10px] text-neutral-400">{hero?.name ?? `Herói #${p.heroId}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="font-black text-[#f4efe6]">
                    {p.kills}/{p.deaths}/{p.assists}
                  </span>
                  <span className="text-[#5ce1b6]">{p.netWorth.toLocaleString("pt-BR")} almas</span>
                  <span className="text-neutral-400 hidden sm:inline">
                    Dano: {Math.round(p.heroDamage).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {p.items.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                  {p.items.slice(0, 12).map((itemId, idx) => {
                    const item = itemsById.get(itemId);
                    if (!item?.image) return null;
                    return (
                      <Link key={`${itemId}-${idx}`} href={`/items/${item.className}`} title={item.name}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-6 w-6 rounded-[3px] border border-white/10 object-cover hover:border-amber-400"
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SlantFrame>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      <SlantFrame
        shape="narrowTop"
        border="#3897a1"
        background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p className="font-deadlock text-[11px] font-black uppercase tracking-widest text-cyan-300">
            Relatório de Partida
          </p>
          <h1 className="font-deadlock text-2xl sm:text-4xl font-black text-[#f4efe6]">
            Partida <span className="text-amber-500">#{match.matchId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-neutral-300">
          <span>Duração: <strong className="text-[#f4efe6]">{mins}:{secs}</strong></span>
          {match.startTime > 0 && (
            <span>{new Date(match.startTime * 1000).toLocaleDateString("pt-BR")}</span>
          )}
        </div>
      </SlantFrame>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderTeam(
          "The Amber Hand",
          team0,
          match.winningTeam === 0,
          "slantLeft",
          "#c97a2e",
          "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))",
        )}
        {renderTeam(
          "The Sapphire Flame",
          team1,
          match.winningTeam === 1,
          "slantRight",
          "#3897a1",
          "linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))",
        )}
      </div>
    </div>
  );
}