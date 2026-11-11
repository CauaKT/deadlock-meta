# LockPro

Plataforma de estatísticas e análise do meta do jogo **Deadlock** (Valve Corporation). Os dados vêm de fontes comunitárias, **não oficiais**: a Deadlock API e a Deadlock Wiki.

**Site:** https://lockpro.vercel.app/

## Funcionalidades

- **Tier list** de heróis por winrate e partidas, filtrada por patch (`/`).
- **Seletor de heróis** no estilo da tela "Criar escalação" (`/heroes`).
- **Página de herói** (`/heroes/[id]`): atributos base, arma, simulador de habilidades com upgrades T1/T2/T3 e itens mais escolhidos por fase.
- **Catálogo de itens** da loja, com filtros por tier, busca e ordenação (`/items`).

## Detalhes técnicos

- **Consumo de API REST:** Deadlock API (heróis, itens, `hero-stats`) com textos em pt-BR.
- **Cores temáticas:** extraídas dinamicamente da Deadlock Wiki (MediaWiki API), sem mapas de cores fixos no código.
- **Servidor:** React Server Components, com cache próprio para respostas grandes e revalidação para os demais endpoints.
- **Segurança:** HTML vindo de APIs externas é sanitizado antes de ser renderizado, e imagens externas só são aceitas de origens permitidas.

## Tecnologias

Next.js (App Router), React, TypeScript, Tailwind CSS.

## Como executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Aviso

Deadlock é marca registrada da Valve Corporation. O LockPro é um projeto comunitário, sem fins lucrativos e sem afiliação oficial com a Valve.