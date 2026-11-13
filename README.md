# LockPro

Plataforma de estatísticas, análise do meta e perfis da comunidade para o jogo **Deadlock** (Valve Corporation). Os dados de jogo vêm de fontes comunitárias, **não oficiais**: Deadlock API e Deadlock Wiki.

- **Site em produção:** https://lockpro.vercel.app
- **API de contas e perfis:** [`deadlock-meta-api`](https://github.com/CauaKT/deadlock-meta-api) (NestJS + Prisma + PostgreSQL)

---

## Funcionalidades

- **Tier list do meta (`/`)**: ranking de heróis por winrate e número de partidas, filtrado por patch, com tooltips detalhados.
- **Tier Maker (`/tier-maker`)**: editor interativo de tier lists personalizadas (customização de tiers, cores e preenchimento com o meta atual).
- **Seletor de heróis (`/heroes`)**: interface inspirada na tela "Criar escalação", com tags e habilidades temáticas.
- **Página do herói (`/heroes/[id]`)**: atributos base com escala por bênçãos, arma, evolução por patch, simulador de habilidades (T1/T2/T3) e builds populares por fase.
- **Catálogo de itens (`/items`)**: loja completa separada por categoria (Arma, Vitalidade e Espírito), com filtros por tier, busca, ordenação e tooltip dinâmico.
- **Guia (`/guide`) & Fontes (`/data-sources`)**: guia introdutório com comparativo entre MOBAs e transparência dos endpoints consumidos.
- **Contas e perfis (`/register`, `/login`, `/reset-password`, `/welcome`, `/profile`, `/profile/[handle]`)**:
  - Cadastro e login por e-mail/senha (com confirmação de e-mail e recuperação de senha) e **Google OAuth 2.0**.
  - Onboarding pós-cadastro (`/welcome`) com definição de nick, `@handle` e recorte de avatar.
  - Perfil público e editável com herói favorito, banner personalizado ou temático por herói, cor de destaque e sugestões da comunidade.

---

## Arquitetura & Integração com a API

```text
Navegador ──▶ Vercel (Next.js)
                 ├── /api/backend/* (rewrite) ──▶ API NestJS (Render / Docker) ──▶ PostgreSQL (Neon)
                 └── Server Components (SSR)  ──▶ API_URL (repassando cookie lockpro_session)
```

- **Proxy first-party (`next.config.ts`):** chamadas do navegador vão para `/api/backend/:path*` e são reescritas para `API_URL`, permitindo que o cookie `httpOnly` `lockpro_session` permaneça no domínio do front-end.
- **Camada isolada (`lib/backend/*`):** `client.ts`, `server.ts` e `types.ts` centralizam toda comunicação com a API de autenticação e perfis.
- **Consumo de dados do jogo (`lib/deadlock.ts`):**
  - Deadlock API REST (heróis, itens, estatísticas e builds) em `pt-BR`.
  - Deadlock Wiki (MediaWiki API) para extração dinâmica das cores temáticas dos heróis, sem mapas de cores fixos no código.
  - Cache em memória de 24h para respostas acima de 2 MB e revalidação via Next.js para os demais endpoints.
- **Segurança:** sanitização de HTML externo antes de renderização e validação de origens permitidas para imagens externas.

---

## Tecnologias

- **Front-end:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS v4
- **Hospedagem:** Vercel (front-end) integrado à `deadlock-meta-api` (Render + Neon PostgreSQL + Brevo)

---

## Como executar localmente

### 1. Front-end (rotas públicas de estatísticas e catálogo)

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

### 2. Com autenticação e perfis funcionando localmente

Para testar `/login`, `/register`, `/welcome` e `/profile` no seu PC:
1. Suba o repositório [`deadlock-meta-api`](https://github.com/CauaKT/deadlock-meta-api) localmente na porta `3001` (seguindo o README da API).
2. *(Opcional)* Se a API estiver em outra URL/porta, defina no `.env.local` do front-end:

```env
API_URL=http://localhost:3001
```

Sem `.env.local`, o proxy `/api/backend/*` e `lib/backend/server.ts` já usam `http://localhost:3001` por padrão.

---

## Aviso

Deadlock é marca registrada da Valve Corporation. O LockPro é um projeto comunitário de portfólio, sem fins lucrativos e sem afiliação oficial com a Valve.