"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeadlockLoadingLogo from "@/components/ui/DeadlockLoadingLogo";
import { waitForApiReady, type ApiWakeStage } from "@/lib/backend/client";

const STAGES: { id: ApiWakeStage; label: string }[] = [
  { id: "connecting", label: "Conectando ao serviço" },
  { id: "waking", label: "Inicializando servidor" },
  { id: "checking_db", label: "Validando sessão" },
  { id: "ready", label: "Pronto • Redirecionando" },
];

function stageIndex(stage: ApiWakeStage): number {
  return STAGES.findIndex((s) => s.id === stage);
}

function formatSeconds(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return min > 0 ? `${min}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

export function ApiWakePanel({
  stage,
  elapsedMs,
  title = "Conectando ao Servidor",
  subtitle = "Aguarde um instante enquanto preparamos sua sessão.",
  onCancelAction,
  onRetryAction,
}: {
  stage: ApiWakeStage;
  elapsedMs: number;
  title?: string;
  subtitle?: string;
  onCancelAction?: () => void;
  onRetryAction?: () => void;
}) {
  const activeIdx = stageIndex(stage);

  return (
    <div className="relative flex w-full max-w-md flex-col items-center px-4 text-center">
      {/* Barra de progresso mística no topo */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-amber-500/10">
        <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      </div>

      {/* Halo de luz arcana */}
      <div className="pointer-events-none absolute -top-6 h-44 w-44 rounded-full bg-amber-500/15 blur-3xl" />

      {/* Logo oficial animada (mesmo componente do loading.tsx) */}
      <DeadlockLoadingLogo size="sm" />

      {/* Título e subtítulo */}
      <div className="mt-5 space-y-1.5">
        <p className="font-deadlock text-xl font-black uppercase tracking-[0.18em] text-[#f4efe6]">
          {title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-amber-500">{title.split(" ").slice(-1)[0]}</span>
        </p>
        <p className="text-xs leading-relaxed text-neutral-400">{subtitle}</p>
      </div>

      {/* Painel de etapas (substitui os logs do Render com a cara do LockPro) */}
      <div className="mt-5 w-full rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-4 text-left shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-800/80 pb-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
          <span className="font-deadlock">Status da Conexão</span>
          <span className="font-mono text-amber-400">{formatSeconds(elapsedMs)}</span>
        </div>

        <ul className="space-y-2.5 text-xs">
          {STAGES.map((item, idx) => {
            const done = idx < activeIdx || stage === "ready";
            const current = idx === activeIdx && stage !== "ready";

            return (
              <li
                key={item.id}
                className={`flex items-center gap-2.5 transition-colors ${
                  done
                    ? "text-emerald-300"
                    : current
                      ? "font-semibold text-[#f4efe6]"
                      : "text-neutral-600"
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {done ? (
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5 6.5 12 13 4.5" />
                    </svg>
                  ) : current ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
                  )}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {(onCancelAction || onRetryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {onRetryAction && (
            <button
              type="button"
              onClick={onRetryAction}
              className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110"
            >
              Tentar agora
            </button>
          )}
          {onCancelAction && (
            <button
              type="button"
              onClick={onCancelAction}
              className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 hover:border-neutral-500 hover:text-white"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiWakeOverlay({
  open,
  stage,
  elapsedMs,
  onCancelAction,
}: {
  open: boolean;
  stage: ApiWakeStage;
  elapsedMs: number;
  onCancelAction?: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070908]/95 p-4 backdrop-blur-md"
    >
      <ApiWakePanel stage={stage} elapsedMs={elapsedMs} onCancelAction={onCancelAction} />
    </div>
  );
}

export function ApiWakingAutoRefresh() {
  const router = useRouter();
  const [stage, setStage] = useState<ApiWakeStage>("waking");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 500);

    void waitForApiReady({
      signal: controller.signal,
      onStage: setStage,
    }).then((res) => {
      if (controller.signal.aborted) return;
      if (res.ready) {
        setStage("ready");
        router.refresh();
      } else {
        setFailed(true);
      }
    });

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [router]);

  return (
    <div className="flex min-h-[calc(100svh-180px)] items-center justify-center py-8">
      <ApiWakePanel
        stage={stage}
        elapsedMs={elapsedMs}
        title={failed ? "Servidor Indisponível" : "Despertando Servidor"}
        subtitle={
          failed
            ? "A API demorou mais do que o esperado para responder. Tente novamente em instantes."
            : "A API gratuita hiberna após ~15 min sem uso e leva cerca de 30 a 60 segundos para iniciar. A página recarregará sozinha."
        }
        onRetryAction={failed ? () => router.refresh() : undefined}
      />
    </div>
  );
}