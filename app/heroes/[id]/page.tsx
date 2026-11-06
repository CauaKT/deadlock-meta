// app/heroes/[id]/page.tsx
/* eslint-disable @next/next/no-img-element */
import {
  fetchHeroDetails,
  fetchHeroesAssets,
  fetchHeroesAnalytics,
  fetchHeroAbilities,
  HeroAbility,
} from "@/lib/deadlock";
import Link from "next/link";
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

// Títulos oficiais dos heróis (3 títulos por herói no padrão da imagem de referência)
const HERO_TRAITS_DB: Record<string, string[]> = {
  "rat king": ["SCRAPPY", "REGAL", "TENACIOUS"],
  "abrams": ["BRAWLER", "MELEE", "SUSTAIN"],
  "infernus": ["SKIRMISHER", "DOT", "FAST"],
  "seven": ["AOE", "PUSHER", "LIGHTNING"],
  "haze": ["STEALTH", "GANKER", "BULLET"],
  "vindicta": ["SNIPER", "FLIGHT", "EXECUTE"],
  "yamato": ["ASSASSIN", "INVULNERABLE", "MELEE"],
  "bebop": ["DISPLACEMENT", "HOOK", "BURST"],
  "ivy": ["SUPPORT", "HEALER", "TETHER"],
  "lady geist": ["DRAIN", "BLOOD", "SUSTAIN"],
  "kelvin": ["FROST", "SLOW", "TERRAIN"],
  "mcginnis": ["TURRETS", "SIEGE", "HEALER"],
  "lash": ["MOBILITY", "ENGAGE", "BURST"],
  "pocket": ["ELUSIVE", "BURST", "AOE"],
  "paradox": ["SWAP", "TIME", "UTILITY"],
  "dynamo": ["BLACK HOLE", "HEALER", "INITIATOR"],
  "warden": ["LOCKDOWN", "BRAWLER", "SHIELD"],
  "wraith": ["DUELIST", "TELEPORT", "CARDS"],
  "shiv": ["BLEED", "RAGE", "FINISHER"],
  "viscous": ["GOO", "INVULNERABLE", "BOUNCE"],
  "grey talon": ["SNIPER", "TRAPS", "SPIRIT"],
  "mirage": ["TELEPORT", "TORNADO", "SUSTAINED"],
  "sinclair": ["ILLUSION", "MISDIRECTION", "HEX"],
};

// Lore oficial traduzida
const HERO_LORE_DB: Record<string, string> = {
  "rat king":
    "O enigmático soberano dos esgotos de Nova York, o Rei Rato (Rat King) ergue-se sobre seus súditos em tamanho, força e ambição imperial. Não mais contente em viver isolado na escuridão subterrânea, o monarca revelou sua visão ousada para um futuro onde seus irmãos possam caminhar livremente pela superfície sem o terror das vans de extermínio humano. Com a promessa de liderar sua horda e reivindicar o território da cidade de volta, ele marcha para o ritual das almas com determinação inabalável.",
  "abrams":
    "Detetive experiente nas noites sombrias da Cidade Amaldiçoada, Abrams carrega consigo o lendário Tomo dos Patrões. Ele investiga os mistérios ocultos e assassinatos ritualísticos sem recuar diante das ameaças mais brutais do submundo.",
};

// Gameplay / Playstyle oficial traduzido
const HERO_PLAYSTYLE_DB: Record<string, string> = {
  "rat king":
    "Rat King domina o combate através de enxames e controle de território. Use suas habilidades de infestação para causar dano contínuo e pressionar oponentes para fora de suas coberturas. Aproveite sua mobilidade subterrânea para emboscar atiradores frágeis na retaguarda e utilize sua Suprema para instaurar o caos absoluto em lutas de equipe em volta dos objetivos centrais.",
  "abrams":
    "Abrams é o lutador da linha de frente por excelência. Aproxime-se com investidas pesadas, alterne seus socos corpo a corpo com tiros de espingarda e sustente-se nas trocas longas com seu roubo de vida passivo.",
};

