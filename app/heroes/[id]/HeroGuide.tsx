"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SLOT_ACCENTS, computeItemTooltipPosition } from "@/lib/data/config";
import { PATCHES, type HeroBuild, type Patch, type PopularItem, type ShopItem } from "@/lib/deadlock";
import ItemTooltip, { TIP_WIDTH } from "@/app/items/ItemTooltip";
import SlantFrame from "@/components/ui/SlantFrame";
import { TACTICAL_PLATE_CLASS } from "@/components/ui/TacticalPlate";

const PLATE = TACTICAL_PLATE_CLASS;
const MAX_COMPLEXITY = 4;

// Tradução minha dos valores de hero_type da API
const HERO_TYPE_LABELS: Record<string, string> = {
  marksman: "Atirador",
  mystic: "Místico",
  brawler: "Lutador",
  assassin: "Assassino",
};

// Faixas de minutos definidas por mim; a API não informa os limites de cada fase
const PHASES: { key: "early" | "mid" | "late"; label: string; minutes: string }[] = [
  { key: "early", label: "Início de jogo", minutes: "0-10 min" },
  { key: "mid", label: "Meio de jogo", minutes: "10-25 min" },
  { key: "late", label: "Fim de jogo", minutes: "25+ min" },
];

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${PLATE}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80">{label}</span>
      {children}
    </div>
  );
}

function ItemRow({
  item,
  onTip,
}: {
  item: PopularItem;
  onTip: (shopItem: ShopItem | null, el?: HTMLElement) => void;
}) {
  const shop = item.shopItem;
  const content = (
    <>
      {item.image ? (
        <img src={item.image} alt="" className="h-9 w-9 shrink-0 object-contain" />
      ) : (
        <span aria-hidden className="h-9 w-9 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#f4efe6]">{item.name}</span>
      <span className="font-deadlock text-sm font-black text-[#f4efe6]">{Math.round(item.pickPct)}%</span>
    </>
  );

  if (!shop) {
    return <div className={`flex items-center gap-3 px-3 py-2 ${PLATE}`}>{content}</div>;
  }

  return (
    <Link
      href={`/items/${encodeURIComponent(item.className)}`}
      onMouseEnter={(e) => onTip(shop, e.currentTarget)}
      onMouseLeave={() => onTip(null)}
      onFocus={(e) => onTip(shop, e.currentTarget)}
      onBlur={() => onTip(null)}
      className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${PLATE} transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40`}
    >
      {content}
    </Link>
  );
}

export default function HeroGuide({
  heroType,
  complexity,
  build,
  patches = PATCHES,
  accent,
}: {
  heroType?: string;
  complexity?: number;
  build: HeroBuild | null;
  patches?: Patch[];
  accent: string;
}) {
  const typeLabel = heroType ? (HERO_TYPE_LABELS[heroType] ?? heroType) : null;
  const level = typeof complexity === "number" ? Math.min(Math.max(complexity, 0), MAX_COMPLEXITY) : 0;
  const updatedAt = build?.updatedAt ?? null;
  const updated = updatedAt
    ? new Date(updatedAt * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : null;
  const patch = updatedAt
    ? patches.find((p) => p.since !== undefined && p.since <= updatedAt)
    : undefined;
  const titleColor = `color-mix(in srgb, ${accent} 55%, #ffffff)`;

  const [tip, setTip] = useState<{ item: ShopItem; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, [tip]);

  const showTip = (item: ShopItem | null, el?: HTMLElement) => {
    if (!item || !el) {
      setTip(null);
      return;
    }
    setTip({ item, ...computeItemTooltipPosition(el, TIP_WIDTH) });
  };

  return (
    <>
      {tip &&
        typeof document !== "undefined" &&
        createPortal(
          <ItemTooltip item={tip.item} accent={SLOT_ACCENTS[tip.item.slot]} x={tip.x} y={tip.y} />,
          document.body,
        )}
      <SlantFrame
      shape="narrowTop"
      border={`color-mix(in srgb, ${accent} 45%, #1b2621)`}
      background={`linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, #0e1512), #0e1512 75%)`}
      className="space-y-5"
    >
      {(typeLabel || level > 0) && (
        <div className="flex flex-wrap gap-3">
          {typeLabel && (
            <Stat label="Classe">
              <span className="font-deadlock text-lg font-black leading-none text-[#f4efe6]">{typeLabel}</span>
            </Stat>
          )}
          {level > 0 && (
            <Stat label="Complexidade">
              <span className="flex gap-1" aria-label={`Complexidade ${level} de ${MAX_COMPLEXITY}`}>
                {Array.from({ length: MAX_COMPLEXITY }, (_, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 -skew-x-6 rounded-[1px]"
                    style={{ backgroundColor: i < level ? accent : "rgba(255,255,255,0.12)" }}
                  />
                ))}
              </span>
            </Stat>
          )}
        </div>
      )}

      {build ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PHASES.map(({ key, label, minutes }) => (
              <div key={key} className="space-y-2">
                <div
                  className="font-deadlock flex items-baseline justify-between gap-2 text-base font-black uppercase tracking-wider"
                  style={{ color: titleColor }}
                >
                  <span>{label}</span>
                  {minutes && <span className="text-xs">({minutes})</span>}
                </div>
                {build[key].map((item) => (
                  <ItemRow key={item.className} item={item} onTip={showTip} />
                ))}
              </div>
            ))}
          </div>
          {updated && (
            <p className="text-[11px] font-semibold text-[#d6c9b4]/80">
              Dados coletados até {updated}
              {patch ? ` (${patch.label})` : ""}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm font-semibold text-[#d6c9b4]/80">Ainda não há dados de itens para este herói.</p>
      )}
      </SlantFrame>
    </>
  );
}