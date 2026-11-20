/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicProfileHandleBySteam } from "@/lib/backend/server";
import { extractColor, fetchHeroesAssets, fetchWikiColors } from "@/lib/deadlock";
import PlayerDeadlockStats from "@/app/profile/PlayerDeadlockStats";

export const instant = false;

const STEAM64_BASE = BigInt("76561197960265728");

function toAccountId(raw: string): string | null {
  const clean = raw.trim();
  if (!/^\d{3,20}$/.test(clean)) return null;
  try {
    const val = BigInt(clean);
    if (val > STEAM64_BASE) return (val - STEAM64_BASE).toString();
    return val > BigInt(0) ? val.toString() : null;
  } catch {
    return null;
  }
}

async function fetchSteamPlayer(accountId: string): Promise<{
  personaname?: string;
  avatarfull?: string;
  avatar?: string;
  profileurl?: string;
} | null> {
  try {
    const res = await fetch(
      `https://api.deadlock-api.com/v1/players/steam?account_ids=${accountId}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const arr = await res.json();
    return Array.isArray(arr) && arr[0] ? arr[0] : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ steamId: string }>;
}): Promise<Metadata> {
  const { steamId } = await params;
  const accountId = toAccountId(steamId);
  if (!accountId) return { title: "LockPro • Jogador não encontrado" };
  const steam = await fetchSteamPlayer(accountId);
  const name = steam?.personaname || `Jogador #${accountId}`;
  return {
    title: `LockPro • ${name}`,
    description: `Estatísticas públicas de ${name} no Deadlock: Win Rate, KDA, Almas/min, heróis mais jogados e aliados frequentes.`,
  };
}

export default async function PublicPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ steamId: string }>;
  searchParams: Promise<{ heroId?: string }>;
}) {
  const [{ steamId }, { heroId }] = await Promise.all([params, searchParams]);
  const accountId = toAccountId(steamId);
  if (!accountId) notFound();

  const linkedHandle = await getPublicProfileHandleBySteam(accountId);
  if (linkedHandle) {
    redirect(
      `/profile/${encodeURIComponent(linkedHandle)}${
        heroId ? `?heroId=${encodeURIComponent(heroId)}` : ""
      }`,
    );
  }

  const [steam, heroesMap, wikiColors] = await Promise.all([
    fetchSteamPlayer(accountId),
    fetchHeroesAssets(),
    fetchWikiColors(),
  ]);

  const heroes = Object.values(heroesMap)
    .filter(
      (h) =>
        h.player_selectable === true &&
        h.disabled !== true &&
        h.in_development !== true &&
        !h.name.startsWith("hero_"),
    )
    .map((h) => {
      const file = h.name.trim().replace(/ /g, "_");
      return {
        id: h.id,
        name: h.name,
        image:
          h.images?.icon_hero_card ||
          h.images?.icon_image_small ||
          h.images?.minimap_image ||
          "",
        banner:
          h.images?.background_image_webp ||
          h.images?.background_image ||
          "",
        art: `https://cdn.deadlock.wiki/thumb/${file}_Render.png/400px-${file}_Render.png`,
        rgb: extractColor(h, wikiColors) ?? undefined,
      };
    });

  const displayName = steam?.personaname || `Jogador #${accountId}`;
  const avatar = steam?.avatarfull || steam?.avatar || null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-5 md:px-8 md:py-6 space-y-5">
      <header className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-500/60 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-neutral-700 bg-neutral-900 font-deadlock text-xl font-black text-neutral-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-deadlock text-2xl sm:text-3xl font-black text-[#f4efe6]">
              {displayName}
            </h1>
            <p className="font-mono text-xs text-neutral-400">
              Deadlock Account ID: {accountId}
            </p>
          </div>
        </div>

        {steam?.profileurl && (
          <a
            href={steam.profileurl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[4px] border border-neutral-700 bg-[#070908] px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500 hover:text-amber-400 transition-colors"
          >
            Ver na Steam
          </a>
        )}
      </header>

      <PlayerDeadlockStats steamId={accountId} heroes={heroes} heroColor="#f59e0b" />
    </div>
  );
}