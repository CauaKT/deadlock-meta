# LockPro (`deadlock-meta`)

Plataforma de estatísticas, análise do meta e comunidade para o jogo **Deadlock** (Valve Corporation). Os dados de jogo vêm de fontes comunitárias, **não oficiais**: [Deadlock API](https://api.deadlock-api.com) e [Deadlock Wiki](https://deadlock.wiki).

- **Aplicação em produção:** https://lockpro.vercel.app
- **Repositório da API:** [`deadlock-meta-api`](https://github.com/CauaKT/deadlock-meta-api) (NestJS + Prisma + PostgreSQL)

---

## Funcionalidades

- **Tier List do Meta (`/`):** ranking de heróis por winrate e número de partidas, filtrado por patch, com tooltips detalhados e abas para visualização do meta e editor rápido.
- **Tier Maker (`/tier-maker` e `/tier-maker/comunidade`):** editor interativo de tier lists (tiers e cores customizáveis, preenchimento com o meta atual, salvamento vinculado à conta), galeria da comunidade, página pública compartilhável por UUID (`/tier-maker/comunidade/[id]`) com `og:image` dinâmica e exportação em PNG.
- **Seletor de Heróis (`/heroes`):** grade inspirada na tela "Criar escalação", com tags temáticas dinâmicas e habilidades.
- **Página do Herói (`/heroes/[id]`):** atributos base com escala por bênçãos, dados da arma, evolução de winrate por patch, simulador de habilidades (T1/T2/T3), matchups (sinergias e counters) e builds populares por fase.
- **Catálogo de Itens (`/items` e `/items/[className]`):** loja separada por categoria (Arma, Vitalidade e Espírito), busca por nome/atributos/descrições, filtros por tier/ativos/efeitos e página individual de cada item com componentes e upgrades.
- **Feed da Comunidade (`/feed`):** microblog público com criação de postagens, anexo de imagens comprimidas em WebP, curtidas e comentários.
- **Contas, Perfis e Amigos (`/register`, `/login`, `/reset-password`, `/change-password`, `/welcome`, `/profile`, `/profile/[handle]`):**
  - Cadastro e login por e-mail/senha (com confirmação de e-mail e recuperação de senha) e **Google OAuth 2.0**.
  - Troca rápida entre até 5 contas conectadas no menu do usuário.
  - Onboarding (`/welcome`) com definição de nick, `@handle` e recorte de avatar.
  - Perfil público e editável com herói favorito, banner temático ou personalizado (com detecção NSFW), cor de destaque, redes sociais, estatísticas do Deadlock por Steam ID, sistema de amizades e sugestões da comunidade.
- **Guia (`/guide`) & Fontes (`/data-sources`):** guia introdutório de transição (LoL/Dota 2) e transparência dos endpoints externos consumidos.
- **Painel Admin (`/admin`):** visão geral de métricas, listagem paginada de usuários e moderação de contas/tier lists para usuários com cargo `ADMIN`.

---

## Stack

- **Framework:** Next.js 16.4.5 (App Router, Turbopack)
- **UI & Linguagem:** React 19.3.0, TypeScript 5, Tailwind CSS v4
- **Telemetria:** `@vercel/analytics`
- **Lint:** ESLint 9 (`eslint-config-next`)
- **Hospedagem:** Vercel (front-end) integrado à API `deadlock-meta-api` (Render + Neon PostgreSQL)

---

## Arquitetura & Integração com a API

```text
Navegador ──▶ Vercel (Next.js)
                 ├── /api/backend/* (rewrite) ──▶ API NestJS (Render / Docker) ──▶ PostgreSQL (Neon)
                 └── Server Components (SSR)  ──▶ API_URL (repassando cookie lockpro_session)
```

- **Proxy First-Party (`next.config.ts`):** chamadas do navegador vão para `/api/backend/:path*` e são reescritas para `API_URL`, mantendo o cookie `httpOnly` `lockpro_session` como first-party no domínio do front-end.
- **Camada de Backend (`lib/backend/*`):** `client.ts`, `server.ts` e `types.ts` centralizam a comunicação com a `deadlock-meta-api`.
- **Dados do Jogo (`lib/deadlock.ts`):**
  - Deadlock API REST em `pt-BR` (`language=brazilian`).
  - Deadlock Wiki (MediaWiki API) para extração dinâmica das cores temáticas dos heróis (`Template:Infobox_hero/themes.css`), sem mapas de cores fixos.
  - Cache em memória de 24h para respostas acima de 2 MB e revalidação via Next.js para os demais endpoints.
- **Segurança:** sanitização de HTML externo antes da renderização e validação de origens permitidas para imagens.

---

## Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 20+ (recomendado Node 22)
- Repositório [`deadlock-meta-api`](https://github.com/CauaKT/deadlock-meta-api) rodando localmente caso queira testar autenticação, perfis, feed, amizades e tier lists persistidas.

### 2. Instalação e execução

```bash
cp .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000`.

### 3. Scripts disponíveis

| Script | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com Turbopack |
| `npm run build` | Gera o build de produção |
| `npm run start` | Executa o build de produção |
| `npm run lint` | Executa o ESLint no projeto |

---

## Variáveis de Ambiente

Veja `.env.example`:

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `API_URL` | Não (local) / Sim (prod) | `http://localhost:3001` | URL base da `deadlock-meta-api` usada pelo rewrite `/api/backend/*` e pelo SSR |
| `NEXT_PUBLIC_API_URL` | Não | `http://localhost:3001` | Fallback opcional caso `API_URL` não esteja definida |

---

## Deploy na Vercel

1. Importe o repositório `CauaKT/deadlock-meta` na Vercel.
2. Em **Environment Variables**, configure `API_URL` apontando para a URL pública da `deadlock-meta-api` (ex.: `https://deadlock-meta-api.onrender.com`).
3. Faça o deploy. O arquivo `next.config.ts` aplicará o rewrite `/api/backend/:path*` automaticamente.

---

## Aviso

Deadlock é marca registrada da Valve Corporation. O LockPro é um projeto comunitário de portfólio, sem fins lucrativos e sem afiliação oficial com a Valve.