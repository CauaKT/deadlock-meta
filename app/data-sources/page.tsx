import type { Metadata } from "next";
import SourcesAccordion, { BackButton } from "./SourcesAccordion";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Fontes de Dados & Transparência",
  description: "Detalhamento de todas as fontes de dados, APIs e métodos utilizados no LockPro agrupados por serviço.",
};

export default function DataSourcesPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-8">
      <header className="border-b border-neutral-800 pb-6">
        <BackButton />
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Fontes de <span className="text-amber-500">Dados & Transparência</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide mt-2">
          O LockPro é alimentado por APIs e bancos comunitários abertos. Clique em cada fonte abaixo para ver os endpoints e recursos utilizados.
        </p>
      </header>

      {/* Accordions por Fonte de Dados */}
      <SourcesAccordion />
    </div>
  );
}