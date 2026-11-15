"use client";
/* eslint-disable @next/next/no-img-element */
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
  matches?: number;
  wins?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  networth_per_min?: number;
  damage_per_min?: number;
  obj_damage_per_min?: number;
  damage_mitigated_per_min?: number;
  last_hits_per_min?: number;
  denies_per_match?: number;
  accuracy?: number;
  crit_shot_rate?: number;
}

interface MatchHistoryEntry {
  match_id: number;
  hero_id: number;
  match_duration_s: number;
  match_result: number;
  player_team: number;
  player_match_outcome?: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  net_worth: number;
  last_hits?: number;
  denies?: number;
  hero_level?: number;
  game_mode?: string;
  match_mode?: string;
  start_time: number;
}

interface MateStatEntry {
  mate_id: number;
  matches_played?: number;
  matches?: number;
  wins?: number;
}

interface SteamSummary {
  account_id: number;
  personaname?: string;
  avatar?: string;
}

type ModeFilter = "all" | "standard" | "ranked" | "brawl";

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

function isMatchWon(m: MatchHistoryEntry): boolean {
  return typeof m.player_match_outcome === "number"
    ? m.player_match_outcome === 1
    : m.match_result === m.player_team;
}

function formatModeLabel(m: MatchHistoryEntry): string {
  const raw = `${m.match_mode ?? ""} ${m.game_mode ?? ""}`.toLowerCase();
  if (raw.includes("brawl")) return "Street Brawl";
  if (raw.includes("ranked")) return "Ranked";
  return "Standard";
}

