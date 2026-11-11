"use client";

import { useState } from "react";

type GuideTab = "basics" | "moba";

interface MobaComparison {
  concept: string;
  deadlock: string;
  lol: string;
  dota: string;
  explanation: string;
}

const COMPARISONS: MobaComparison[] = [
  {
    concept: "Recurso Principal",
    deadlock: "Almas (Souls)",
    lol: "Ouro + EXP separados",
    dota: "Gold + EXP separados",
    explanation: "Em Deadlock, Almas funcionam simultaneamente como dinheiro para comprar itens na loja e pontos para subir de nível e liberar habilidades.",
  },
  {
    concept: "Farm & Negativas",
    deadlock: "Last Hit + Tiro no Orbe (Deny)",
    lol: "Last Hit sem Deny",
    dota: "Last Hit + Deny batendo no próprio creep",
    explanation: "Ao abater uma tropa, parte das almas sobe em um orbe flutuante. Atire nele para garantir. O adversário pode atirar no seu orbe para roubar o recurso.",
  },
  {
    concept: "Dano & Poder",
    deadlock: "Arma (Weapon) e Espírito (Spirit)",
    lol: "Dano de Ataque (AD) e Poder de Habilidade (AP)",
    dota: "Dano Físico / Mágico / Atributos",
    explanation: "Arma escala seus tiros básicos. Espírito escala suas 4 habilidades, efeitos passivos e o poder dos itens ativos.",
  },
  {
    concept: "Torres da Rota",
    deadlock: "Guardião (Guardian) e Andarilho (Walker)",
    lol: "Torre T1 e Torre T2",
    dota: "Torre Tier 1 e Torre Tier 2",
    explanation: "O Guardião defende a linha de frente. O Andarilho é uma fortaleza gigante que ataca com lasers de área e pisões em curto alcance.",
  },
  {
    concept: "Defesas da Base",
    deadlock: "Guardiões da Base + Santuários (Shrines)",
    lol: "Torres de Inibidor + Inibidores",
    dota: "Torres Tier 3 + Barracas (Barracks)",
    explanation: "Antes de atingir o Patrono inimigo, você precisa derrubar a defesa da base e destruir os dois Santuários para quebrar a imunidade do objetivo final.",
  },
  {
    concept: "Objetivo Principal",
    deadlock: "Patrono (Patron)",
    lol: "Nexus",
    dota: "Ancestral (Ancient)",
    explanation: "O Patrono possui duas fases: a primeira na superfície e a segunda vulnerável no solo dentro do poço da base inimiga.",
  },
  {
    concept: "Grande Chefe Neutro",
    deadlock: "Chefe Central (Mid Boss)",
    lol: "Barão Na'Shor",
    dota: "Roshan",
    explanation: "Ao derrotá-lo, surge o Rejuvenescedor (Rejuvenator). O time precisa acertar um golpe corpo a corpo pesado para reivindicá-lo, permitindo roubos emocionantes.",
  },
  {
    concept: "Objetivo de Mapa Móvel",
    deadlock: "Urna de Almas (Soul Urn)",
    lol: "Dragões / Arauto",
    dota: "Runas / Roshan Aghanims",
    explanation: "Uma urna surge no mapa e deve ser transportada a pé até o lado oposto. O carregador não pode atirar, mas entrega almas para todo o time e pontos de habilidade.",
  },
  {
    concept: "Imunidade a Controle (CC)",
    deadlock: "Item Ativo: Inabalável (Unstoppable)",
    lol: "Bandana de Mercúrio / Feitiço Purificar",
    dota: "Black King Bar (BKB)",
    explanation: "Item ativo essencial no meio e fim de jogo para não ser interrompido por atordoamentos ou silêncios durante canalizações e avanços.",
  },
  {
    concept: "Mobilidade e Flash",
    deadlock: "Pedra de Translocação / Salto Majestoso",
    lol: "Feitiço de Invocador Flash",
    dota: "Blink Dagger",
    explanation: "Não há feitiços pré-jogo: mobilidade adicional é comprada na loja de itens conforme a necessidade da partida.",
  },
];

