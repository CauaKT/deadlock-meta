"use client";

import { useState, useEffect } from "react";

export interface SourceEndpoint {
  title: string;
  url: string;
  useCase: string;
  cache: string;
}

export interface SourceGroup {
  id: string;
  name: string;
  domain: string;
  description: string;
  endpoints: SourceEndpoint[];
}

const GROUPS: SourceGroup[] = [
  {
    id: "deadlock-api",
    name: "Deadlock API (Comunitária)",
    domain: "api.deadlock-api.com",
    description: "API pública comunitária (não oficial) que fornece dados extraídos do jogo, métricas agregadas de partidas, perfis de jogadores e rankings.",
    endpoints: [
      {
        title: "Analytics de Heróis, Itens & Matchups",
        url: "https://api.deadlock-api.com/v1/analytics/{hero-stats,item-stats,hero-synergy-stats,hero-counter-stats}",
        useCase: "Win rate, pick rate, impacto de patches, builds populares, sinergias e counters por patch e faixa de patente.",
        cache: "Revalidação a cada 1 hora (3600s)",
      },
      {
        title: "Assets de Heróis, Armas, Habilidades & Loja",
        url: "https://api.deadlock-api.com/v1/assets/{heroes,items}?language=brazilian",
        useCase: "Nomes em pt-BR, atributos base, ganhos por bênção, escalas, upgrades T1–T3, armas primárias e catálogo completo da loja.",
        cache: "Cache em servidor de 24h (86400s)",
      },
      {
        title: "Jogadores, Leaderboard & Partidas",
        url: "https://api.deadlock-api.com/v1/{players,leaderboard,matches}",
        useCase: "Estatísticas por Steam ID, histórico recente, patente/MMR, ranking regional e metadados de partidas consumidos via camada normalizada da API.",
        cache: "Cache persistido no PostgreSQL (15m / 30m / 24h)",
      },
    ],
  },
  {
    id: "deadlock-wiki",
    name: "Deadlock Wiki (MediaWiki & CDN)",
    domain: "deadlock.wiki",
    description: "Wiki comunitária utilizada para extração dinâmica das cores oficiais dos heróis e artes em alta resolução.",
    endpoints: [
      {
        title: "Cores Oficiais dos Heróis (themes.css)",
        url: "https://deadlock.wiki/api.php?action=parse&page=Template:Infobox_hero/themes.css",
        useCase: "Extração dinâmica das variáveis de cores oficiais de cada personagem (--th-heroinfobox-*), sem mapas manuais.",
        cache: "Cache em memória de 24h no servidor",
      },
      {
        title: "Renders e Logos Vetoriais (CDN)",
        url: "https://cdn.deadlock.wiki",
        useCase: "Logos tipográficos vetoriais (.svg) e renders oficiais de corpo inteiro dos heróis.",
        cache: "Entrega direta via CDN externa da Wiki",
      },
    ],
  },
  {
    id: "lockpro-api",
    name: "LockPro API (Camada Própria & Cache)",
    domain: "deadlock-meta-api",
    description: "API NestJS + PostgreSQL do próprio projeto, responsável por normalizar dados externos com cache persistente e gerenciar contas, builds, tier lists e comunidade.",
    endpoints: [
      {
        title: "Camada Normalizada de Dados Externos",
        url: "/api/backend/external-data/{status,player,leaderboard,matches}",
        useCase: "Normaliza esquemas externos e persiste o cache no PostgreSQL (external_cache) para sobreviver a reinicializações.",
        cache: "15m (jogador) • 30m (leaderboard) • 24h (partidas)",
      },
      {
        title: "Contas, Comunidade & Conteúdo do Usuário",
        url: "/api/backend/{auth,profiles,tier-lists,builds,feed,friends}",
        useCase: "Autenticação httpOnly, perfis públicos, tier lists, builds, feed da comunidade e lista de amigos.",
        cache: "Tempo real em PostgreSQL (Neon)",
      },
    ],
  },
];

export default function SourcesAccordion() {
  // Por padrão, a Deadlock API já inicia expandida
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    "deadlock-api": true,
    "deadlock-wiki": false,
  });

  const toggle = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {GROUPS.map((group) => {
        const isOpen = openMap[group.id] ?? false;

        return (
          <div
            key={group.id}
            className="rounded-2xl border border-neutral-800/90 bg-neutral-900/50 shadow-xl backdrop-blur-sm overflow-hidden transition-all"
          >
            {/* Cabeçalho Clicável da Fonte */}
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-neutral-800/30 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-deadlock text-xl sm:text-2xl font-black text-[#f4efe6]">
                    {group.name}
                  </h2>
                  <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    {group.domain}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                    {group.endpoints.length} endpoints
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                  {group.description}
                </p>
              </div>

              {/* Setinha para Baixo / Cima */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-black/40 text-neutral-300 transition-transform duration-300 ease-in-out ${
                  isOpen ? "rotate-180 border-amber-500/70 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]" : ""
                }`}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </div>
            </button>

            {/* Conteúdo Expansível com animação suave de altura e opacidade */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100 border-t border-neutral-800/80"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="divide-y divide-neutral-800/80 bg-neutral-950/60 p-4 sm:p-6 space-y-4">
                  {group.endpoints.map((ep, i) => (
                    <div
                      key={i}
                      style={{
                        transitionDelay: isOpen ? `${i * 45}ms` : "0ms",
                      }}
                      className={`space-y-2 transition-all duration-300 ease-out ${
                        i > 0 ? "pt-4" : ""
                      } ${
                        isOpen
                          ? "translate-y-0 opacity-100"
                          : "translate-y-3 opacity-0"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <h3 className="font-deadlock text-base font-bold text-[#f4efe6]">
                          {ep.title}
                        </h3>
                        <span className="text-[10px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded w-fit">
                          {ep.cache}
                        </span>
                      </div>

                      <p className="font-mono text-[11px] text-neutral-400 bg-black/60 px-3 py-1.5 rounded border border-neutral-800/80 break-all select-all">
                        {ep.url}
                      </p>

                      <p className="text-xs text-neutral-300 leading-relaxed">
                        <strong className="text-neutral-400">O que alimenta:</strong> {ep.useCase}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const KNOWN_ROUTES: Record<string, string> = {
  "/": "a Tier List",
  "/heroes": "Heróis",
  "/items": "Itens",
  "/patches": "Patch Tracker",
  "/builds": "Builds",
  "/calculator": "Calculadora",
  "/tier-maker": "o TierMaker",
  "/feed": "o Feed",
  "/profile": "o Perfil",
};

export function BackButton() {
  const [targetLabel, setTargetLabel] = useState("a Tier List");
  const [targetHref, setTargetHref] = useState("/");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const last = sessionStorage.getItem("lockpro_last_path");
        if (last) {
          const cleanPath = last.split("?")[0];
          let label = KNOWN_ROUTES[cleanPath];
          if (!label && cleanPath.startsWith("/heroes/")) {
            label = "o Herói";
          }
          if (label) {
            setTargetLabel(label);
            setTargetHref(last);
          }
        }
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = targetHref;
    }
  };

  return (
    <a
      href={targetHref}
      onClick={handleClick}
      className="group inline-flex items-center gap-1.5 font-deadlock text-xs font-black uppercase tracking-wider text-amber-500 hover:text-amber-400 transition-colors mb-3 cursor-pointer"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13 5 8l5-5" />
      </svg>
      <span>Voltar para {targetLabel}</span>
    </a>
  );
}