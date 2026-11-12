// app/heroes/[id]/page.tsx
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import {
  fetchHeroDetails,
  fetchHeroesAssets,
  fetchHeroesAnalytics,
  fetchWikiColors,
  fetchHeroAbilitiesFull,
  fetchHeroWeapon,
  fetchHeroBuild,
  fetchHeroPatchHistory,
  extractColor,
  extractHeroTheme,
  ensureVibrantTextColor,
  TIER_THRESHOLDS,
  PATCHES,
} from "@/lib/deadlock";
import Link from "next/link";
import type { CSSProperties } from "react";
import AbilityBar from "./AbilityBar";
import LoreText from "./LoreText";
import HeroStats from "./HeroStats";
import HeroGuide from "./HeroGuide";
import HeroAtmosphere from "./HeroAtmosphere";
import HeroPatchEvolution from "./HeroPatchEvolution";
import NavButton from "./NavButton";
import fs from "fs";
import path from "path";

export const instant = false;

const TAG_ROTATIONS = ["-rotate-[3deg] sm:-rotate-[4deg]", "rotate-[3deg] sm:rotate-[4deg]", "-rotate-[2deg] sm:-rotate-[3deg]"];

function cleanText(text: any): string {
  if (!text) return "";
  let str = "";
  if (typeof text === "string") {
    str = text;
  } else if (typeof text === "object") {
    str = text.lore || text.en || text.desc || text.description || text.value || "";
  } else {
    str = String(text);
  }
  return str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

// Lê as tags oficiais do herói direto da API (tenta os nomes de campo mais prováveis)
function extractTags(h: any): string[] {
  if (!h) return [];
  const candidates = [
    h.tags,
    h.hero_tags,
    h.heroTags,
    h.traits,
    h.description?.tags,
    h.description?.hero_tags,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      return c
        .map((x: any) => (typeof x === "string" ? x : x?.name ?? x?.en ?? ""))
        .filter(Boolean)
        .slice(0, 3);
    }
  }
  return [];
}

function calculateTier(winRate: number) {
  if (winRate >= TIER_THRESHOLDS.META) return { label: "META", bg: "bg-cyan-400 text-black border-cyan-300" };
  if (winRate >= TIER_THRESHOLDS.A) return { label: "TIER A", bg: "bg-green-500 text-black border-green-400" };
  if (winRate >= TIER_THRESHOLDS.B) return { label: "TIER B", bg: "bg-lime-400 text-black border-lime-300" };
  if (winRate >= TIER_THRESHOLDS.C) return { label: "TIER C", bg: "bg-yellow-400 text-black border-yellow-300" };
  if (winRate >= TIER_THRESHOLDS.D) return { label: "TIER D", bg: "bg-orange-500 text-black border-orange-400" };
  return { label: "TIER F", bg: "bg-red-600 text-white border-red-500" };
}

