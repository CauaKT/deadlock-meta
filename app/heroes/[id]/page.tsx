// app/heroes/[id]/page.tsx
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import {
  fetchHeroDetails,
  fetchHeroesAssets,
  fetchHeroesAnalytics,
  fetchHeroAbilitiesFull,
  fetchHeroWeapon,
  TIER_THRESHOLDS,
  PATCHES,
} from "@/lib/deadlock";
import Link from "next/link";
import AbilityBar from "./AbilityBar";
import LoreText from "./LoreText";
import HeroStats from "./HeroStats";
import fs from "fs";
import path from "path";

export const instant = false;

function cleanText(text: any): string {
  if (!text) return "";
  let str = "";
  if (typeof text === "string") {
    str = text;
  } else if (typeof text === "object") {
    str = text.en || text.desc || text.description || text.lore || text.value || "";
  } else {
    str = String(text);
  }
  return str
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
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

// Lê a cor de interface do herói (RGB) direto da API
function extractColor(h: any): [number, number, number] | null {
  const c = h?.colors?.ui ?? h?.colors?.glow_team;
  if (Array.isArray(c) && c.length >= 3) {
    const [r, g, b] = c.map(Number);
    if ([r, g, b].every(Number.isFinite)) return [r, g, b];
  }
  return null;
}

function getDamageProfile(heroName: string) {
  const name = heroName.toLowerCase();
  const spiritHeroes = ["sinclair", "lady geist", "seven", "dynamo", "kelvin", "grey talon", "pocket", "paradox"];
  const weaponHeroes = ["haze", "wraith", "infernus", "vindicta", "mcginnis", "mirage", "ivy"];

  if (spiritHeroes.some((h) => name.includes(h))) {
    return {
      type: "Dano de Espírito (Spirit)",
      desc: "A maior parte do impacto deste herói escala com Poder de Espírito (Itens Roxos). Suas habilidades causam dano massivo e debuffs contínuos.",
      badge: "text-purple-400 bg-purple-950/60 border border-purple-800/60",
      barStyle: "bg-purple-500",
      percent: 85,
    };
  }

  if (weaponHeroes.some((h) => name.includes(h))) {
    return {
      type: "Dano de Armamento (Weapon)",
      desc: "O dano principal vem de sua arma de fogo (Itens Laranjas). Focado em cadência de tiro, acertos críticos e velocidade de projétil.",
      badge: "text-amber-400 bg-amber-950/60 border border-amber-800/60",
      barStyle: "bg-amber-500",
      percent: 85,
    };
  }

  // Híbrido: FUSÃO EXATA DE LARANJA (ARMA) COM ROXO (ESPÍRITO)
  return {
    type: "Dano Híbrido (Armamento & Espírito)",
    desc: "Combina trocas com arma e dano de feitiços. Escala de forma balanceada tanto com itens de Armamento (Laranja) quanto de Espírito (Roxo).",
    badge: "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 border border-pink-500/40 bg-[#161219]",
    barStyle: "bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600",
    percent: 65,
  };
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

  const [heroDetails, heroesMap, stats] = await Promise.all([
    fetchHeroDetails(heroId),
    fetchHeroesAssets(),
    fetchHeroesAnalytics(selectedPatch.since, patchUntil),
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
  const damageProfile = getDamageProfile(enName);

  const heroKey = enName.toLowerCase();

  // 1. Títulos do herói (3 títulos oficiais)
  const apiTags = extractTags(heroesMap[heroId]);
  const heroTraits = apiTags;
  const rgb = extractColor(heroesMap[heroId]) ?? extractColor(hero);
  const tagBg = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : "#f1d36b";
  const luminance = rgb ? 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] : 200;
  const tagText = luminance > 150 ? "#1a1608" : "#ffffff";

  // 2. Lore tratada e traduzida
  const rawLore = typeof hero.description === "object" ? hero.description?.lore : hero.description;
  const heroLore = cleanText(rawLore) || "Guerreiro destemido lutando nas ruas da Cidade Amaldiçoada em busca de almas para os rituais dos Patrões.";

  // 3. Playstyle real e tático
  const rawPlaystyle = typeof hero.description === "object" ? hero.description?.playstyle : "";
  const heroPlaystyle = cleanText(rawPlaystyle) || `Foque no controle de rotas no início do jogo, utilize as tirolesas para emboscadas e monte seus itens essenciais antes das disputas da Urna no centro do mapa.`;

 // 4. Imagem de Corpo Inteiro
  const heroSlug = enName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const formattedName = enName.trim().replace(/ /g, "_");
  let heroArt = `https://cdn.deadlock.wiki/thumb/${formattedName}_Render.png/800px-${formattedName}_Render.png`;

  if (fs.existsSync(heroesDir)) {
    const files = fs.readdirSync(heroesDir);
    const matched = files.find((f) => f.toLowerCase().startsWith(heroSlug));
    if (matched) heroArt = `/heroes/${matched}`;
  }

  const abilities = await fetchHeroAbilitiesFull(heroId, hero.items);
  const weapon = await fetchHeroWeapon(hero.items?.weapon_primary);
  const weaponImage = hero.shop_stat_display?.weapon_stats_display?.weapon_image_webp;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-10">
      {/* Botão de Voltar */}
      <div>
        <Link
          href={`/?patch=${selectedPatch.id}`}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 transition-all shadow-md group"
        >
          <span className="text-amber-500 group-hover:-translate-x-0.5 transition-transform">←</span>
          <span>Voltar para a Tier List</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* HERO BANNER PRINCIPAL COM 3 TÍTULOS E LORE EXPANSÍVEL                     */}
      {/* ========================================================================= */}
      <section className="relative rounded-3xl border border-[#23352c] bg-gradient-to-r from-[#0c120f] via-[#0e1613] to-[#121c17] overflow-hidden p-6 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col md:flex-row items-center justify-between gap-8 min-h-[460px]">
        
        {/* Lado Esquerdo: Identidade do Herói */}
        <div className="flex-1 z-20 space-y-4 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tag do Tier */}
            <span className={`font-deadlock px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${tier.bg}`}>
              {tier.label}
            </span>

            {/* Os 3 Títulos Oficiais do Herói (Estilo da imagem de referência) */}
            {heroTraits.map((trait, i) => (
              <span
                key={i}
                style={{ backgroundColor: tagBg, color: tagText }}
                className="md:hidden font-deadlock px-3 py-1 font-black text-[11px] tracking-wider uppercase shadow -skew-x-6"
              >
                {trait}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#f4efe6]">
            {enName}
          </h1>

          {/* Lore do herói (altura inicial fixa, expande com animação) */}
          <LoreText text={heroLore} />

          {/* Barra de Desempenho Geral + Apenas o Total de Partidas abaixo */}
          <div className="pt-2 space-y-2 border-t border-neutral-800/60">
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
        <div className="pointer-events-none select-none absolute inset-y-0 right-0 w-full md:w-1/2 z-0">
          <img
            src={heroArt}
            alt={enName}
            className="h-full w-full object-cover object-top"
          />
          {/* Fusão com o fundo do card (esquerda e embaixo no mobile) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e1613] via-[#0e1613]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#121c17] to-transparent md:hidden" />
        </div>

        {/* Tags oficiais no canto inferior direito (só em telas grandes) */}
        <div className="hidden md:flex absolute bottom-6 right-6 z-20 max-w-[45%] flex-wrap justify-end gap-2">
          {heroTraits.map((trait, i) => (
            <span
              key={i}
              style={{ backgroundColor: tagBg, color: tagText }}
              className="font-deadlock px-3 py-1 font-black text-[11px] tracking-wider uppercase shadow-lg -skew-x-6"
            >
              {trait}
            </span>
          ))}
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
          accent={tagBg}
        />

        {/* Barra de Escalonamento com Fusão de Cores */}
        <div className="rounded-2xl border border-neutral-800/80 bg-[#0e1512]/90 p-5 space-y-2.5 backdrop-blur-sm shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
              Escalonamento de Dano Principal
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide ${damageProfile.badge}`}>
              {damageProfile.type}
            </span>
          </div>

          <div className="w-full h-3 bg-neutral-950/80 rounded-full overflow-hidden border border-neutral-800">
            <div
              className={`h-full rounded-full ${damageProfile.barStyle}`}
              style={{ width: `${damageProfile.percent}%` }}
            />
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed pt-0.5">
            {damageProfile.desc}
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HABILIDADES REAIS DO HERÓI (SLOTS 1, 2, 3 E ULTIMATE)                     */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <h2 className="text-center text-xl md:text-2xl font-black text-[#f4efe6]">
          Habilidades
        </h2>
        <AbilityBar key={heroId} abilities={abilities} heroKey={heroKey} />
      </section>

      {/* ========================================================================= */}
      {/* GUIA DE ESTILO DE JOGO REAL DO PERSONAGEM (PLAYSTYLE)                     */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-neutral-800/80 bg-[#0c120f]/80 p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-black text-[#f4efe6] uppercase tracking-wider flex items-center gap-2">
          <span className="text-amber-500">✦</span> Como Jogar de {enName} (Playstyle)
        </h3>
        <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
          {heroPlaystyle}
        </p>
      </section>
    </div>
  );
}