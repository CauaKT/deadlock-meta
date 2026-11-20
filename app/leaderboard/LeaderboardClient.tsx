"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";

export interface LeaderboardHeroOption {
  id: number;
  name: string;
  image: string | null;
}

interface LeaderboardEntry {
  rank: number;
  accountId: number | null;
  accountName: string;
  badgeLevel: number | null;
  rankedRank: number | null;
  rankedSubrank: number | null;
  topHeroIds: number[];
}

const REGIONS = [
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

export default function LeaderboardClient({ heroes }: { heroes: LeaderboardHeroOption[] }) {
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [region, setRegion] = useState("SAmerica");
  const [heroId, setHeroId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = heroId ? `?heroId=${encodeURIComponent(heroId)}` : "";
    fetch(`/api/backend/external-data/leaderboard/${encodeURIComponent(region)}${qs}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || "Não foi possível carregar o leaderboard.");
        }
        return res.json();
      })
      .then((data: { entries?: LeaderboardEntry[]; fetchedAt?: string }) => {
        if (!cancelled) {
          setEntries(Array.isArray(data.entries) ? data.entries : []);
          setFetchedAt(data.fetchedAt ?? null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar leaderboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region, heroId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.accountName.toLowerCase().includes(q));
  }, [entries, search]);

  return (
    <div className="space-y-6">
      <SlantFrame
        shape="narrowTop"
        border="#c97a2e"
        background="linear-gradient(160deg, rgba(46,30,12,0.88), rgba(8,10,10,0.96))"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
      >
        <div className="space-y-1">
          <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
            Região
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 font-deadlock text-xs font-black uppercase text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
            Herói
          </label>
          <select
            value={heroId}
            onChange={(e) => setHeroId(e.target.value)}
            className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 font-deadlock text-xs font-black uppercase text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="">Geral (Todos os Heróis)</option>
            {heroes.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
            Buscar Jogador
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nick..."
            className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </SlantFrame>

      {error && (
        <div className="rounded-[5px] border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 overflow-hidden shadow-2xl">
        <div className="dl-noise dl-halftone relative border-b border-white/10 bg-[#10181a]/90 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6]">
            Top {filtered.length} Jogadores
          </h2>
          {fetchedAt && (
            <span className="font-mono text-[10px] text-neutral-400">
              Cache: {new Date(fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Carregando ranking...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">Nenhum jogador encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/40 font-deadlock text-[10px] uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">Jogador</th>
                  <th className="px-4 py-3">Principais Heróis</th>
                  <th className="px-4 py-3 text-right">Patente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((entry) => (
                  <tr key={`${entry.rank}-${entry.accountName}`} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-amber-400">
                      #{entry.rank}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#f4efe6]">
                      {entry.accountId ? (
                        <Link
                          href={`/player/${entry.accountId}`}
                          className="hover:text-amber-400 transition-colors"
                        >
                          {entry.accountName}
                        </Link>
                      ) : (
                        <span>{entry.accountName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {entry.topHeroIds.slice(0, 4).map((hid) => {
                          const h = heroMap.get(hid);
                          if (!h) return null;
                          return (
                            <Link key={hid} href={`/heroes/${hid}`} title={h.name}>
                              {h.image && (
                                <img
                                  src={h.image}
                                  alt={h.name}
                                  className="h-7 w-7 rounded-[3px] border border-white/15 object-cover hover:border-amber-400"
                                />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-300">
                      {entry.badgeLevel !== null ? `Tier ${entry.badgeLevel}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}