// Habilidades oficiais detalhadas caso a API não entregue o JSON completo
const HERO_ABILITIES_DB: Record<string, HeroAbility[]> = {
  "rat king": [
    { id: 1, slot: 1, name: "Infestação de Ratos", description: "Lança um projétil rastejante de pragas que persegue o alvo mais próximo, causando dano ao longo do tempo e revelando a posição do inimigo através das paredes." },
    { id: 2, slot: 2, name: "Toca Subterrânea", description: "Mergulha no chão tornando-se inalvejável e ganhando velocidade de movimento antes de irromper na superfície derrubando inimigos próximos." },
    { id: 3, slot: 3, name: "Guarda Real", description: "Invoca roedores de guarda que absorvem projéteis de bala inimigos e concedem bônus de cadência de disparo e armadura." },
    { id: 4, slot: 4, name: "Reino da Peste", description: "Libera uma tempestade devastadora de pestilência em uma área massiva, aplicando lentidão pesada e dano de espírito acumulativo em todos os heróis apanhados." },
  ],
};

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
  if (winRate >= 53.5) return { label: "META", bg: "bg-cyan-400 text-black border-cyan-300" };
  if (winRate >= 51.5) return { label: "TIER A", bg: "bg-green-500 text-black border-green-400" };
  if (winRate >= 50.0) return { label: "TIER B", bg: "bg-lime-400 text-black border-lime-300" };
  if (winRate >= 48.5) return { label: "TIER C", bg: "bg-yellow-400 text-black border-yellow-300" };
  if (winRate >= 47.0) return { label: "TIER D", bg: "bg-orange-500 text-black border-orange-400" };
  return { label: "TIER F", bg: "bg-red-600 text-white border-red-500" };
}

