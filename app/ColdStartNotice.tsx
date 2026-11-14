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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (warmup) warmUpApi();
  }, [warmup]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mt-3 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3.5 py-2.5 text-[11px] font-medium text-amber-200/90"
    >
      Sua conexão parece estar lenta ou instável no momento. Verifique sua internet e aguarde...
    </div>
  );
}