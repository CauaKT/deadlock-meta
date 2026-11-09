/* eslint-disable @next/next/no-img-element */
import type { ShopItem } from "@/lib/deadlock";

export const TIP_WIDTH = 320;

const KIND_LABEL: Record<string, string> = { passive: "Passivo", active: "Ativo" };

export default function ItemTooltip({ item, accent, x, y }: { item: ShopItem; accent: string; x: number; y: number }) {
  const sectionHasText = item.sections.some((s) => s.html);

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 overflow-y-auto rounded-[4px] border-2 bg-[#14110d] text-[#e9e2d3] shadow-[0_12px_32px_rgba(0,0,0,0.75)]"
      style={{ left: x, top: y, width: TIP_WIDTH, maxHeight: "calc(100vh - 16px)", borderColor: accent }}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-3 py-2">
        {item.image && <img src={item.image} alt="" className="h-10 w-10 shrink-0 object-contain" />}
        <div className="min-w-0 flex-1">
          <p className="font-deadlock text-base font-black uppercase leading-tight tracking-wide">{item.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e9e2d3]/60">
            Tier {item.tier}
            {item.isActive ? " · Ativo" : ""}
            {item.isImbue ? " · Imbue" : ""}
          </p>
        </div>
        <span className="font-deadlock text-lg font-black text-[#6fd3b3]">${item.cost}</span>
      </div>

      <div className="space-y-3 px-3 py-3 text-[13px] leading-snug">
        {item.descriptionHtml && !sectionHasText && (
          <p className="dl-text" dangerouslySetInnerHTML={{ __html: item.descriptionHtml }} />
        )}

        {item.sections.map((s, idx) => (
          <div key={idx} className="space-y-2">
            {KIND_LABEL[s.kind] && <p className="dl-label">{KIND_LABEL[s.kind]}</p>}
            {s.html && <p className="dl-text" dangerouslySetInnerHTML={{ __html: s.html }} />}
            {s.stats.length > 0 && (
              <ul className="space-y-1">
                {s.stats.map((st, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {st.icon ? (
                      <img src={st.icon} alt="" className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <span
                      className={`font-black ${st.tone === "elevated" ? "text-base" : "text-sm"}`}
                      style={st.tone === "basic" ? undefined : { color: accent }}
                    >
                      {st.value}
                    </span>
                    <span className="text-xs text-[#e9e2d3]/70">{st.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {item.components.length > 0 && (
          <div className="border-t border-white/10 pt-2">
            <p className="dl-label mb-1">Componentes</p>
            <div className="flex flex-wrap gap-3">
              {item.components.map((c) => (
                <span key={c.name} className="flex items-center gap-1.5 text-xs font-bold">
                  {c.image && <img src={c.image} alt="" className="h-6 w-6 object-contain" />}
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}