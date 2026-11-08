# LockPro

Plataforma de estatísticas e análise do meta para o jogo **Deadlock** (Valve Corporation), consumindo dados de partidas agregados pela Deadlock API, uma API da comunidade (não oficial)

## Funcionalidades Técnicas

- **Consumo de API REST:** Integração com os endpoints `/v1/assets/heroes` (metadados de personagens) e `/v1/analytics/hero-stats` (taxas de vitória e partidas).
- **Tratamento de Dados no Servidor:** Processamento e unificação dos dados utilizando React Server Components (RSC) com renderização dinâmica (`SSR`).
- **Resiliência de Assets:** Pipeline de fallback para imagens em alta resolução alternando entre arquivos locais opcionais (`public/heroes`), CDN da comunidade e metadados padrão da API.
- **Rotas Dinâmicas:** Páginas individuais para cada personagem (`/heroes/[id]`) com atributos de combate, winrate, total de partidas, tier e lore oficial.

## Tecnologias

- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Fonte de Dados:** Deadlock REST API

## Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor local
npm run dev

# Entrar no Servidor local
http://localhost:3000