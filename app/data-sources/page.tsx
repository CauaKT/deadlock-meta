import type { Metadata } from "next";
import { connection } from "next/server";
import SlantFrame from "@/components/ui/SlantFrame";
import SourcesAccordion, { BackButton } from "./SourcesAccordion";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Fontes de Dados & Transparência",
  description:
    "Detalhamento de todas as fontes de dados, APIs, frequência de atualização, limitações conhecidas e tratamento de dados pessoais (LGPD) no LockPro.",
};

interface ExternalStatusPayload {
  cacheBackend?: string;
  cachedEntries?: number;
  lastUpdatedAt?: string | null;
}

async function fetchCacheStatus(): Promise<ExternalStatusPayload | null> {
  await connection();
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/external-data/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ExternalStatusPayload;
  } catch {
    return null;
  }
}

export default async function DataSourcesPage() {
  const status = await fetchCacheStatus();
  const lastUpdatedLabel = status?.lastUpdatedAt
    ? new Date(status.lastUpdatedAt).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sob demanda (cache atualizado a cada consulta)";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6">
        <BackButton />
        <h1 className="font-deadlock text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Fontes de <span className="text-amber-500">Dados & Transparência</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide mt-2">
          O LockPro é um projeto comunitário não oficial alimentado por APIs abertas de Deadlock e pela própria API do projeto. Abaixo estão os créditos, frequência de atualização, limitações e regras de privacidade.
        </p>
      </header>

      {/* Status e Frequência */}
      <SlantFrame
        shape="narrowTop"
        border="#3897a1"
        background="linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-[4px] border border-white/10 bg-black/40 p-3">
          <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Última Atualização (Cache API)
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-[#f4efe6]">{lastUpdatedLabel}</p>
        </div>
        <div className="rounded-[4px] border border-white/10 bg-black/40 p-3">
          <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Persistência do Cache
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-emerald-400">
            PostgreSQL ({status?.cachedEntries ?? 0} registros)
          </p>
        </div>
        <div className="rounded-[4px] border border-white/10 bg-black/40 p-3">
          <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Frequência de Coleta
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-amber-400">
            15m–1h (stats) • 24h (assets)
          </p>
        </div>
      </SlantFrame>

      {/* Accordions por Fonte de Dados */}
      <SourcesAccordion />

      {/* Limitações Conhecidas & Privacidade / LGPD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SlantFrame
          shape="slantLeft"
          border="#c97a2e"
          background="linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))"
          className="space-y-3"
        >
          <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
            Limitações Conhecidas
          </h2>
          <ul className="space-y-2 text-xs text-neutral-300 leading-relaxed list-disc pl-4">
            <li>
              <strong>Amostra mínima:</strong> a Tier List considera apenas heróis com pelo menos{" "}
              <span className="text-[#f4efe6] font-semibold">1.000 partidas</span> na janela e patente selecionadas para evitar distorções estatísticas.
            </li>
            <li>
              <strong>Atraso e cache:</strong> estatísticas de meta são revalidadas a cada 1 hora; dados de jogador ficam em cache por 15 minutos e leaderboard por 30 minutos no PostgreSQL.
            </li>
            <li>
              <strong>Dados incompletos:</strong> heróis recém-lançados ou jogadores com histórico privado na Steam podem apresentar campos parciais ou atraso na indexação da fonte comunitária.
            </li>
          </ul>
        </SlantFrame>

        <SlantFrame
          shape="slantRight"
          border="#659337"
          background="linear-gradient(160deg, rgba(22,38,14,0.88), rgba(8,11,9,0.96))"
          className="space-y-3"
        >
          <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-emerald-400 border-b border-white/10 pb-2">
            Privacidade & Dados da Conta (LGPD)
          </h2>
          <ul className="space-y-2 text-xs text-neutral-300 leading-relaxed list-disc pl-4">
            <li>
              <strong>Sessão segura:</strong> autenticação via JWT em cookie <code className="text-emerald-300">httpOnly</code> first-party (<code className="text-emerald-300">lockpro_session</code>) com revogação por versão de sessão.
            </li>
            <li>
              <strong>Minimização pública:</strong> e-mails nunca são expostos em rotas públicas (e são mascarados no painel administrativo). No cadastro, geramos um <code className="text-emerald-300">@handle</code> neutro sem expor seu e-mail.
            </li>
            <li>
              <strong>Controle do titular:</strong> o vínculo com Steam ID é opcional, a visibilidade da lista de amigos é configurável e você pode excluir sua conta definitivamente em{" "}
              <span className="text-[#f4efe6] font-semibold">Perfil → Configurações</span>.
            </li>
          </ul>
        </SlantFrame>
      </div>
    </div>
  );
}