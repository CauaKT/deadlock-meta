"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Componente invisível que registra a última aba ativa da SPA
export default function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && pathname !== "/data-sources") {
      try {
        sessionStorage.setItem("lockpro_last_path", pathname + window.location.search);
      } catch {}
    }
  }, [pathname]);

  return null;
}