"use client";

import { useState } from "react";

type GuideTab = "basic" | "intermediate" | "advanced" | "moba";

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
    explanation:
      "Em Deadlock, Almas funcionam simultaneamente como dinheiro para comprar itens na loja e pontos para subir de nível e liberar habilidades.",
  },
  {
    concept: "Farm & Negativas",
    deadlock: "Last Hit + Tiro no Orbe (Deny)",
    lol: "Last Hit sem Deny",
    dota: "Last Hit + Deny batendo no próprio creep",
    explanation:
      "Ao abater uma tropa, parte das almas sobe em um orbe flutuante. Atire nele para garantir. O adversário pode atirar no seu orbe para roubar o recurso.",
  },
  {
    concept: "Dano & Poder",
    deadlock: "Arma (Weapon) e Espírito (Spirit)",
    lol: "Dano de Ataque (AD) e Poder de Habilidade (AP)",
    dota: "Dano Físico / Mágico / Atributos",
    explanation:
      "Arma escala seus tiros básicos. Espírito escala suas 4 habilidades, efeitos passivos e o poder dos itens ativos.",
  },
  {
    concept: "Torres da Rota",
    deadlock: "Guardião (Guardian) e Andarilho (Walker)",
    lol: "Torre T1 e Torre T2",
    dota: "Torre Tier 1 e Torre Tier 2",
    explanation:
      "O Guardião defende a linha de frente. O Andarilho é uma fortaleza gigante que ataca com lasers de área e pisões em curto alcance.",
  },
  {
    concept: "Defesas da Base",
    deadlock: "Guardiões da Base + Santuários (Shrines)",
    lol: "Torres de Inibidor + Inibidores",
    dota: "Torres Tier 3 + Barracas (Barracks)",
    explanation:
      "Antes de atingir o Patrono inimigo, você precisa derrubar a defesa da base e destruir os dois Santuários para quebrar a imunidade do objetivo final.",
  },
  {
    concept: "Objetivo Principal",
    deadlock: "Patrono (Patron)",
    lol: "Nexus",
    dota: "Ancestral (Ancient)",
    explanation:
      "O Patrono possui duas fases: a primeira na superfície e a segunda vulnerável no solo dentro do poço da base inimiga.",
  },
  {
    concept: "Grande Chefe Neutro",
    deadlock: "Chefe Central (Mid Boss)",
    lol: "Barão Na'Shor",
    dota: "Roshan",
    explanation:
      "Ao derrotá-lo, surge o Rejuvenescedor (Rejuvenator). O time precisa acertar um golpe corpo a corpo pesado para reivindicá-lo, permitindo roubos emocionantes.",
  },
  {
    concept: "Objetivo de Mapa Móvel",
    deadlock: "Urna de Almas (Soul Urn)",
    lol: "Dragões / Arauto",
    dota: "Runas / Roshan Aghanims",
    explanation:
      "Uma urna surge no mapa e deve ser transportada a pé até o lado oposto. O carregador não pode atirar, mas entrega almas para todo o time e pontos de habilidade.",
  },
  {
    concept: "Imunidade a Controle (CC)",
    deadlock: "Item Ativo: Inabalável (Unstoppable)",
    lol: "Bandana de Mercúrio / Feitiço Purificar",
    dota: "Black King Bar (BKB)",
    explanation:
      "Item ativo essencial no meio e fim de jogo para não ser interrompido por atordoamentos ou silêncios durante canalizações e avanços.",
  },
  {
    concept: "Mobilidade e Flash",
    deadlock: "Pedra de Translocação / Salto Majestoso",
    lol: "Feitiço de Invocador Flash",
    dota: "Blink Dagger",
    explanation:
      "Não há feitiços pré-jogo: mobilidade adicional é comprada na loja de itens conforme a necessidade da partida.",
  },
];

const TABS: { id: GuideTab; label: string }[] = [
  { id: "basic", label: "Básico" },
  { id: "intermediate", label: "Intermediário" },
  { id: "advanced", label: "Avançado" },
  { id: "moba", label: "Transição LoL / Dota 2" },
];

