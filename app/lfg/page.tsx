import type { Metadata } from "next";
import { connection } from "next/server";
import { getServerAuthUser } from "@/lib/backend/server";
import { fetchHeroesAssets, getPlayableHeroes, resolveHeroMedia } from "@/lib/deadlock";
import LfgClient, { type LfgHeroOption, type LfgPostItem } from "./LfgClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Procurar Duo / Time",
  description: "Encontre duo ou feche time para partidas e torneios de Deadlock por região, patente e heróis.",
};

async function fetchInitialLfg(): Promise<LfgPostItem[]> {
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/lfg`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as LfgPostItem[]) : [];
  } catch {
    return [];
  }
}

export default async function LfgPage() {
  await connection();
  const [heroesMap, user, initialPosts] = await Promise.all([
    fetchHeroesAssets(),
    getServerAuthUser(),
    fetchInitialLfg(),
  ]);

  const heroes: LfgHeroOption[] = getPlayableHeroes(heroesMap).map((h) => ({
    id: h.id,
    name: h.name,
    image: resolveHeroMedia(h).icon,
  }));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6 space-y-2">
        <p className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
          Comunidade
        </p>
        <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Procurar <span className="text-amber-500">Duo / Time</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
          Filtre por região, patente e heróis para encontrar parceiros de rota ou fechar time para torneios.
        </p>
      </header>

      <LfgClient heroes={heroes} initialPosts={initialPosts} initialUser={user} />
    </div>
  );
}