function formatRelativeTime(unixSec: number): string {
  const diffS = Math.max(0, Math.floor(Date.now() / 1000) - unixSec);
  if (diffS < 3600) return `${Math.max(1, Math.floor(diffS / 60))}m atrás`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h atrás`;
  const days = Math.floor(diffS / 86400);
  if (days < 30) return `${days}d atrás`;
  return new Date(unixSec * 1000).toLocaleDateString("pt-BR");
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
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [mates, setMates] = useState<MateStatEntry[]>([]);
  const [steamNames, setSteamNames] = useState<Record<number, SteamSummary>>({});
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [visibleMatchesCount, setVisibleMatchesCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      setMatches([]);
      setMates([]);
      setSteamNames({});
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    Promise.all([
      fetch(`https://api.deadlock-api.com/v1/players/${accountId}/hero-stats`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("http")))),
      fetch(`https://api.deadlock-api.com/v1/players/${accountId}/match-history`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`https://api.deadlock-api.com/v1/players/${accountId}/mate-stats`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([heroData, matchData, mateData]) => {
        if (cancelled) return;
        setStats(Array.isArray(heroData) ? (heroData as PlayerHeroStat[]) : []);
        setMatches(Array.isArray(matchData) ? (matchData as MatchHistoryEntry[]) : []);
        const mateList = Array.isArray(mateData) ? (mateData as MateStatEntry[]) : [];
        setMates(mateList);
        setLoading(false);

        const topMateIds = [...mateList]
          .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0))
          .slice(0, 5)
          .map((m) => m.mate_id)
          .filter((id) => Number.isFinite(id));

        if (topMateIds.length > 0) {
          fetch(
            `https://api.deadlock-api.com/v1/players/steam?account_ids=${topMateIds.join(",")}`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : []))
            .then((profiles: unknown) => {
              if (cancelled || !Array.isArray(profiles)) return;
              const map: Record<number, SteamSummary> = {};
              for (const p of profiles as SteamSummary[]) {
                if (p.account_id) map[p.account_id] = p;
              }
              setSteamNames(map);
            })
            .catch(() => {});
        }
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

  const filteredMatches = useMemo(() => {
    if (modeFilter === "all") return matches;
    return matches.filter((m) => {
      const label = formatModeLabel(m).toLowerCase();
      if (modeFilter === "brawl") return label.includes("brawl");
      if (modeFilter === "ranked") return label === "ranked";
      return label === "standard";
    });
  }, [matches, modeFilter]);

  const streaks = useMemo(() => {
    if (matches.length === 0) return { current: 0, currentIsWin: true, longestWin: 0 };
    const firstWon = isMatchWon(matches[0]);
    let current = 0;
    for (const m of matches) {
      if (isMatchWon(m) === firstWon) current += 1;
      else break;
    }

    let longestWin = 0;
    let run = 0;
    for (const m of matches) {
      if (isMatchWon(m)) {
        run += 1;
        if (run > longestWin) longestWin = run;
      } else {
        run = 0;
      }
    }
    return { current, currentIsWin: firstWon, longestWin };
  }, [matches]);

  const last20Summary = useMemo(() => {
    const slice = filteredMatches.slice(0, 20);
    if (slice.length === 0) return null;
    const wins = slice.filter(isMatchWon).length;
    const avgSouls = slice.reduce((sum, m) => sum + m.net_worth, 0) / slice.length;
    const avgSpm =
      slice.reduce((sum, m) => sum + m.net_worth / Math.max(1, m.match_duration_s / 60), 0) /
      slice.length;
    return {
      items: slice,
      wins,
      losses: slice.length - wins,
      winRate: (wins / slice.length) * 100,
      avgSouls,
      avgSpm,
    };
  }, [filteredMatches]);

  // Heatmap das últimas 12 semanas (84 dias)
  const activityGrid = useMemo(() => {
    const daysCount = 84;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const countsByDay = new Map<string, number>();

    for (const m of matches) {
      if (!m.start_time) continue;
      const d = new Date(m.start_time * 1000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const weeks: Array<Array<{ date: string; count: number }>> = [];
    for (let w = 11; w >= 0; w--) {
      const col: Array<{ date: string; count: number }> = [];
      for (let d = 6; d >= 0; d--) {
        const offset = w * 7 + d;
        const dt = new Date(today);
        dt.setDate(today.getDate() - offset);
        const key = dt.toISOString().slice(0, 10);
        col.push({ date: key, count: countsByDay.get(key) ?? 0 });
      }
      weeks.push(col);
    }
    return { weeks, total84Days: matches.filter((m) => m.start_time * 1000 >= today.getTime() - daysCount * 86400000).length };
  }, [matches]);

  const summary = useMemo(() => {
    if (!stats || stats.length === 0) return null;

    let totalMatches = 0;
    let totalWins = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let weightedSouls = 0;
    let weightedDamage = 0;
    let weightedObjDmg = 0;
    let weightedLastHits = 0;
    let weightedDenies = 0;
    let weightedAcc = 0;
    let accWeight = 0;
    let weightedHs = 0;
    let hsWeight = 0;

    for (const row of stats) {
      const m = row.matches_played ?? row.matches ?? 0;
      if (m <= 0) continue;
      totalMatches += m;
      totalWins += row.wins ?? 0;
      totalKills += row.kills ?? 0;
      totalDeaths += row.deaths ?? 0;
      totalAssists += row.assists ?? 0;
      if (typeof row.networth_per_min === "number") weightedSouls += row.networth_per_min * m;
      if (typeof row.damage_per_min === "number") weightedDamage += row.damage_per_min * m;
      if (typeof row.obj_damage_per_min === "number") weightedObjDmg += row.obj_damage_per_min * m;
      if (typeof row.last_hits_per_min === "number") weightedLastHits += row.last_hits_per_min * m;
      if (typeof row.denies_per_match === "number") weightedDenies += row.denies_per_match * m;
      if (typeof row.accuracy === "number" && row.accuracy > 0) {
        weightedAcc += row.accuracy * m;
        accWeight += m;
      }
      if (typeof row.crit_shot_rate === "number" && row.crit_shot_rate > 0) {
        weightedHs += row.crit_shot_rate * m;
        hsWeight += m;
      }
    }

    if (totalMatches === 0) return null;

    const winRate = (totalWins / totalMatches) * 100;
    const kda = (totalKills + totalAssists) / Math.max(1, totalDeaths);
    const soulsPerMin = weightedSouls / totalMatches;
    const damagePerMin = weightedDamage / totalMatches;
    const objDamagePerMin = weightedObjDmg / totalMatches;
    const lastHitsPerMin = weightedLastHits / totalMatches;
    const deniesPerMatch = weightedDenies / totalMatches;
    const accuracy = accWeight > 0 ? (weightedAcc / accWeight) * 100 : null;
    const headshotRate = hsWeight > 0 ? (weightedHs / hsWeight) * 100 : null;

    const topHeroes = [...stats]
      .filter((r) => (r.matches_played ?? r.matches ?? 0) > 0)
      .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0))
      .slice(0, 6);

    const badges: Array<{ label: string; tone: string }> = [];
    const mainHeroRow = topHeroes[0];
    const mainMatches = mainHeroRow ? (mainHeroRow.matches_played ?? mainHeroRow.matches ?? 0) : 0;
    const mainHero = mainHeroRow ? heroesById.get(mainHeroRow.hero_id) : null;
    if (mainHero && mainMatches >= 15) {
      badges.push({
        label: `Main ${mainHero.name}`,
        tone: "border-amber-500/45 bg-amber-500/15 text-amber-300",
      });
    }
    if (totalMatches >= 500) {
      badges.push({
        label: "Veterano 500+ Partidas",
        tone: "border-purple-500/45 bg-purple-500/15 text-purple-300",
      });
    } else if (totalMatches >= 100) {
      badges.push({
        label: "Experiente 100+ Partidas",
        tone: "border-sky-500/45 bg-sky-500/15 text-sky-300",
      });
    }
    if (totalMatches >= 20 && winRate >= 60) {
      badges.push({
        label: "60%+ Win Rate",
        tone: "border-emerald-500/45 bg-emerald-500/15 text-emerald-300",
      });
    } else if (totalMatches >= 20 && winRate >= 55) {
      badges.push({
        label: "55%+ Win Rate",
        tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      });
    }
    if (totalMatches >= 20 && kda >= 3.0) {
      badges.push({
        label: `KDA ${kda.toFixed(1)}+`,
        tone: "border-cyan-500/45 bg-cyan-500/15 text-cyan-300",
      });
    }
    if (soulsPerMin >= 1050) {
      badges.push({
        label: "Farm Eficiente",
        tone: "border-[#5ce1b6]/45 bg-[#5ce1b6]/10 text-[#5ce1b6]",
      });
    }

    return {
      totalMatches,
      totalWins,
      winRate,
      kda,
      soulsPerMin,
      damagePerMin,
      objDamagePerMin,
      lastHitsPerMin,
      deniesPerMatch,
      accuracy,
      headshotRate,
      topHeroes,
      badges,
    };
  }, [stats, heroesById]);

  const topMates = useMemo(
    () =>
      [...mates]
        .filter((m) => (m.matches_played ?? m.matches ?? 0) >= 2)
        .sort((a, b) => (b.matches_played ?? b.matches ?? 0) - (a.matches_played ?? a.matches ?? 0))
        .slice(0, 5),
    [mates],
  );

  if (!steamId.trim()) return null;

  return (
    <section className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 shadow-2xl overflow-hidden">
      <div className="dl-halftone relative border-b border-neutral-800/90 bg-neutral-900/70 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="relative z-10 font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
            Estatísticas no Deadlock
          </h2>
          <p className="relative z-10 text-xs text-neutral-400">
            Dados públicos da conta via Deadlock API {accountId ? `(ID ${accountId})` : ""}
          </p>
        </div>
        {summary && (
          <span
            className="relative z-10 rounded-[4px] border px-2.5 py-1 font-mono text-xs font-black"
            style={{ borderColor: `${heroColor}55`, color: heroColor, backgroundColor: `${heroColor}15` }}
          >
            {summary.totalMatches.toLocaleString("pt-BR")} partidas
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {!accountId ? (
          <p className="text-xs text-neutral-400">
            Steam ID inválido. Informe seu SteamID64 (ex.: 76561198...) ou Account ID nas configurações.
          </p>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 rounded-[4px] bg-neutral-900/80 animate-pulse" />
            ))}
          </div>
        ) : failed ? (
          <p className="text-xs text-rose-400">
            Não foi possível carregar os dados da Deadlock API agora.
          </p>
        ) : !summary ? (
          <p className="text-xs text-neutral-400">
            Nenhuma partida pública encontrada para esta conta na Deadlock API.
          </p>
        ) : (
          <>
            {/* Badges Automáticas */}
            {summary.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.badges.map((b) => (
                  <span
                    key={b.label}
                    className={`rounded-[4px] border px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider ${b.tone}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* Barra W/L + Sequência + Métricas de Combate (8 cards) */}
            <div className="space-y-3">
              <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-black text-emerald-400">
                      {summary.winRate.toFixed(1)}% WR
                    </span>
                    <span className="font-mono text-neutral-400">
                      {summary.totalWins}V — {summary.totalMatches - summary.totalWins}D
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span>
                      Seq. Atual:{" "}
                      <strong className={streaks.currentIsWin ? "text-emerald-400" : "text-rose-400"}>
                        {streaks.current}{streaks.currentIsWin ? "V" : "D"}
                      </strong>
                    </span>
                    <span>
                      Maior Seq.: <strong className="text-amber-400">{streaks.longestWin}V</strong>
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-rose-500/70">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, summary.winRate))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    KDA Médio
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-[#f4efe6]">
                    {summary.kda.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-neutral-500">Abates + Assist / Mortes</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Almas / min
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-[#5ce1b6]">
                    {Math.round(summary.soulsPerMin).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-neutral-500">Patrimônio médio</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Dano / min
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-amber-400">
                    {Math.round(summary.damagePerMin).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-neutral-500">Dano a heróis</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Dano Objetivos / min
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-orange-400">
                    {Math.round(summary.objDamagePerMin).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-neutral-500">Torres e Patrono</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Precisão
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-sky-400">
                    {summary.accuracy !== null ? `${summary.accuracy.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-neutral-500">Disparos acertados</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Taxa de HS / Crítico
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-rose-400">
                    {summary.headshotRate !== null ? `${summary.headshotRate.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-neutral-500">Acertos críticos</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Last Hits / min
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-[#f4efe6]">
                    {summary.lastHitsPerMin.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-neutral-500">Abates de tropas</p>
                </div>

                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Denies / partida
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-[#f4efe6]">
                    {summary.deniesPerMatch.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-neutral-500">Orbes negados</p>
                </div>
              </div>
            </div>

            {/* Heatmap de Atividade + Top Heróis + Aliados Frequentes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Top Heróis */}
              <div className="lg:col-span-7 space-y-2.5">
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400">
                  Heróis Mais Jogados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {summary.topHeroes.map((row) => {
                    const m = row.matches_played ?? row.matches ?? 0;
                    const w = row.wins ?? 0;
                    const wr = m > 0 ? (w / m) * 100 : 0;
                    const kda = ((row.kills ?? 0) + (row.assists ?? 0)) / Math.max(1, row.deaths ?? 0);
                    const hero = heroesById.get(row.hero_id);
                    return (
                      <Link
                        key={row.hero_id}
                        href={`/heroes/${row.hero_id}`}
                        className="flex items-center justify-between gap-3 rounded-[4px] border border-neutral-800 bg-[#070908] p-2.5 hover:border-amber-500/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {hero?.image ? (
                            <img
                              src={hero.image}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-[3px] object-cover border border-neutral-700"
                            />
                          ) : (
                            <span className="h-9 w-9 shrink-0 rounded-[3px] bg-neutral-800" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#f4efe6]">
                              {hero?.name ?? `Herói #${row.hero_id}`}
                            </p>
                            <p className="font-mono text-[10px] text-neutral-400">
                              {m} jogos • KDA {kda.toFixed(1)}
                              {typeof row.networth_per_min === "number"
                                ? ` • ${Math.round(row.networth_per_min)}/m`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-xs font-black ${
                            wr >= 52 ? "text-emerald-400" : wr <= 48 ? "text-rose-400" : "text-amber-300"
                          }`}
                        >
                          {wr.toFixed(0)}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Atividade Recente + Com Quem Mais Jogou */}
              <div className="lg:col-span-5 space-y-5">
                {/* Heatmap 12 semanas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400">
                      Atividade (Últimas 12 Semanas)
                    </h3>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {activityGrid.total84Days} jogos
                    </span>
                  </div>
                  <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3 flex items-center justify-between gap-1 overflow-x-auto">
                    {activityGrid.weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-1">
                        {week.map((day) => {
                          const tone =
                            day.count === 0
                              ? "bg-neutral-900"
                              : day.count === 1
                                ? "bg-amber-500/35"
                                : day.count <= 3
                                  ? "bg-amber-500/65"
                                  : "bg-amber-400";
                          return (
                            <span
                              key={day.date}
                              title={`${day.date}: ${day.count} partida(s)`}
                              className={`h-3 w-3 rounded-[2px] ${tone}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aliados Frequentes */}
                <div className="space-y-2">
                  <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400">
                    Com Quem Mais Jogou
                  </h3>
                  {topMates.length === 0 ? (
                    <p className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3 text-xs text-neutral-500">
                      Nenhum aliado frequente registrado ainda.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {topMates.map((mate) => {
                        const total = mate.matches_played ?? mate.matches ?? 0;
                        const wins = mate.wins ?? 0;
                        const wr = total > 0 ? (wins / total) * 100 : 0;
                        const steam = steamNames[mate.mate_id];
                        return (
                          <Link
                            key={mate.mate_id}
                            href={`/player/${mate.mate_id}`}
                            className="flex items-center justify-between gap-3 rounded-[4px] border border-neutral-800 bg-[#070908] px-3 py-2 text-xs hover:border-amber-500/60 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {steam?.avatar ? (
                                <img
                                  src={steam.avatar}
                                  alt=""
                                  className="h-7 w-7 shrink-0 rounded-full object-cover border border-neutral-700"
                                />
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400">
                                  S
                                </span>
                              )}
                              <span className="truncate font-semibold text-[#f4efe6] hover:text-amber-400 transition-colors">
                                {steam?.personaname || `Jogador #${mate.mate_id}`}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-[11px] text-neutral-300">
                              {total} jogos •{" "}
                              <strong className={wr >= 50 ? "text-emerald-400" : "text-rose-400"}>
                                {wr.toFixed(0)}% WR
                              </strong>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Histórico Detalhado + Forma das Últimas 20 */}
            <div className="space-y-3 border-t border-neutral-800/80 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                  Histórico de Partidas
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: "Todas" },
                      { id: "standard", label: "Standard" },
                      { id: "ranked", label: "Ranked" },
                      { id: "brawl", label: "Street Brawl" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setModeFilter(tab.id);
                        setVisibleMatchesCount(8);
                      }}
                      className={`rounded-[4px] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                        modeFilter === tab.id
                          ? "bg-amber-500 text-black"
                          : "border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {last20Summary && (
                <div className="rounded-[4px] border border-neutral-800 bg-[#070908] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-emerald-400">
                      Últimas {last20Summary.items.length}: {last20Summary.winRate.toFixed(0)}% WR
                    </span>
                    <span className="font-mono text-neutral-400">
                      ({last20Summary.wins}V / {last20Summary.losses}D)
                    </span>
                    <span className="hidden sm:inline font-mono text-[#5ce1b6]">
                      Média {Math.round(last20Summary.avgSpm)} almas/m
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {last20Summary.items.map((m) => {
                      const won = isMatchWon(m);
                      return (
                        <span
                          key={`dot-${m.match_id}`}
                          title={`${heroesById.get(m.hero_id)?.name ?? "Herói"} • ${m.player_kills}/${m.player_deaths}/${m.player_assists}`}
                          className={`flex h-4 w-4 items-center justify-center rounded-[2px] font-mono text-[9px] font-black ${
                            won
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {won ? "V" : "D"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredMatches.length === 0 ? (
                <p className="rounded-[4px] border border-neutral-800 bg-[#070908] p-4 text-center text-xs text-neutral-500">
                  Nenhuma partida encontrada neste modo.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMatches.slice(0, visibleMatchesCount).map((m) => {
                    const won = isMatchWon(m);
                    const hero = heroesById.get(m.hero_id);
                    const mins = Math.max(1, Math.round(m.match_duration_s / 60));
                    const spm = Math.round(m.net_worth / mins);
                    const kda = (m.player_kills + m.player_assists) / Math.max(1, m.player_deaths);

                    return (
                      <div
                        key={m.match_id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-[4px] border px-3.5 py-2.5 text-xs ${
                          won
                            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                            : "border-rose-500/30 bg-rose-500/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {hero?.image ? (
                            <img
                              src={hero.image}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-[4px] object-cover border border-neutral-700"
                            />
                          ) : (
                            <span className="h-10 w-10 shrink-0 rounded-[4px] bg-neutral-800" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-deadlock text-[10px] font-black uppercase ${
                                  won ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {won ? "Vitória" : "Derrota"}
                              </span>
                              <span className="text-[10px] text-neutral-500">• {formatModeLabel(m)}</span>
                              <span className="text-[10px] text-neutral-500">• {formatRelativeTime(m.start_time)}</span>
                            </div>
                            <p className="truncate font-bold text-[#f4efe6]">
                              {hero?.name ?? `Herói #${m.hero_id}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 font-mono text-right">
                          <div>
                            <p className="font-bold text-[#f4efe6]">
                              {m.player_kills} / <span className="text-rose-400">{m.player_deaths}</span> / {m.player_assists}
                            </p>
                            <p className="text-[10px] text-neutral-400">{kda.toFixed(2)} KDA</p>
                          </div>

                          <div className="hidden sm:block">
                            <p className="font-bold text-[#5ce1b6]">
                              {(m.net_worth / 1000).toFixed(1)}k almas
                            </p>
                            <p className="text-[10px] text-neutral-400">{spm}/min • {mins}m</p>
                          </div>

                          {(typeof m.last_hits === "number" || typeof m.denies === "number") && (
                            <div className="hidden md:block">
                              <p className="font-bold text-neutral-200">
                                {m.last_hits ?? 0} LH / {m.denies ?? 0} DN
                              </p>
                              <p className="text-[10px] text-neutral-500">Farm</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredMatches.length > visibleMatchesCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleMatchesCount((prev) => prev + 10)}
                      className="w-full rounded-[4px] border border-neutral-800 bg-[#070908] py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 hover:border-amber-500/60 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Carregar mais partidas
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}