export default function GuideTabs() {
  const [tab, setTab] = useState<GuideTab>("basic");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="inline-flex flex-wrap overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/80"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors sm:px-5 sm:text-sm ${
              tab === t.id ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <span className="font-deadlock text-xs font-black uppercase tracking-widest text-emerald-400">
              Ponto de Partida · 0:00 até os primeiros minutos
            </span>
            <h2 className="mt-1 font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              1. Largada na Base & Trilhos (Ziplines)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              A partida começa na sua base com os trilhos aéreos ligando você diretamente às rotas. Pule no trilho para se deslocar rápido e use o impulso inicial para chegar antes da primeira leva de tropas.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-neutral-300 sm:text-sm">
              <li>
                <strong>Atenção ao dano no trilho:</strong> sofrer dano direto de um inimigo enquanto está pendurado derruba e atordoa seu herói. Solte antes de entrar em combate.
              </li>
              <li>
                <strong>Use suas tropas como escudo:</strong> o Guardião inimigo prioriza atacar quem entra no alcance sem tropas aliadas na frente.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              2. Ciclo de Estruturas até a Vitória
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Para vencer, seu time precisa derrubar o <strong>Patrono (Patron)</strong> na base adversária, avançando em sequência:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">1º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Guardiões (Guardians)</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Primeira torre da rota. Foque quando suas tropas estiverem batendo nela e recue ao perder a wave.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">2º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Andarilhos (Walkers)</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Estruturas móveis com laser e pisão em área. Destruí-los libera slots de itens Flexíveis para todo o time.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">3º Passo</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">Santuários (Shrines)</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Dois núcleos na entrada da base. Enquanto estiverem de pé, o Patrono permanece invulnerável.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="font-deadlock text-xs font-black uppercase text-amber-500">Objetivo Final</span>
                <p className="mt-1 text-sm font-bold text-[#f4efe6]">O Patrono (Patron)</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Possui duas fases: derrube a primeira barra na superfície e depois destrua o núcleo no poço da base.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              3. Economia de Almas, Orbes & Loja
            </h2>
            <div className="mt-3 space-y-3 text-sm text-neutral-300">
              <p>
                Em Deadlock não existe ouro e XP separados: tudo é <strong>Almas (Souls)</strong>. Quanto mais almas você junta, mais itens compra e mais rápido libera e melhora suas 4 habilidades.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-xs text-neutral-300 sm:text-sm">
                <li>
                  <strong>Last Hit + Orbe:</strong> ao abater uma tropa no início da partida, parte das almas sobe em uma esfera flutuante. Atire nela para confirmar.
                </li>
                <li>
                  <strong>Negativa (Deny):</strong> atire nos orbes alaranjados que sobem quando o inimigo mata uma tropa para roubar o recurso dele.
                </li>
                <li>
                  <strong>3 Categorias de Loja:</strong> <span className="text-amber-400 font-bold">Arma</span> (dano de tiro),{" "}
                  <span className="text-lime-400 font-bold">Vitalidade</span> (vida, cura e resistência) e{" "}
                  <span className="text-purple-400 font-bold">Espírito</span> (dano e escala das habilidades). Há lojas laterais nas rotas para comprar sem voltar à base.
                </li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {tab === "intermediate" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <span className="font-deadlock text-xs font-black uppercase tracking-widest text-amber-400">
              Meio de Jogo · Rotação & Controle de Mapa
            </span>
            <h2 className="mt-1 font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              1. Caixas, Estátuas & Acampamentos Neutros
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Entre uma leva de tropas e outra, nunca fique parado esperando na rota. Use os intervalos de 20–30 segundos após empurrar a wave para multiplicar seu ganho de almas:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Caixas & Estátuas Douradas</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Espalhadas por becos, subterrâneos e telhados. Quebrar com tiro ou golpe corpo a corpo concede almas soltas e bônus permanentes de dano, vida, munição ou poder espiritual.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Acampamentos Neutros (Jungle)</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Priorize limpar acampamentos pequenos/médios depois de empurrar sua rota até o Guardião ou Andarilho inimigo. Nunca deixe uma wave inteira morrer sob sua torre para fazer selva.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              2. Urna de Almas (Soul Urn) & Chefe Central (Mid Boss)
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Urna de Almas</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Deve ser carregada até o ponto de entrega do lado oposto do mapa. O carregador fica visível para os inimigos e não pode atirar, mas ganha velocidade extra. Entregar concede almas para todo o time e um ponto de habilidade para o portador.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Mid Boss & Rejuvenescedor</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Ao derrotar o chefe no templo central, o cristal Rejuvenescedor desce lentamente. É preciso acertá-lo com um <strong>golpe corpo a corpo pesado (Heavy Melee)</strong> para reivindicar — garantindo renascimento rápido e tropas mais fortes para o time.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              3. Almas Inseguras & Power Spikes
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-neutral-300 sm:text-sm">
              <li>
                <strong>Almas Inseguras (Unsecured Souls):</strong> almas obtidas de acampamentos neutros e urnas ficam em risco até serem convertidas. Se você morrer carregando muitas, parte cai no chão e o inimigo pode coletar.
              </li>
              <li>
                <strong>Luta pela Ultimate:</strong> ao desbloquear a 4ª habilidade, procure ângulos de emboscada nas rotas vizinhas usando os cabos e passagens laterais.
              </li>
            </ul>
          </section>
        </div>
      )}

      {tab === "advanced" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <span className="font-deadlock text-xs font-black uppercase tracking-widest text-rose-400">
              Alto Nível · Mecânica, Macro & Itemização Reativa
            </span>
            <h2 className="mt-1 font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              1. Movimentação Avançada
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Dash Jump</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Execute uma investida (Dash) e pressione pulo no momento exato em que a barra de vigor piscar. Dobra a distância horizontal para atravessar avenidas e escapar de ultimates.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Slide & Munição Infinita</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Agachar em descidas ou logo após um Dash inicia um deslize. Durante todo o deslize, seus disparos não consomem balas do pente — essencial para trocas longas e derrubar torres rápido.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Wall Jump & Verticalidade</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  Pular encostado em paredes permite escalar sacadas sem gastar vigor extra. Domine os telhados para iniciar lutas fora do campo de visão inimigo.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              2. Combate Corpo a Corpo & Aparar (Parry)
            </h2>
            <div className="mt-3 space-y-2 text-xs text-neutral-300 sm:text-sm">
              <p>
                O soco pesado (segurar botão de Melee) causa alto dano em heróis e garante last hits sem gastar balas, mas deixa você exposto ao <strong>Parry</strong>.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Punir Heavy Melee:</strong> apertar Parry no tempo certo anula o golpe inimigo e aplica um atordoamento longo, amplificando o dano recebido por ele.
                </li>
                <li>
                  <strong>Fintar o Parry (Bait):</strong> mire um Heavy Melee ligeiramente para o lado para forçar o Parry adversário em vão, e puna durante o tempo de recarga dele.
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800/90 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="font-deadlock text-2xl font-black uppercase tracking-wide text-amber-400">
              3. Itemização Reativa & Fechamento de Partida
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Itens Ativos de Resposta</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-neutral-400">
                  <li><strong>Inabalável (Unstoppable):</strong> contra times pesados em atordoamentos e silêncios.</li>
                  <li><strong>Removedor de Penalidades:</strong> limpa efeitos negativos e marcas perigosas.</li>
                  <li><strong>Anti-cura (Healbane / Balas Tóxicas):</strong> obrigatório contra heróis de sustentação alta.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                <p className="font-deadlock text-base font-bold text-[#f4efe6]">Macro no Fim de Jogo</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-neutral-400">
                  <li>Sincronize pelo menos duas rotas empurradas antes de forçar os Santuários.</li>
                  <li>Com vantagem numérica após abates, converta imediatamente em Mid Boss ou derrubada de base.</li>
                  <li>Evite perseguir abates isolados quando uma wave inimiga estiver perto da sua base.</li>
                </ul>
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
                    <th className="px-3 py-3">Conceito</th>
                    <th className="px-3 py-3 text-amber-400">No Deadlock</th>
                    <th className="px-3 py-3 text-sky-400">No LoL</th>
                    <th className="px-3 py-3 text-rose-400">No Dota 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-medium text-neutral-200">
                  {COMPARISONS.map((c) => (
                    <tr key={c.concept} className="transition-colors hover:bg-neutral-800/30">
                      <td className="px-3 py-3.5 font-bold text-[#f4efe6]">{c.concept}</td>
                      <td className="px-3 py-3.5 font-bold text-amber-300">{c.deadlock}</td>
                      <td className="px-3 py-3.5 text-sky-300">{c.lol}</td>
                      <td className="px-3 py-3.5 text-rose-300">{c.dota}</td>
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
              <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-neutral-300 sm:text-sm">
                <li>
                  <strong>Você precisa mirar:</strong> Acertar tiros na cabeça (Headshot) causa dano crítico substancial na maioria das armas.
                </li>
                <li>
                  <strong>Não há Feitiços de Invocador:</strong> Mobilidade instantânea (Flash) deve ser adquirida como item ativo na loja (ex: Warp Stone).
                </li>
                <li>
                  <strong>Itens Ativos são cruciais:</strong> É comum jogadores experientes terminarem a partida com 3 a 4 itens ativos simultâneos no teclado.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-rose-900/40 bg-neutral-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="font-deadlock text-xs font-black uppercase tracking-wider text-rose-400">
                Para quem vem do Dota 2
              </span>
              <h3 className="mt-1 font-deadlock text-lg font-black text-[#f4efe6]">
                Semelhanças diretas
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-neutral-300 sm:text-sm">
                <li>
                  <strong>A cultura do Deny:</strong> Negar recursos inimigos atirando no orbe é tão influente na fase de rotas quanto o deny clássico do Dota.
                </li>
                <li>
                  <strong>Itens situacionais com impacto tático:</strong> Itens como Silencer, Debuff Remover e Unstoppable exercem papel similar a Orchid, Lotus Orb e BKB.
                </li>
                <li>
                  <strong>Lojas Secretas na rota:</strong> Há lojas laterais perto das torres para compras rápidas sem ter que voltar para a base.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}