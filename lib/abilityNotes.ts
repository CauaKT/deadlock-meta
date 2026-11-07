// lib/abilityNotes.ts
// Notas de mecânica por herói e por slot (1, 2, 3 e 4 = suprema).
// Fonte: The Deadlock Wiki (CC BY-SA) — https://deadlock.wiki
// Chave do herói = nome em minúsculas (igual ao heroKey do page.tsx).

export const ABILITY_NOTES: Record<string, Record<number, string[]>> = {
  paige: {
    1: [
      "Aumentos de Alcance de Habilidade (ex.: Greater Expansion) afetam tanto o raio quanto a distância percorrida.",
      "Se o dragão bater em um obstáculo, ele desvia e segue pela superfície até conseguir voltar à rota inicial. Por imperfeições na geometria isso nem sempre funciona, e a direção pode mudar de forma errática, principalmente dentro de salas pequenas.",
      "Causa dano em intervalos fixos (tick).",
      "O Bookwyrm tem um efeito que permanece por um curto tempo, então é possível receber dano logo depois de sair do rastro.",
      "O raio de dano inicial é um pouco maior que a largura do rastro. Por isso é possível acertar um inimigo no lançamento e não aplicar a queimadura do rastro nele.",
    ],
    2: [
      "A barreira pode ser usada em si mesma.",
      "A barreira não é aplicada na hora: o lançamento dispara um projétil teleguiado que aplica a barreira quando alcança o alvo.",
      "Reaplicar a barreira (ex.: com Echo Shard) não acumula; apenas renova o valor e a duração.",
      "O upgrade T3 faz com que, quando o projétil chega ao alvo, até dois projéteis extras partam dele em direção aos aliados mais próximos.",
      "Esses projéteis extras não precisam de linha de visão e atravessam paredes.",
      "O raio de busca por aliados não é afetado por aumentos de Alcance de Habilidade (ex.: Greater Expansion).",
      "Se não houver aliados suficientes no raio, um projétil de barreira vai em direção à Paige. Ela não precisa estar dentro do raio de busca para isso.",
      "As barreiras extras dão Dano de Arma e Taxa de Disparo do T1.",
    ],
    3: ["A detonação acontece um curto tempo depois do lançamento."],
    4: [
      "Tem metade do tempo de recarga se não acertar nenhum aliado nem inimigo.",
      "A Paige sempre recebe os efeitos positivos quando usa a habilidade.",
      "Os cavaleiros aparecem como um triângulo no minimapa, para aliados e inimigos.",
      "Se a Paige estiver mirando para cima ao lançar, os cavaleiros pulam em arco.",
      "As bandeiras dos cavaleiros não contam para a hitbox deles.",
    ],
  },
};