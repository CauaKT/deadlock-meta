"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransitionBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Desativa a barra assim que a nova rota termina de renderizar
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Intercepta cliques em links internos para dar feedback visual imediato
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !target.getAttribute("target") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        // Se já está na mesma URL exata, ignora
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setLoading(true);
        }
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return (
    <>
      {/* Barra néon âmbar correndo no topo da tela */}
      <div
        aria-hidden
        className={`pointer-events-none fixed top-0 inset-x-0 z-50 h-[3px] overflow-hidden bg-amber-500/20 transition-opacity duration-200 ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="lp-bar h-full w-2/5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 shadow-[0_0_16px_rgba(245,158,11,1)]" />
      </div>

      {/* Véu de dissolução que faz o fade-out visível da página antiga durante o carregamento */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-40 bg-[#070807]/60 backdrop-blur-[3px] transition-all duration-200 ease-out ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}