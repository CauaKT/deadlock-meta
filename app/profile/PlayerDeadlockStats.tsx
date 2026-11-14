"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface HeroOption {
  id: number;
  name: string;
  image: string;
  rgb?: [number, number, number];
}

interface PlayerHeroStat {
  hero_id: number;
  matches_played?: number;
  wins?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
}

const STEAM64_BASE = BigInt("76561197960265728");

function toAccountId(raw: string): string | null {
  const clean = raw.trim();
  if (!/^\d{3,20}$/.test(clean)) return null;
  try {
    const val = BigInt(clean);
    if (val > STEAM64_BASE) {
      return (val - STEAM64_BASE).toString();
    }
    return val > BigInt(0) ? val.toString() : null;
  } catch {
    return null;
  }
}

export default function PlayerDeadlockStats({
  steamId,
  heroes,
  heroColor,
}: {
  steamId: string;
  heroes: HeroOption[];
  heroColor: string;
}) {
  const accountId = useMemo(() => toAccountId(steamId), [steamId]);
  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const [stats, setStats] = useState<PlayerHeroStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetch(`https://api.deadlock-api.com/v1/players/${accountId}/hero-stats`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("http"))))
      .then((data: unknown) => {
        if (cancelled) return;
        setStats(Array.isArray(data) ? (data as PlayerHeroStat[]) : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!steamId.trim()) return null;

  const summary = useMemo(() => {
    if (!stats || stats.length === 0) return null;
    let matches = 0;
    let wins = 0;
    let kills = 0;
    let deaths = 0;
    let assists = 0;
    for (const row of stats) {
      matches += row.matches_played ?? 0;
      wins += row.wins ?? 0;
      kills += row.kills ?? 0;
      deaths += row.deaths ?? 0;
      assists += row.assists ?? 0;
    }
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const kda = deaths > 0 ? (kills + assists) / deaths : kills + assists;
    const topHeroes = [...stats]
      .filter((s) => (s.matches_played ?? 0) > 0)
      .sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0))
      .slice(0, 5);

    return { matches, wins, winRate, kda, topHeroes };
  }, [stats]);

  return (
    <section className="rounded-3xl border border-neutral-800/90 bg-[#0a0d0c] p-6 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 font-deadlock text-base font-black uppercase tracking-wider text-[#f4efe6]">
          <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
          Estatísticas de Deadlock
        </h3>
        {accountId && (
          <span className="rounded-full border border-neutral-800 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] text-neutral-400">
            Account ID: {accountId}
          </span>
        )}
      </div>

      {!accountId ? (
        <p className="text-xs text-neutral-400">
          Informe um SteamID64 ou Friend Code numérico válido nas configurações para exibir suas estatísticas.
        </p>
      ) : loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-xl bg-neutral-900/70 animate-pulse" />
            <div className="h-16 rounded-xl bg-neutral-900/70 animate-pulse" />
            <div className="h-16 rounded-xl bg-neutral-900/70 animate-pulse" />
          </div>
          <div className="h-28 rounded-xl bg-neutral-900/50 animate-pulse" />
        </div>
      ) : failed || !summary ? (
        <p className="text-xs text-neutral-400">
          Nenhuma partida pública encontrada para esta conta na Deadlock API (ou o histórico da conta está privado).
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800/80 bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Partidas</p>
              <p className="mt-1 font-deadlock text-2xl font-black text-[#f4efe6]">
                {summary.matches.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800/80 bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Win Rate</p>
              <p
                className={`mt-1 font-deadlock text-2xl font-black ${
                  summary.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {summary.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800/80 bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">KDA Médio</p>
              <p className="mt-1 font-deadlock text-2xl font-black text-amber-400">
                {summary.kda.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
              Melhores Campeões (Mais Jogados)
            </p>
            <div className="space-y-2">
              {summary.topHeroes.map((row) => {
                const hero = heroesById.get(row.hero_id);
                const played = row.matches_played ?? 0;
                const wr = played > 0 ? ((row.wins ?? 0) / played) * 100 : 0;
                const rowKda =
                  (row.deaths ?? 0) > 0
                    ? ((row.kills ?? 0) + (row.assists ?? 0)) / (row.deaths ?? 1)
                    : (row.kills ?? 0) + (row.assists ?? 0);
                const barColor = hero?.rgb ? `rgb(${hero.rgb.join(",")})` : heroColor;

                return (
                  <Link
                    key={row.hero_id}
                    href={`/heroes/${row.hero_id}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-800/80 bg-black/35 p-2.5 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
                  >
                    {hero?.image ? (
                      <img
                        src={hero.image}
                        alt={hero.name}
                        className="h-10 w-10 shrink-0 rounded-lg border border-neutral-800 object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-bold text-neutral-400">
                        ?
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-deadlock font-black uppercase text-[#f4efe6]">
                          {hero?.name ?? `Herói #${row.hero_id}`}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                          {played}j · <strong className={wr >= 50 ? "text-emerald-400" : "text-rose-400"}>{wr.toFixed(1)}%</strong> · {rowKda.toFixed(2)} KDA
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800/90">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(4, wr))}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}