export default function GuideTabs() {
  const [tab, setTab] = useState<GuideTab>("basics");

  return (
    <div className="space-y-6">
      <div role="tablist" className="inline-flex overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/80">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "basics"}
          onClick={() => setTab("basics")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors sm:px-5 sm:text-sm ${
            tab === "basics" ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          Como Jogar Deadlock
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "moba"}
          onClick={() => setTab("moba")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors sm:px-5 sm:text-sm ${
            tab === "moba" ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          Transição LoL / Dota 2
        </button>
      </div>

      {tab === "basics" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              1. O Ciclo do Jogo e Objetivo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Deadlock é um MOBA 6v6 em terceira pessoa com mecânica de tiro tático. O objetivo de cada partida é destruir o <strong>Patrono (Patron)</strong> da base adversária. Para alcançar a base inimiga, seu time precisa avançar pelas 4 rotas da cidade, derrubando estruturas defensivas sequenciais:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">1º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Guardiões (Guardians)</p>
                <p className="mt-1 text-xs text-neutral-400">Primeira torre de cada rota. Dê prioridade a usar suas tropas como escudo.</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">2º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Andarilhos (Walkers)</p>
                <p className="mt-1 text-xs text-neutral-400">Estruturas móveis gigantes. Liberam um slot de item Flexível ao serem destruídos.</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">3º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Santuários (Shrines)</p>
                <p className="mt-1 text-xs text-neutral-400">Dois núcleos na entrada da base que protegem o Patrono com invulnerabilidade.</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">Objetivo Final</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">O Patrono (Patron)</p>
                <p className="mt-1 text-xs text-neutral-400">Monstro sagrado na base. Derrube a primeira barra e depois destrua seu núcleo no chão.</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              2. Economia de Almas & Negativas (Denies)
            </h2>
            <div className="mt-3 space-y-3 text-sm text-neutral-300">
              <p>
                Em Deadlock, você não acumula ouro e experiência separadamente: tudo é <strong>Almas (Souls)</strong>. Suas almas totais determinam tanto seu nível de herói quanto seu poder de compra na loja.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-xs sm:text-sm text-neutral-300">
                <li>
                  <strong>Orbes de Almas:</strong> Nos primeiros 10 minutos, ao matar uma tropa (Trooper), parte do valor entra direto e parte sobe como uma esfera flutuante. Atire nela para garantir.
                </li>
                <li>
                  <strong>Negativa (Deny):</strong> Quando a tropa inimiga morre, ela solta uma esfera alaranjada para você. Se você atirar nela antes do oponente, você rouba 100% daquela alma, deixando-o sem recurso.
                </li>
                <li>
                  <strong>Caixas e Ícones de Ouro:</strong> Espalhados pelos becos e telhados do mapa. Destrua caixas de madeira para ganhar bônus permanentes de dano de arma, vida máxima e almas soltas.
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              3. Movimentação Avançada
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Linhas de Trilho (Ziplines)</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Conectam a base a cada uma das 4 rotas. Pressione espaço para saltar e acelerar. Cuidado: tomar dano direto enquanto estiver no trilho atordoa seu herói em queda livre.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Deslize Infinito (Slide)</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Pressione agachar durante uma corrida ou descida para deslizar. Enquanto desliza, sua arma possui munição infinita temporária sem consumir balas do pente.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Dash Jump & Vigor (Stamina)</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Consome suas barras de vigor. Fazer uma investida (Dash) seguida de pulo imediato dobra sua distância horizontal e permite esquivar de tiros e habilidades de área.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "moba" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              Dicionário MOBA: LoL & Dota 2 para Deadlock
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              Se você já tem experiência com League of Legends ou Dota 2, utilize esta tabela comparativa para assimilar instantaneamente as mecânicas correspondentes em Deadlock:
            </p>

            <div className="mt-6 overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-400">
                    <th className="py-3 px-3">Conceito</th>
                    <th className="py-3 px-3 text-amber-400">No Deadlock</th>
                    <th className="py-3 px-3 text-sky-400">No LoL</th>
                    <th className="py-3 px-3 text-rose-400">No Dota 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-medium text-neutral-200">
                  {COMPARISONS.map((c) => (
                    <tr key={c.concept} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-[#f4efe6]">{c.concept}</td>
                      <td className="py-3.5 px-3 text-amber-300 font-bold">{c.deadlock}</td>
                      <td className="py-3.5 px-3 text-sky-300">{c.lol}</td>
                      <td className="py-3.5 px-3 text-rose-300">{c.dota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-sky-900/40 bg-neutral-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="font-deadlock text-xs font-black uppercase tracking-wider text-sky-400">
                Para quem vem do League of Legends
              </span>
              <h3 className="mt-1 font-deadlock text-lg font-black text-[#f4efe6]">
                Diferenças mais marcantes
              </h3>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-neutral-300 list-disc pl-4">
                <li><strong>Você precisa mirar:</strong> Acertar tiros na cabeça (Headshot) causa dano crítico substancial na maioria das armas.</li>
                <li><strong>Não há Feitiços de Invocador:</strong> Mobilidade instantânea (Flash) deve ser adquirida como item ativo na loja (ex: Warp Stone).</li>
                <li><strong>Itens Ativos são cruciais:</strong> É comum jogadores experientes terminarem a partida com 3 a 4 itens ativos simultâneos no teclado.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-rose-900/40 bg-neutral-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="font-deadlock text-xs font-black uppercase tracking-wider text-rose-400">
                Para quem vem do Dota 2
              </span>
              <h3 className="mt-1 font-deadlock text-lg font-black text-[#f4efe6]">
                Semelhanças diretas
              </h3>
              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-neutral-300 list-disc pl-4">
                <li><strong>A cultura do Deny:</strong> Negar recursos inimigos atirando no orbe é tão influente na fase de rotas quanto o deny clássico do Dota.</li>
                <li><strong>Itens situacionais com impacto tático:</strong> Itens como Silencer, Debuff Remover e Unstoppable exercem papel similar a Orchid, Lotus Orb e BKB.</li>
                <li><strong>Lojas Secretas na rota:</strong> Há lojas laterais perto das torres para compras rápidas sem ter que voltar para a base.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}