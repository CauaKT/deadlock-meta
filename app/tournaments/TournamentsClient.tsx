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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const openTournament = async (id: string) => {
    setSelectedId(id);
    setFeedback(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/backend/tournaments/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const detail = (await res.json()) as TournamentItem;
        setTournaments((prev) => prev.map((t) => (t.id === id ? detail : t)));
      }
    } catch {
    } finally {
      setLoadingDetail(false);
    }
  };

  const [adminOpen, setAdminOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("SAmerica");
  const [prizePool, setPrizePool] = useState("");
  const [status, setStatus] = useState<TournamentItem["status"]>("UPCOMING");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  const counts = useMemo(() => {
    const map = { ALL: tournaments.length, ONGOING: 0, UPCOMING: 0, FINISHED: 0 };
    for (const t of tournaments) map[t.status] += 1;
    return map;
  }, [tournaments]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return tournaments;
    return tournaments.filter((t) => t.status === statusFilter);
  }, [tournaments, statusFilter]);

  const selected = useMemo(
    () => tournaments.find((t) => t.id === selectedId) ?? null,
    [tournaments, selectedId],
  );

  const tierBadgeOf = (relevance: number) => {
    if (relevance >= 100) return { label: "S-Tier", cls: "border-amber-400/60 bg-amber-400/20 text-amber-300" };
    if (relevance >= 80) return { label: "A-Tier", cls: "border-orange-400/50 bg-orange-500/15 text-orange-300" };
    if (relevance >= 60) return { label: "B-Tier", cls: "border-cyan-400/45 bg-cyan-500/15 text-cyan-300" };
    if (relevance >= 40) return { label: "C-Tier", cls: "border-white/20 bg-white/5 text-neutral-300" };
    return { label: "Open", cls: "border-white/15 bg-white/5 text-neutral-400" };
  };

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
        {selected ? (
          (() => {
            const badge = STATUS_BADGE[selected.status];
            const tier = tierBadgeOf(selected.relevance);
            const rounds = Array.from(new Set(selected.matches.map((m) => m.round))).sort((a, b) => a - b);
            const frameBorder =
              selected.status === "ONGOING"
                ? "#10b981"
                : selected.status === "UPCOMING"
                  ? "#d97706"
                  : "#3897a1";
            const frameBg =
              selected.status === "ONGOING"
                ? "linear-gradient(160deg, rgba(12,42,34,0.9), rgba(7,12,11,0.97))"
                : selected.status === "UPCOMING"
                  ? "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.97))"
                  : "linear-gradient(160deg, rgba(16,40,46,0.88), rgba(7,12,14,0.97))";

            return (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setFeedback(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/15 bg-black/45 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-400 hover:text-amber-400 cursor-pointer"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  Voltar aos Campeonatos
                </button>

                {feedback && (
                  <div className="rounded-[5px] border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-300">
                    {feedback}
                  </div>
                )}

                <SlantFrame
                  shape="narrowTop"
                  border={frameBorder}
                  background={frameBg}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-[3px] border px-2 py-0.5 font-deadlock text-[10px] font-black uppercase ${tier.cls}`}>
                          {tier.label}
                        </span>
                        <span className={`rounded-[3px] border px-2 py-0.5 text-[10px] font-black uppercase ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="rounded-[3px] border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                          {selected.region}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-400">
                          {new Date(selected.startsAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <h2 className="font-deadlock text-2xl sm:text-3xl font-black text-[#f4efe6]">
                        {selected.title}
                      </h2>
                    </div>

                    {selected.prizePool && (
                      <span className="shrink-0 rounded-[4px] border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 font-mono text-sm font-black text-emerald-300">
                        {selected.prizePool}
                      </span>
                    )}
                  </div>

                  {loadingDetail && (
                    <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                      Sincronizando times e chaveamento...
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                      Times Participantes
                    </h3>
                    {selected.teams.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selected.teams.map((tm, idx) => (
                          <span
                            key={tm}
                            className={`rounded-[4px] border px-2.5 py-1 text-xs font-bold ${
                              selected.status === "FINISHED" && idx === 0
                                ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                                : "border-white/10 bg-black/45 text-neutral-200"
                            }`}
                          >
                            {selected.status === "FINISHED" && idx === 0
                              ? `1º ${tm}`
                              : selected.status === "FINISHED" && idx === 1
                                ? `2º ${tm}`
                                : tm}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">
                        Equipes ainda não definidas pela organização (TBD).
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-cyan-300">
                      Chaveamento & Pick&apos;Em
                    </h3>
                    {rounds.length === 0 ? (
                      <p className="rounded-[4px] border border-white/10 bg-black/35 p-4 text-xs text-neutral-400">
                        Confrontos e chaveamento ainda serão definidos (TBD).
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rounds.map((r) => (
                          <div key={r} className="space-y-2">
                            <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                              Fase {r}
                            </p>
                            {selected.matches
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
                                          onClick={() => void handlePick(selected.id, m.id, side.name)}
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
                                        onClick={() => void handleSetWinner(selected.id, m, m.teamA)}
                                        className="text-emerald-400 hover:underline cursor-pointer"
                                      >
                                        Vence {m.teamA}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleSetWinner(selected.id, m, m.teamB)}
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
                    )}
                  </div>
                </SlantFrame>
              </div>
            );
          })()
        ) : (
          <>
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
                    {st === "ALL" ? "Todos" : STATUS_BADGE[st].label}{" "}
                    <span className="ml-1 opacity-75">({counts[st]})</span>
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

            {filtered.length === 0 ? (
              <div className="rounded-[5px] border border-white/15 bg-[#0a0d0c]/90 p-10 text-center text-xs text-neutral-500">
                Nenhum campeonato cadastrado nesta categoria ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {filtered.map((t) => {
                  const badge = STATUS_BADGE[t.status];
                  const tier = tierBadgeOf(t.relevance);
                  const frameBorder =
                    t.status === "ONGOING"
                      ? "#10b981"
                      : t.status === "UPCOMING"
                        ? "#d97706"
                        : "#3897a1";
                  const frameBg =
                    t.status === "ONGOING"
                      ? "linear-gradient(160deg, rgba(12,42,34,0.9), rgba(7,12,11,0.97))"
                      : t.status === "UPCOMING"
                        ? "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.97))"
                        : "linear-gradient(160deg, rgba(16,40,46,0.88), rgba(7,12,14,0.97))";

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void openTournament(t.id)}
                      className="group flex h-full w-full text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                    >
                      <SlantFrame
                        shape="slantLeft"
                        border={frameBorder}
                        background={frameBg}
                        className="flex h-full w-full flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-[3px] border px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase ${tier.cls}`}>
                                {tier.label}
                              </span>
                              <span className={`rounded-[3px] border px-1.5 py-0.5 text-[9px] font-black uppercase ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            <h2 className="line-clamp-2 font-deadlock text-base font-black leading-snug text-[#f4efe6] transition-colors group-hover:text-amber-300">
                              {t.title}
                            </h2>
                          </div>

                          {t.prizePool && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-emerald-500/35 bg-emerald-500/15 px-2 py-1 font-mono text-xs font-black text-emerald-300">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                              </svg>
                              {t.prizePool}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-300">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-[3px] border border-white/10 bg-black/40 px-2 py-0.5 font-semibold">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3 text-cyan-300"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                <path d="M2 12h20" />
                              </svg>
                              {t.region}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-neutral-400">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <rect width="18" height="18" x="3" y="4" rx="2" />
                                <path d="M16 2v4" />
                                <path d="M8 2v4" />
                                <path d="M3 10h18" />
                              </svg>
                              {new Date(t.startsAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400 transition-colors group-hover:text-amber-300">
                            Abrir
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </SlantFrame>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <aside className="lg:col-span-4 lg:sticky lg:top-6">
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