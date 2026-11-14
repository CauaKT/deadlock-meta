"use client";

import { useEffect, useState } from "react";
import { warmUpApi } from "@/lib/backend/client";

export default function ColdStartNotice({
  active,
  warmup = false,
  delayMs = 4000,
}: {
  active: boolean;
  warmup?: boolean;
  delayMs?: number;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (warmup) warmUpApi();
  }, [warmup]);

  useEffect(() => {
    if (!active) return;

    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);

    return () => {
      clearInterval(id);
      setElapsedMs(0);
    };
  }, [active]);

  if (!active || elapsedMs < delayMs) return null;

  const seconds = Math.floor(elapsedMs / 1000);

  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3.5 py-2.5 text-[11px] font-medium text-amber-200/90"
    >
      <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      <span>
        Acordando o servidor gratuito da API (<strong className="font-mono text-amber-300">{seconds}s</strong>) — após
        períodos de inatividade ele leva cerca de 30 a 60 segundos para iniciar...
      </span>
    </div>
  );
}