"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";
import type { AuthUser } from "@/lib/backend/types";

export interface TournamentMatchItem {
  id: string;
  round: number;
  slot: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  myPick: string | null;
}

export interface TournamentItem {
  id: string;
  title: string;
  region: string;
  prizePool: string | null;
  status: "ONGOING" | "UPCOMING" | "FINISHED";
  relevance: number;
  startsAt: string;
  teams: string[];
  matches: TournamentMatchItem[];
}

export interface PickemLeaderEntry {
  userId: string;
  username: string;
  handle: string | null;
  points: number;
  correct: number;
  total: number;
}

const STATUS_BADGE: Record<TournamentItem["status"], { label: string; cls: string }> = {
  ONGOING: { label: "Em Andamento", cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" },
  UPCOMING: { label: "Em Breve", cls: "border-amber-500/40 bg-amber-500/15 text-amber-300" },
  FINISHED: { label: "Encerrado", cls: "border-neutral-700 bg-neutral-900 text-neutral-400" },
};

export default function TournamentsClient({
  initialTournaments,
  initialLeaderboard,
  initialUser,
}: {
  initialTournaments: TournamentItem[];
  initialLeaderboard: PickemLeaderEntry[];
  initialUser: AuthUser | null;
}) {
  const [tournaments, setTournaments] = useState<TournamentItem[]>(initialTournaments);
  const [leaderboard] = useState<PickemLeaderEntry[]>(initialLeaderboard);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TournamentItem["status"]>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("SAmerica");
  const [prizePool, setPrizePool] = useState("");
  const [status, setStatus] = useState<TournamentItem["status"]>("UPCOMING");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return tournaments;
    return tournaments.filter((t) => t.status === statusFilter);
  }, [tournaments, statusFilter]);

  const handlePick = async (tournamentId: string, matchId: string, team: string) => {
    if (!initialUser) {
      setFeedback("Faça login para registrar seu palpite no Pick'Em.");
      return;
    }
    setFeedback(null);
    const res = await fetch(`/api/backend/tournaments/matches/${matchId}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pickedTeam: team }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setFeedback(data?.message || "Não foi possível salvar seu palpite.");
      return;
    }
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId
          ? {
              ...t,
              matches: t.matches.map((m) => (m.id === matchId ? { ...m, myPick: team } : m)),
            }
          : t,
      ),
    );
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !teamA.trim() || !teamB.trim()) return;
    const res = await fetch("/api/backend/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: title.trim(),
        region,
        prizePool: prizePool.trim() || undefined,
        status,
        relevance: 10,
        startsAt: new Date().toISOString(),
        teams: [teamA.trim(), teamB.trim()],
        matches: [{ round: 1, slot: 1, teamA: teamA.trim(), teamB: teamB.trim() }],
      }),
    });
    if (res.ok) {
      const created = (await res.json()) as TournamentItem;
      setTournaments((prev) => [created, ...prev]);
      setTitle("");
      setPrizePool("");
      setTeamA("");
      setTeamB("");
      setAdminOpen(false);
    }
  };

  const handleSetWinner = async (tournamentId: string, match: TournamentMatchItem, winner: string) => {
    const res = await fetch(`/api/backend/tournaments/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        scoreA: winner === match.teamA ? 2 : 0,
        scoreB: winner === match.teamB ? 2 : 0,
        winner,
      }),
    });
    if (res.ok) {
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === tournamentId
            ? {
                ...t,
                matches: t.matches.map((m) =>
                  m.id === match.id
                    ? {
                        ...m,
                        winner,
                        scoreA: winner === match.teamA ? 2 : 0,
                        scoreB: winner === match.teamB ? 2 : 0,
                      }
                    : m,
                ),
              }
            : t,
        ),
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "ONGOING", "UPCOMING", "FINISHED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-[4px] px-3 py-1.5 font-deadlock text-[11px] font-black uppercase cursor-pointer ${
                  statusFilter === st
                    ? "bg-amber-500 text-black"
                    : "border border-white/15 bg-[#0a0d0c] text-neutral-300"
                }`}
              >
                {st === "ALL" ? "Todos" : STATUS_BADGE[st].label}
              </button>
            ))}
          </div>

          {initialUser?.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="rounded-[4px] border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase text-amber-300 cursor-pointer"
            >
              {adminOpen ? "Fechar Admin" : "+ Novo Torneio"}
            </button>
          )}
        </div>

        {adminOpen && initialUser?.role === "ADMIN" && (
          <SlantFrame
            shape="narrowTop"
            border="#c97a2e"
            background="linear-gradient(160deg, rgba(46,30,12,0.88), rgba(8,10,10,0.96))"
          >
            <form onSubmit={handleCreateTournament} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do Torneio"
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              />
              <input
                type="text"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="Premiação (opcional, ex.: $5,000)"
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              >
                <option value="SAmerica">SAmerica</option>
                <option value="NAmerica">NAmerica</option>
                <option value="Europe">Europe</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TournamentItem["status"])}
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              >
                <option value="ONGOING">Em Andamento</option>
                <option value="UPCOMING">Em Breve</option>
                <option value="FINISHED">Encerrado</option>
              </select>
              <input
                type="text"
                required
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="Time A"
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              />
              <input
                type="text"
                required
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="Time B"
                className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6]"
              />
              <button
                type="submit"
                className="sm:col-span-2 rounded-[4px] bg-amber-500 py-2 font-deadlock text-xs font-black uppercase text-black cursor-pointer"
              >
                Criar Torneio
              </button>
            </form>
          </SlantFrame>
        )}

        {feedback && (
          <div className="rounded-[5px] border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-300">
            {feedback}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-[5px] border border-white/15 bg-[#0a0d0c]/90 p-10 text-center text-xs text-neutral-500">
            Nenhum campeonato cadastrado nesta categoria ainda.
          </div>
        ) : (
          filtered.map((t) => {
            const badge = STATUS_BADGE[t.status];
            const rounds = Array.from(new Set(t.matches.map((m) => m.round))).sort((a, b) => a - b);

            return (
              <SlantFrame
                key={t.id}
                shape="slantLeft"
                border="#3897a1"
                background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
                className="space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-deadlock text-xl font-black text-[#f4efe6]">{t.title}</h2>
                      <span className={`rounded-[4px] border px-2 py-0.5 text-[10px] font-black uppercase ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-300">
                      {t.region} {t.prizePool ? `• Premiação: ${t.prizePool}` : ""} •{" "}
                      {new Date(t.startsAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {t.teams.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.teams.map((tm) => (
                      <span
                        key={tm}
                        className="rounded-[3px] border border-white/10 bg-black/45 px-2 py-0.5 text-[11px] font-bold text-neutral-200"
                      >
                        {tm}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rounds.map((r) => (
                    <div key={r} className="space-y-2">
                      <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-cyan-300">
                        Fase {r}
                      </p>
                      {t.matches
                        .filter((m) => m.round === r)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="rounded-[4px] border border-white/10 bg-black/50 p-3 space-y-2 text-xs"
                          >
                            {[
                              { name: m.teamA, score: m.scoreA },
                              { name: m.teamB, score: m.scoreB },
                            ].map((side) => {
                              const isWinner = m.winner === side.name;
                              const isPicked = m.myPick === side.name;
                              return (
                                <div key={side.name} className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    disabled={Boolean(m.winner)}
                                    onClick={() => void handlePick(t.id, m.id, side.name)}
                                    className={`flex-1 rounded-[3px] border px-2.5 py-1.5 text-left font-bold transition-colors ${
                                      isWinner
                                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                                        : isPicked
                                          ? "border-amber-400 bg-amber-500/20 text-amber-200"
                                          : "border-white/10 bg-black/40 text-neutral-200 hover:border-amber-400/50"
                                    } ${m.winner ? "cursor-default" : "cursor-pointer"}`}
                                  >
                                    {side.name} {isPicked ? "★" : ""}
                                  </button>
                                  <span className="w-6 text-center font-mono font-black text-[#f4efe6]">
                                    {side.score}
                                  </span>
                                </div>
                              );
                            })}

                            {initialUser?.role === "ADMIN" && !m.winner && (
                              <div className="flex gap-2 pt-1 border-t border-white/10 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => void handleSetWinner(t.id, m, m.teamA)}
                                  className="text-emerald-400 hover:underline cursor-pointer"
                                >
                                  Vence {m.teamA}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSetWinner(t.id, m, m.teamB)}
                                  className="text-emerald-400 hover:underline cursor-pointer"
                                >
                                  Vence {m.teamB}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </SlantFrame>
            );
          })
        )}
      </div>

      <aside className="lg:col-span-4">
        <SlantFrame
          shape="slantRight"
          border="#c97a2e"
          background="linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))"
          className="space-y-4"
        >
          <div className="border-b border-white/10 pb-2.5">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400">
              Ranking Pick&apos;Em
            </h2>
            <p className="text-[11px] text-neutral-400">
              +10 pts por acerto de vencedor nas partidas.
            </p>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-neutral-400">
              Nenhum palpite contabilizado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((row, idx) => (
                <li
                  key={row.userId}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-black text-amber-400">#{idx + 1}</span>
                    {row.handle ? (
                      <Link href={`/profile/${row.handle}`} className="truncate font-bold text-[#f4efe6] hover:text-amber-400">
                        {row.username}
                      </Link>
                    ) : (
                      <span className="truncate font-bold text-[#f4efe6]">{row.username}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono font-black text-emerald-400">
                    {row.points} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SlantFrame>
      </aside>
    </div>
  );
}