"use client";
// app/loading.tsx
import { useEffect, useState } from "react";
import DeadlockLoadingLogo from "@/components/ui/DeadlockLoadingLogo";

const LOADING_PHRASES = [
  { title: "Canalizando", highlight: "Almas", sub: "Sintonizando frequências do Patrono…" },
  { title: "Invocando", highlight: "Ocultismo", sub: "Consultando os registros da Cidade Amaldiçoada…" },
  { title: "Coletando", highlight: "Orbes", sub: "Garantindo cada alma antes da negativa inimiga…" },
  { title: "Navegando", highlight: "Trilhos", sub: "Acelerando pelas linhas rumo à linha de frente…" },
  { title: "Forjando", highlight: "Relíquias", sub: "Consultando os estoques da Loja Secreta…" },
  { title: "Despertando", highlight: "Santuários", sub: "Decifrando os grimórios do meta atual…" },
  { title: "Canalizando", highlight: "Espírito", sub: "Escalando atributos para o próximo combate…" },
  { title: "Disputando", highlight: "Rejuvenescedor", sub: "Preparando golpe pesado no Chefe Central…" },
  { title: "Transportando", highlight: "a Urna", sub: "Cruzando os becos em busca de poder adicional…" },
  { title: "Invocando", highlight: "Bênçãos", sub: "Calculando estatísticas de combate por nível…" },
];

export default function Loading() {
  const [phrase, setPhrase] = useState<(typeof LOADING_PHRASES)[number] | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="lp-load flex min-h-[calc(100svh-120px)] w-full items-center justify-center px-4"
    >
      {/* Barra de progresso mística no topo da tela */}
      <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden bg-amber-500/10">
        <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Halo de luz arcana no fundo */}
        <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-amber-500/15 blur-3xl" />

        <DeadlockLoadingLogo />

        {/* Tipografia de imersão */}
        <div
          className={`mt-6 min-h-[44px] text-center space-y-1 transition-opacity duration-200 ${
            phrase ? "opacity-100" : "opacity-0"
          }`}
        >
          {phrase && (
            <>
              <p className="font-deadlock text-lg font-black uppercase tracking-[0.25em] text-[#f4efe6]">
                {phrase.title} <span className="text-amber-500">{phrase.highlight}</span>
              </p>
              <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                {phrase.sub}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}