export default async function HeroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const heroId = parseInt(id);

  const [heroDetails, heroesMap, stats, apiAbilities] = await Promise.all([
    fetchHeroDetails(heroId),
    fetchHeroesAssets(),
    fetchHeroesAnalytics(),
    fetchHeroAbilities(heroId),
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
  const damageProfile = getDamageProfile(hero.name);

  const heroKey = hero.name.toLowerCase();

  // 1. Títulos do herói (3 títulos oficiais)
  const heroTraits = HERO_TRAITS_DB[heroKey] || ["VERSÁTIL", "COMBATENTE", "TATICO"];

  // 2. Lore tratada e traduzida
  const rawLore = typeof hero.description === "object" ? hero.description?.lore : hero.description;
  const heroLore = HERO_LORE_DB[heroKey] || cleanText(rawLore) || "Guerreiro destemido lutando nas ruas da Cidade Amaldiçoada em busca de almas para os rituais dos Patrões.";

  // 3. Playstyle real e tático
  const rawPlaystyle = typeof hero.description === "object" ? hero.description?.playstyle : "";
  const heroPlaystyle = HERO_PLAYSTYLE_DB[heroKey] || cleanText(rawPlaystyle) || `Foque no controle de rotas no início do jogo, utilize as tirolesas para emboscadas e monte seus itens essenciais antes das disputas da Urna no centro do mapa.`;

  // 4. Imagem de Corpo Inteiro
  const heroSlug = hero.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const formattedName = hero.name.trim().replace(/ /g, "_");
  let heroArt = `https://cdn.deadlock.wiki/thumb/${formattedName}_Render.png/800px-${formattedName}_Render.png`;

  if (fs.existsSync(heroesDir)) {
    const files = fs.readdirSync(heroesDir);
    const matched = files.find((f) => f.toLowerCase().startsWith(heroSlug));
    if (matched) heroArt = `/heroes/${matched}`;
  }

// 5. Habilidades reais (com proteção contra descrições vazias da API)
  const abilities = apiAbilities.length > 0
    ? apiAbilities.map((ab, idx) => ({
        id: ab.id || idx + 1,
        slot: ab.slot || idx + 1,
        name: cleanText(ab.name) || `Habilidade #${idx + 1}`,
        description: cleanText(ab.description) || HERO_ABILITIES_DB[heroKey]?.[idx]?.description || "Habilidade tática para combate, trocas e controle de mapa.",
      }))
    : HERO_ABILITIES_DB[heroKey] || [
        { id: 1, slot: 1, name: "Disparo Tático", description: "Dispara uma rajada concentrada que causa dano ao alvo e enfraquece suas defesas." },
        { id: 2, slot: 2, name: "Mobilidade Ágil", description: "Avança rapidamente na direção escolhida ganhando bônus temporário de cadência e esquiva." },
        { id: 3, slot: 3, name: "Fortificação de Almas", description: "Canaliza essência das almas para criar uma barreira protetora que absorve dano recebido." },
        { id: 4, slot: 4, name: "Impacto Ritualístico (Ultimate)", description: "Concede poder supremo por breve período, amplificando todo o dano causado e dizimando alvos agrupados." },
      ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-10">
      {/* Botão de Voltar */}
      <div>
        <Link
          href="/"
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
            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${tier.bg}`}>
              {tier.label}
            </span>

            {/* Os 3 Títulos Oficiais do Herói (Estilo da imagem de referência) */}
            {heroTraits.map((trait, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full bg-rose-600/90 border border-rose-500/40 text-white font-black text-[10px] tracking-wider uppercase shadow"
              >
                {trait}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#f4efe6]">
            {hero.name}
          </h1>

          {/* Lore com resumo e botão 'Ler mais' expansível */}
          <div className="bg-[#0a0f0d]/60 rounded-2xl p-4 border border-neutral-800/60 backdrop-blur-sm">
            <details className="group cursor-pointer">
              <summary className="list-none text-sm text-neutral-300 leading-relaxed font-normal">
                <p className="line-clamp-3 group-open:hidden">
                  {heroLore}
                </p>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mt-2 group-open:hidden">
                  + Ler mais da história
                </div>
              </summary>
              <div className="text-sm text-neutral-300 leading-relaxed font-normal space-y-2 pt-1 border-t border-neutral-800/60 mt-2">
                <p>{heroLore}</p>
                <div className="text-amber-400/80 font-bold text-xs uppercase tracking-wider pt-2">
                  - Recolher texto ↑
                </div>
              </div>
            </details>
          </div>

          {/* Barra de Desempenho Geral + Apenas o Total de Partidas abaixo */}
          <div className="pt-2 space-y-2 border-t border-neutral-800/60">
            <div className="flex justify-between items-end">
              <span className="text-xs font-extrabold uppercase text-neutral-400">Desempenho Geral</span>
              <span className={`text-xl font-black ${winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
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

        {/* Lado Direito: A Arte Oficial com Moldura e Fundo Integrado (Sem bug de corte) */}
        <div className="relative w-full md:w-1/2 h-[380px] md:h-[460px] flex items-center justify-center md:justify-end z-10 select-none">
          <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative w-full h-full flex items-center justify-center md:justify-end overflow-hidden">
            <img
              src={heroArt}
              alt={hero.name}
              className="h-full w-auto max-h-[460px] object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] pointer-events-none"
            />
            {/* Fusão na base para acabamento perfeito */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0e1613] to-transparent pointer-events-none" />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Armamento */}
          <div className="rounded-2xl border border-amber-900/40 bg-neutral-900/40 p-5 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-amber-400 border-b border-amber-900/30 pb-3">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">Armamento</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Dano por Tiro:</span>
                <span className="font-black text-neutral-200">Alto</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Cadência de Disparo:</span>
                <span className="font-black text-neutral-200">Média / Automática</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Capacidade do Pente:</span>
                <span className="font-black text-neutral-200">Padrão</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Velocidade de Projétil:</span>
                <span className="font-black text-neutral-200">Rápida</span>
              </div>
            </div>
          </div>

          {/* 2. Vitalidade */}
          <div className="rounded-2xl border border-emerald-900/40 bg-neutral-900/40 p-5 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-emerald-400 border-b border-emerald-900/30 pb-3">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">Vitalidade</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Vida Máxima Base:</span>
                <span className="font-black text-emerald-400">600 HP</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Regeneração por Seg:</span>
                <span className="font-black text-neutral-200">2.0 HP/s</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Armadura de Bala:</span>
                <span className="font-black text-neutral-200">0%</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Resistência a Espírito:</span>
                <span className="font-black text-neutral-200">0%</span>
              </div>
            </div>
          </div>

          {/* 3. Espírito */}
          <div className="rounded-2xl border border-purple-900/40 bg-neutral-900/40 p-5 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-purple-400 border-b border-purple-900/30 pb-3">
              <span className="w-3 h-3 rounded-sm bg-purple-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">Espírito</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Poder de Espírito Base:</span>
                <span className="font-black text-purple-400">0</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Velocidade de Movimento:</span>
                <span className="font-black text-neutral-200">7.2 m/s</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Barras de Estamina (Dash):</span>
                <span className="font-black text-neutral-200">3 Barras</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Dano Corpo a Corpo:</span>
                <span className="font-black text-neutral-200">50 / 116 Forte</span>
              </div>
            </div>
          </div>
        </div>

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
        <h2 className="text-xl md:text-2xl font-black text-[#f4efe6]">
          Habilidades & Feitiços
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {abilities.map((ability, idx) => (
            <div
              key={ability.id || idx}
              className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 space-y-3 hover:border-amber-500/40 transition-colors backdrop-blur-sm shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#121c17] border border-[#23352c] flex items-center justify-center font-black text-amber-400 text-sm shadow">
                    {idx === 3 ? "ULT" : idx + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#f4efe6]">
                      {ability.name}
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                      Slot {idx === 3 ? "Supremo" : `#${idx + 1}`}
                    </span>
                  </div>
                </div>

                {idx === 3 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-400">
                    Ultimate
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                {ability.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* GUIA DE ESTILO DE JOGO REAL DO PERSONAGEM (PLAYSTYLE)                     */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-neutral-800/80 bg-[#0c120f]/80 p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-black text-[#f4efe6] uppercase tracking-wider flex items-center gap-2">
          <span className="text-amber-500">✦</span> Como Jogar de {hero.name} (Playstyle)
        </h3>
        <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
          {heroPlaystyle}
        </p>
      </section>
    </div>
  );
}