export default async function HeroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ patch?: string }>;
}) {
  const { id } = await params;
  const { patch: patchParam } = await searchParams;
  const heroId = parseInt(id);

  // Mesmo recorte de datas da tier list
  const selectedPatch = PATCHES.find((p) => p.id === patchParam) ?? PATCHES[0];
  const selectedIndex = PATCHES.findIndex((p) => p.id === selectedPatch.id);
  const patchUntil =
    selectedPatch.since && selectedIndex > 0 ? PATCHES[selectedIndex - 1].since : undefined;

  const [heroDetails, heroesMap, stats, wikiColors] = await Promise.all([
    fetchHeroDetails(heroId),
    fetchHeroesAssets(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil),
    fetchWikiColors(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  const hero = heroDetails || heroesMap[heroId];
  const stat = stats.find((s) => s.hero_id === heroId);

  if (!hero) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center">
        <h1 className="text-3xl font-black text-rose-500">Herói Não Encontrado</h1>
        <Link
          href="/"
          className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
        >
          ← Voltar para a Tier List
        </Link>
      </div>
    );
  }

  const matches = stat?.matches || 0;
  const wins = stat?.wins ?? Math.round((matches * (stat?.win_rate ?? 50)) / 100);
  const winRate = stat?.win_rate ?? (matches > 0 ? (wins / matches) * 100 : 50);
  const tier = calculateTier(winRate);
  const enName = heroesMap[heroId]?.name ?? hero.name; // nome em inglês, para buscas e imagem

  const heroKey = enName.toLowerCase();

// 1. Títulos do herói (3 títulos oficiais)
  const apiTags = extractTags(hero);
  const heroTraits = apiTags;
  const heroTheme = extractHeroTheme(hero, wikiColors);
  const rgb = heroTheme.rgb;
  const tagBg = heroTheme.tagBg;
  const tagText = heroTheme.tagText;

  const rawLore = typeof hero.description === "object" ? hero.description?.lore : hero.description;
  const heroLore = cleanText(rawLore) || "Guerreiro destemido lutando nas ruas da Cidade Amaldiçoada em busca de almas para os rituais dos Patronos.";

 // 4. Imagem de Corpo Inteiro
  const heroSlug = enName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const formattedName = enName.trim().replace(/ /g, "_");
  const heroNameSvg = `https://cdn.deadlock.wiki/${formattedName}_name.svg`;
  let heroArt = `https://cdn.deadlock.wiki/thumb/${formattedName}_Render.png/800px-${formattedName}_Render.png`;

  if (fs.existsSync(heroesDir)) {
    const files = fs.readdirSync(heroesDir);
    const matched = files.find((f) => f.toLowerCase().startsWith(heroSlug));
    if (matched) heroArt = `/heroes/${matched}`;
  }

  const [abilities, weapon, build, patchHistory] = await Promise.all([
    fetchHeroAbilitiesFull(heroId, hero.items),
    fetchHeroWeapon(hero.items?.weapon_primary),
    fetchHeroBuild(heroesMap[heroId]?.popular_items),
    fetchHeroPatchHistory(heroId),
  ]);

  const weaponImage = hero.shop_stat_display?.weapon_stats_display?.weapon_image_webp;
  const weaponAttributes = hero.shop_stat_display?.weapon_stats_display?.weapon_attributes;
  const weaponTags: string[] = Array.isArray(weaponAttributes)
    ? weaponAttributes.filter((a: unknown): a is string => typeof a === "string")
    : [];

  return (
    <div className="relative max-w-6xl mx-auto p-4 md:p-10 space-y-10">
      <HeroAtmosphere rgb={rgb} />
      {/* Botão de Voltar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavButton href={`/?patch=${selectedPatch.id}`} label="Voltar para a Tier List" tagBg={tagBg} icon="back" />
        <NavButton href="/heroes" label="Todos os Heróis" tagBg={tagBg} icon="grid" flip />
      </div>

      {/* ========================================================================= */}
      {/* HERO BANNER PRINCIPAL COM 3 TÍTULOS E LORE EXPANSÍVEL                     */}
      {/* ========================================================================= */}
         <section
        className="dl-noise relative rounded-[3px_8px_3px_6px] border-2 overflow-hidden p-6 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8 min-h-[460px]"
        style={{
          borderColor: `color-mix(in srgb, ${tagBg} 45%, #1b2621)`,
          background: `radial-gradient(ellipse at 80% 45%, color-mix(in srgb, ${tagBg} 35%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, ${tagBg} 18%, #0c1110), #0c1110 70%)`,
        }}
      >
        
        {/* Badge do Tier fixado no canto superior direito */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20">
          <span className={`font-deadlock px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-xl ${tier.bg} ${tier.label === "META" ? "tier-meta-glow-strong" : ""}`}>
            {tier.label}
          </span>
        </div>

        <div className="flex-1 z-20 space-y-4 max-w-xl md:max-w-[min(50%,36rem)] md:flex md:flex-col md:justify-between">
          {heroTraits.length > 0 && (
            <div className="flex md:hidden flex-wrap items-center gap-2">
              {heroTraits.map((trait, i) => (
                <span
                  key={i}
                  style={{ backgroundColor: tagBg, color: tagText }}
                  className={`font-deadlock px-3 py-1 font-black text-[11px] tracking-wider uppercase shadow -skew-x-6 inline-block ${
                    TAG_ROTATIONS[i % TAG_ROTATIONS.length]
                  }`}
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          <div className="md:hidden pt-1">
            <img
              src={heroNameSvg}
              alt={enName}
              className="h-14 w-auto max-w-[240px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
            />
          </div>

          <LoreText text={heroLore} />

          <div className="pt-3 space-y-2 border-t border-neutral-800/60">
            <div className="flex justify-between items-end">
              <span className="text-xs font-extrabold uppercase text-neutral-400">Desempenho Geral</span>
              <span className={`font-deadlock text-xl font-black ${winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                {winRate.toFixed(1)}% <span className="text-xs text-neutral-500 font-semibold">Win Rate</span>
              </span>
            </div>
            
            <div className="w-full h-3 bg-neutral-950/80 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full rounded-full ${winRate >= 50 ? "bg-emerald-400" : "bg-rose-500"}`}
                style={{ width: `${Math.min(Math.max(winRate, 30), 70)}%` }}
              />
            </div>

            {/* Total de partidas (sem 'no patch') */}
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium pt-0.5">
              <span>Total de partidas:</span>
              <span className="font-extrabold text-neutral-200">
                {matches.toLocaleString()} jogos
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: arte preenchendo toda a metade direita do card */}
        <div className="pointer-events-none select-none absolute inset-y-0 right-0 w-full md:w-1/2 z-10">
          <img
            src={heroArt}
            alt={enName}
            className="h-full w-full object-cover object-top"
            style={{
              maskImage: "linear-gradient(to right, transparent, #000 40%)",
              WebkitMaskImage: "linear-gradient(to right, transparent, #000 40%)",
            }}
          />
          {/* No mobile, escurece a esquerda da arte para o texto continuar legível */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1110] via-[#0c1110]/40 to-transparent md:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0c1110] to-transparent md:hidden" />
        </div>

        <div className="hidden md:flex absolute bottom-6 right-6 z-20 max-w-[44%] flex-col items-end gap-3 pointer-events-none">
          <img
            src={heroNameSvg}
            alt={enName}
            className="h-24 w-52 sm:h-28 sm:w-64 lg:h-32 lg:w-72 max-w-full object-contain object-right drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)]"
          />
          <div className="flex flex-wrap justify-end gap-2.5">
            {heroTraits.map((trait, i) => (
              <span
                key={i}
                style={{ backgroundColor: tagBg, color: tagText }}
                className={`font-deadlock px-3.5 py-1 font-black text-[11px] tracking-wider uppercase shadow-lg -skew-x-6 inline-block ${
                  TAG_ROTATIONS[i % TAG_ROTATIONS.length]
                }`}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ATRIBUTOS DE COMBATE + BARRA COM FUSÃO DE CORES                            */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        {/* Título sem '(ESTATÍSTICAS BASE)' */}
        <h2 className="text-xl md:text-2xl font-black text-[#f4efe6]">
          Atributos de Combate
        </h2>

        <HeroStats
          stats={hero.starting_stats ?? {}}
          levelUp={hero.standard_level_up_upgrades ?? {}}
          weapon={weapon}
          weaponImage={weaponImage}
          weaponTags={weaponTags}
          accent={tagBg}
        />

      </section>

      {/* ========================================================================= */}
      {/* HABILIDADES REAIS DO HERÓI (SLOTS 1, 2, 3 E ULTIMATE)                     */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <h2 className="text-center text-xl md:text-2xl font-black text-[#f4efe6]">
          Habilidades
        </h2>
        <AbilityBar key={heroId} abilities={abilities} accent={tagBg} accentText={tagText} />
      </section>

      {/* Como jogar: classe, complexidade e itens mais escolhidos */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-black text-[#f4efe6]">Como Jogar de {enName}</h2>
        <HeroGuide
          heroType={heroesMap[heroId]?.hero_type}
          complexity={heroesMap[heroId]?.complexity}
          build={build}
          accent={tagBg}
        />
      </section>

      {/* Histórico de Patches & Mudança do Win Rate */}
      {patchHistory.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-[#f4efe6]">
            Mudança do Win Rate por Patch
          </h2>
          <HeroPatchEvolution history={patchHistory} accent={tagBg} />
        </section>
      )}
    </div>
  );
}