import type { Metadata } from "next";
import GuideTabs from "./GuideTabs";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Guia do Jogo & Transição MOBA",
  description: "Aprenda os fundamentos de Deadlock e entenda a transição direta a partir do League of Legends e Dota 2.",
};

export default function GuidePage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8">
      <header>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Deadlock <span className="text-amber-500">Guia & Transição</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide mt-2">
          Domine os fundamentos da Cidade Amaldiçoada: rotação pelas rotas, mecânica de almas e paralelos diretos com os conceitos de League of Legends e Dota 2.
        </p>
      </header>

      <GuideTabs />
    </div>
  );
}