"use client";
// app/TierListTabs.tsx
import { useState, type ReactNode } from "react";
import TierMaker, { hasSharedList, useHash, type MakerHero } from "./TierMaker";
import type { TierKey } from "./tiers";

type Mode = "meta" | "maker";

interface Props {
  meta: ReactNode;
  heroes: MakerHero[];
  metaTiers: Record<TierKey, number[]>;
  patchLabel: string;
}

export default function TierListTabs({ meta, heroes, metaTiers, patchLabel }: Props) {
  const hash = useHash();
  const [picked, setPicked] = useState<Mode | null>(null);
  // Quem abre um link compartilhado cai direto no montador
  const mode: Mode = picked ?? (hasSharedList(hash) ? "maker" : "meta");

  const tab = (id: Mode, label: string, isNew = false) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setPicked(id)}
      className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors sm:px-5 sm:text-sm ${
        mode === id ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {label}
      {isNew && mode !== id && (
        <span className="ml-2 rounded bg-cyan-400 px-1.5 py-0.5 align-middle text-[9px] font-black text-black">NOVO</span>
      )}
    </button>
  );

  return (
    <div>
      <div role="tablist" className="mb-6 inline-flex overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/80">
        {tab("meta", "Tier List do Meta")}
        {tab("maker", "Montar a minha", true)}
      </div>
      {/* Os dois ficam montados para não perder a tier list em andamento ao alternar de aba */}
      <div hidden={mode !== "meta"}>{meta}</div>
      <div hidden={mode !== "maker"}>
        <TierMaker heroes={heroes} metaTiers={metaTiers} patchLabel={patchLabel} />
      </div>
    </div>
  );
}