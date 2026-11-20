"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";

export interface CompareHeroMeta {
  id: number;
  name: string;
  image: string | null;
}

interface NormalizedHeroStat {
  heroId: number;
  matches: number;
  wins: number;
  winRate: number;
  kda: number;
  soulsPerMin: number;
  damagePerMin: number;
}

interface NormalizedPlayerSummary {
  accountId: string;
  personaName: string | null;
  avatarUrl: string | null;
  rankBadge: number | null;
  matches: number;
  wins: number;
  winRate: number;
  kda: number;
  soulsPerMin: number;
  damagePerMin: number;
  topHeroes: NormalizedHeroStat[];
}

export default function CompareClient({ heroes }: { heroes: CompareHeroMeta[] }) {
  const heroMap = new Map(heroes.map((h) => [h.id, h]));

  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [playerA, setPlayerA] = useState<NormalizedPlayerSummary | null>(null);
  const [playerB, setPlayerB] = useState<NormalizedPlayerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayer = async (rawId: string): Promise<NormalizedPlayerSummary> => {
    const clean = rawId.trim();
    if (!/^\d+$/.test(clean)) {
      throw new Error(`Steam ID / Account ID inválido: "${rawId}"`);
    }
    const res = await fetch(`/api/backend/external-data/player/${encodeURIComponent(clean)}/summary`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || `Erro ao buscar jogador ${clean}.`);
    }
    return (await res.json()) as NormalizedPlayerSummary;
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idA.trim() || !idB.trim()) {
      setError("Informe os dois Steam IDs ou Account IDs para comparar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([fetchPlayer(idA), fetchPlayer(idB)]);
      setPlayerA(a);
      setPlayerB(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao comparar jogadores.");
    } finally {
      setLoading(false);
    }
  };

  const metrics: Array<{
    label: string;
    valA: number;
    valB: number;
    fmt: (v: number) => string;
  }> = playerA && playerB
    ? [
        { label: "Win Rate", valA: playerA.winRate, valB: playerB.winRate, fmt: (v) => `${v.toFixed(2)}%` },
        { label: "Partidas", valA: playerA.matches, valB: playerB.matches, fmt: (v) => v.toLocaleString("pt-BR") },
        { label: "KDA Médio", valA: playerA.kda, valB: playerB.kda, fmt: (v) => v.toFixed(2) },
        { label: "Almas / min", valA: playerA.soulsPerMin, valB: playerB.soulsPerMin, fmt: (v) => v.toFixed(1) },
        { label: "Dano / min", valA: playerA.damagePerMin, valB: playerB.damagePerMin, fmt: (v) => v.toFixed(1) },
      ]
    : [];

  return (
    <div className="space-y-8">
      <SlantFrame
        shape="narrowTop"
        border="#3897a1"
        background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
      >
        <form onSubmit={handleCompare} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="block font-deadlock text-[11px] font-black uppercase tracking-wider text-cyan-300">
              Jogador 1 (Steam ID64 ou Account ID)
            </label>
            <input
              type="text"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              placeholder="Ex.: 76561198000000000 ou 123456789"
              className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <label className="block font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-300">
              Jogador 2 (Steam ID64 ou Account ID)
            </label>
            <input
              type="text"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              placeholder="Ex.: 76561198000000000 ou 987654321"
              className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[4px] bg-amber-500 py-2.5 px-4 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Comparando..." : "Comparar 1v1"}
            </button>
          </div>
        </form>
      </SlantFrame>

      {error && (
        <div className="rounded-[5px] border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {playerA && playerB && (
        <div className="space-y-6">
          {/* Cabeçalhos dos dois jogadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { p: playerA, shape: "slantLeft" as const, border: "#3897a1", bg: "linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))" },
              { p: playerB, shape: "slantRight" as const, border: "#c97a2e", bg: "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))" },
            ].map(({ p, shape, border, bg }) => (
              <SlantFrame key={p.accountId} shape={shape} border={border} background={bg}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-[4px] border border-white/15 object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-white/15 bg-black/50 font-deadlock text-lg font-black text-amber-400">
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/player/${p.accountId}`}
                        className="block truncate font-deadlock text-lg font-black text-[#f4efe6] hover:text-amber-400"
                      >
                        {p.personaName || `Jogador #${p.accountId}`}
                      </Link>
                      <p className="font-mono text-[11px] text-neutral-400">ID: {p.accountId}</p>
                    </div>
                  </div>
                  <Link
                    href={`/player/${p.accountId}`}
                    className="shrink-0 rounded-[4px] border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-bold text-neutral-200 hover:border-amber-400 hover:text-amber-400"
                  >
                    Ver Perfil
                  </Link>
                </div>
              </SlantFrame>
            ))}
          </div>

          {/* Comparação métrica a métrica */}
          <div className="dl-noise dl-halftone relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-5 space-y-3 shadow-2xl">
            <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
              Comparativo Direto
            </h2>
            <div className="divide-y divide-white/10">
              {metrics.map((m) => {
                const aWins = m.valA > m.valB;
                const bWins = m.valB > m.valA;
                return (
                  <div key={m.label} className="grid grid-cols-3 items-center py-3 text-xs sm:text-sm">
                    <span className={`font-mono font-black ${aWins ? "text-emerald-400" : "text-neutral-300"}`}>
                      {m.fmt(m.valA)}
                    </span>
                    <span className="text-center font-deadlock text-[11px] uppercase tracking-wider text-neutral-400">
                      {m.label}
                    </span>
                    <span className={`text-right font-mono font-black ${bWins ? "text-emerald-400" : "text-neutral-300"}`}>
                      {m.fmt(m.valB)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Melhores Heróis lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[playerA, playerB].map((p, idx) => (
              <div
                key={`heroes-${p.accountId}-${idx}`}
                className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 space-y-3"
              >
                <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] border-b border-white/10 pb-2">
                  Melhores Heróis — {p.personaName || `#${p.accountId}`}
                </h3>
                {p.topHeroes.length === 0 ? (
                  <p className="text-xs text-neutral-500">Sem histórico de heróis disponível.</p>
                ) : (
                  <div className="space-y-2">
                    {p.topHeroes.slice(0, 5).map((h) => {
                      const meta = heroMap.get(h.heroId);
                      return (
                        <Link
                          key={h.heroId}
                          href={`/heroes/${h.heroId}`}
                          className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-400/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {meta?.image && (
                              <img src={meta.image} alt="" className="h-8 w-8 rounded-[3px] object-cover" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[#f4efe6]">
                                {meta?.name ?? `Herói #${h.heroId}`}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {h.matches} jogos • KDA {h.kda.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`font-mono text-xs font-black ${
                              h.winRate >= 52
                                ? "text-emerald-400"
                                : h.winRate <= 48
                                  ? "text-rose-400"
                                  : "text-amber-300"
                            }`}
                          >
                            {h.winRate.toFixed(1)}%
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}