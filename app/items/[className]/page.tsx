/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SLOT_META } from "@/lib/data/config";
import { fetchShopItemByClassName, fetchShopItems } from "@/lib/deadlock";

export const instant = false;

const KIND_LABEL: Record<string, string> = { passive: "Passivo", active: "Ativo" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ className: string }>;
}): Promise<Metadata> {
  const { className } = await params;
  const item = await fetchShopItemByClassName(decodeURIComponent(className));
  if (!item) {
    return { title: "LockPro • Item não encontrado" };
  }
  const slot = SLOT_META[item.slot].label;
  return {
    title: `LockPro • ${item.name}`,
    description: `${item.name} — Item de ${slot} (Tier ${item.tier}, $${item.cost}) em Deadlock.`,
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ className: string }>;
}) {
  const { className } = await params;
  const decoded = decodeURIComponent(className);
  const allItems = await fetchShopItems();
  const item = allItems.find((i) => i.className === decoded);
  if (!item) notFound();

  const slot = SLOT_META[item.slot];
  const shopSet = new Set(allItems.map((i) => i.className));
  const upgradesInto = allItems.filter((other) =>
    other.components.some((c) => c.className === item.className),
  );
  const sectionHasText = item.sections.some((s) => s.html);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/items"
          className="inline-flex items-center gap-2 rounded-[3px] border border-neutral-800 bg-black/50 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-500/60 hover:text-white"
        >
          ← Voltar para Itens
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          {slot.vendor} · {slot.label}
        </span>
      </div>

      <article
        className="overflow-hidden rounded-[4px] border-2 bg-[#14110d] text-[#e9e2d3] shadow-[0_20px_48px_rgba(0,0,0,0.75)]"
        style={{ borderColor: slot.accent }}
      >
        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-black/45 p-5 sm:p-6">
          {item.image && (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[4px] border border-black/60 p-2"
              style={{ background: slot.plate }}
            >
              <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="font-deadlock text-2xl font-black uppercase tracking-wide text-[#f4efe6] sm:text-4xl">
              {item.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest">
              <span
                className="rounded-[2px] px-2 py-0.5 text-black"
                style={{ backgroundColor: slot.accent }}
              >
                {slot.label}
              </span>
              <span className="rounded-[2px] border border-white/15 bg-black/40 px-2 py-0.5 text-[#e9e2d3]/85">
                Tier {item.tier}
              </span>
              {item.isActive && (
                <span className="rounded-[2px] border border-white/15 bg-black/40 px-2 py-0.5 text-white">
                  Ativo
                </span>
              )}
              {item.isImbue && (
                <span className="rounded-[2px] bg-[#7b3f8f] px-2 py-0.5 text-white">
                  Imbue
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Custo
            </span>
            <span className="font-deadlock text-3xl font-black text-[#6fd3b3]">
              ${item.cost}
            </span>
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-6">
          {item.descriptionHtml && !sectionHasText && (
            <p className="dl-text text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.descriptionHtml }} />
          )}

          {item.sections.length > 0 && (
            <div className="space-y-5">
              {item.sections.map((s, idx) => (
                <section
                  key={idx}
                  className="space-y-3 rounded-[3px] border border-white/10 bg-black/30 p-4"
                >
                  {KIND_LABEL[s.kind] && (
                    <p className="dl-label text-xs">{KIND_LABEL[s.kind]}</p>
                  )}
                  {s.html && (
                    <p className="dl-text text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: s.html }} />
                  )}
                  {s.stats.length > 0 && (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {s.stats.map((st, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 rounded-[3px] border border-black/40 bg-black/40 px-3 py-2"
                        >
                          {st.icon ? (
                            <img src={st.icon} alt="" className="h-4 w-4 shrink-0" />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          <span
                            className={`font-black ${st.tone === "elevated" ? "text-base" : "text-sm"}`}
                            style={st.tone === "basic" ? undefined : { color: slot.accent }}
                          >
                            {st.value}
                          </span>
                          <span className="text-xs text-[#e9e2d3]/80">{st.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {item.components.length > 0 && (
            <section className="space-y-2.5 border-t border-white/10 pt-5">
              <p className="dl-label">Componentes</p>
              <div className="flex flex-wrap gap-3">
                {item.components.map((c) => {
                  const content = (
                    <>
                      {c.image && <img src={c.image} alt="" className="h-8 w-8 object-contain" />}
                      <span className="text-xs font-bold text-[#f4efe6]">{c.name}</span>
                    </>
                  );
                  return shopSet.has(c.className) ? (
                    <Link
                      key={c.className}
                      href={`/items/${encodeURIComponent(c.className)}`}
                      className="flex items-center gap-2.5 rounded-[3px] border border-white/10 bg-black/40 px-3 py-2 transition-colors hover:border-amber-500/60 hover:bg-black/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={c.className}
                      className="flex items-center gap-2.5 rounded-[3px] border border-white/10 bg-black/40 px-3 py-2"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {upgradesInto.length > 0 && (
            <section className="space-y-2.5 border-t border-white/10 pt-5">
              <p className="dl-label">Melhora para</p>
              <div className="flex flex-wrap gap-3">
                {upgradesInto.map((u) => (
                  <Link
                    key={u.className}
                    href={`/items/${encodeURIComponent(u.className)}`}
                    className="flex items-center gap-2.5 rounded-[3px] border border-white/10 bg-black/40 px-3 py-2 transition-colors hover:border-amber-500/60 hover:bg-black/60"
                  >
                    {u.image && <img src={u.image} alt="" className="h-8 w-8 object-contain" />}
                    <div>
                      <span className="block text-xs font-bold text-[#f4efe6]">{u.name}</span>
                      <span className="block text-[10px] font-bold text-[#6fd3b3]">
                        Tier {u.tier} · ${u.cost}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}