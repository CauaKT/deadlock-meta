import type { Metadata } from "next";
import { getServerPatchNoteTranslation } from "@/lib/backend/server";
import {
  extractColor,
  fetchHeroesAssets,
  fetchPatchHeroAbilities,
  fetchShopItems,
  fetchSteamPatchNotes,
  fetchWikiColors,
  fetchWikiPatchUpdates,
  resolveHeroMedia,
  type SteamPatchNote,
  type WikiPatchClassification,
} from "@/lib/deadlock";
import PatchNotesClient, {
  type PatchHeroRef,
  type PatchItemRef,
} from "./PatchNotesClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Patch Notes Oficiais",
  description:
    "Todas as notas oficiais de atualização do Deadlock organizadas por seção, herói e item, com busca e filtro instantâneo.",
};

function extractTitleDateIso(title: string): string | null {
  const m = title.match(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatPstDateIso(unixSec: number): string | null {
  if (!Number.isFinite(unixSec) || unixSec <= 0) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(unixSec * 1000));
  } catch {
    return null;
  }
}

function matchWikiPatchForNote(
  note: SteamPatchNote,
  wikiRows: WikiPatchClassification[],
): WikiPatchClassification | null {
  const candidates = [
    extractTitleDateIso(note.title),
    formatPstDateIso(note.unixTimestamp),
    note.publishedAt.slice(0, 10),
  ].filter((d): d is string => Boolean(d));

  for (const dateIso of candidates) {
    const matches = wikiRows.filter((r) => r.dateIso === dateIso && !r.undocumented);
    if (matches.length === 0) continue;
    matches.sort((a, b) => {
      const scoreA = a.buffs.length + a.nerfs.length + a.adjs.length + a.fixes.length + a.newHeroes.length;
      const scoreB = b.buffs.length + b.nerfs.length + b.adjs.length + b.fixes.length + b.newHeroes.length;
      return scoreB - scoreA;
    });
    return matches[0];
  }
  return null;
}

export default async function PatchNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ patch?: string }>;
}) {
  const [
    { patch: patchParam },
    notes,
    heroesMap,
    shopItems,
    wikiColors,
    abilitiesByHero,
    wikiUpdates,
  ] = await Promise.all([
    searchParams,
    fetchSteamPatchNotes(),
    fetchHeroesAssets(),
    fetchShopItems(),
    fetchWikiColors(),
    fetchPatchHeroAbilities(),
    fetchWikiPatchUpdates(),
  ]);

  const heroLinks: Record<string, PatchHeroRef> = {};
  for (const h of Object.values(heroesMap)) {
    if (!h?.name || h.name.startsWith("hero_")) continue;
    const media = resolveHeroMedia(h);
    const safeBg =
      media.bg &&
      media.bg.startsWith(
        "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/backgrounds/",
      )
        ? media.bg
        : null;
    const heroImgs = ((h as { images?: Record<string, unknown> }).images ?? {}) as Record<
      string,
      string | undefined
    >;
    const ref: PatchHeroRef = {
      id: h.id,
      name: h.name,
      image: media.icon ?? (media.card || null),
      portrait: media.card || media.icon || null,
      gloatImage: heroImgs.hero_card_gloat_webp || heroImgs.hero_card_gloat || null,
      critImage: heroImgs.hero_card_critical_webp || heroImgs.hero_card_critical || null,
      bg: safeBg,
      rgb: extractColor(h, wikiColors),
      abilities: abilitiesByHero[h.id] ?? [],
    };
    heroLinks[h.name.toLowerCase()] = ref;
    if (/^the\s+/i.test(h.name)) {
      heroLinks[h.name.replace(/^the\s+/i, "").toLowerCase()] = ref;
    }
  }

  const itemLinks: Record<string, PatchItemRef> = {};
  for (const item of shopItems) {
    const ref: PatchItemRef = {
      className: item.className,
      name: item.name,
      nameEn: item.sortName || item.name,
      image: item.image,
      slot: item.slot,
      cost: item.cost,
      tier: item.tier,
    };
    if (item.sortName) itemLinks[item.sortName.toLowerCase()] = ref;
    if (item.name) itemLinks[item.name.toLowerCase()] = ref;
  }

  const wikiByGid: Record<string, WikiPatchClassification> = {};
  for (const note of notes) {
    const matched = matchWikiPatchForNote(note, wikiUpdates);
    if (matched) wikiByGid[note.id] = matched;
  }

  const initialActiveId =
    (patchParam && notes.some((n) => n.id === patchParam)
      ? patchParam
      : notes[0]?.id) ?? "";
  const initialTr = initialActiveId
    ? await getServerPatchNoteTranslation(initialActiveId)
    : null;
  const initialTranslations =
    initialTr && initialTr.available ? { [initialTr.gid]: initialTr } : undefined;

  return (
    <PatchNotesClient
      notes={notes}
      heroLinks={heroLinks}
      itemLinks={itemLinks}
      wikiByGid={wikiByGid}
      initialPatchId={patchParam}
      initialTranslations={initialTranslations}
    />
  );
}