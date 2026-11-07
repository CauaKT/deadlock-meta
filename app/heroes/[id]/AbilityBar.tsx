"use client";
/* eslint-disable @next/next/no-img-element */
import type { HeroAbilityFull } from "@/lib/deadlock";
const TIER_COSTS = [1, 2, 5];
const HEADER_KEYS = ["AbilityCooldown", "AbilityCastRange"];

function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}

export default function AbilityBar({ abilities }: { abilities: HeroAbilityFull[] }) {
  const [selectedSlot, setSelectedSlot] = useState(abilities[0]?.slot ?? 1);
  const [levels, setLevels] = useState<Record<number, number>>({});

  if (abilities.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-500">
        Não foi possível carregar as habilidades deste herói agora.
      </p>
    );
  }

  const selected = abilities.find((a) => a.slot === selectedSlot) ?? abilities[0];
  const level = levels[selected.slot] ?? 0;
  const setLevel = (value: number) =>
    setLevels((prev) => ({ ...prev, [selected.slot]: value }));

  const rows = selected.stats
    .map((s) => {
      const bonus = selected.upgrades
        .slice(0, level)
        .flat()
        .filter((u) => u.key === s.key && u.additive)
        .reduce((sum, u) => sum + u.bonus, 0);
      return { ...s, bonus, value: (s.base ?? 0) + bonus };
    })
    .filter((r) => r.value !== 0);

  const headerRows = rows.filter((r) => HEADER_KEYS.includes(r.key));
  const bodyRows = rows.filter((r) => !HEADER_KEYS.includes(r.key));
  const mainRows = bodyRows.filter((r) => r.important);
  const otherRows = bodyRows.filter((r) => !r.important);

  const show = (r: { prefix: string; value: number; unit: string }) =>
    `${r.prefix}${fmt(r.value)}${r.unit}`;

  const tierText = (i: number) => {
    if (selected.tiers[i]) return selected.tiers[i];
    return (selected.upgrades[i] ?? [])
      .map((u) => {
        const stat = selected.stats.find((s) => s.key === u.key);
        if (!stat || !u.additive) return "";
        return `${u.bonus > 0 ? "+" : ""}${fmt(u.bonus)}${stat.unit} ${stat.label}`;
      })
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap justify-center gap-8">
        {abilities.map((ab) => {
          const active = ab.slot === selected.slot;
          return (
            <button
              key={ab.className}
              type="button"
              onClick={() => setSelectedSlot(ab.slot)}
              aria-pressed={active}
              className="group flex flex-col items-center gap-2 outline-none"
            >
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full border-4 bg-[#1b1722] shadow-lg transition-all group-hover:scale-105 ${
                  active
                    ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                    : "border-neutral-500"
                }`}
              >
                {ab.image ? (
                  <img src={ab.image} alt={ab.name} className="h-14 w-14 object-contain" />
                ) : (
                  <span className="text-xs font-black text-neutral-500">{ab.slot}</span>
                )}
              </div>
              <span
                className={`rounded px-2 text-xs font-black ${
                  active ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-200"
                }`}
              >
                {ab.slot}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-2xl rounded-2xl border border-[#23352c] bg-[#0b100e]/90 p-5 text-left shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {selected.image && (
              <img src={selected.image} alt="" className="h-12 w-12 object-contain" />
            )}
            <div>
              <h3 className="text-lg font-black text-[#f4efe6]">{selected.name}</h3>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                {selected.slot === 4 ? "Suprema" : `Habilidade ${selected.slot}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {headerRows.map((r) => (
              <div
                key={r.key}
                className={`rounded-lg border px-2 py-1 text-center ${
                  r.bonus ? "border-emerald-400/60" : "border-neutral-700"
                } bg-[#121a16]/85`}
              >
                <p className="text-sm font-black text-neutral-100">{show(r)}</p>
                <p className="text-[9px] font-bold uppercase text-neutral-400">{r.label}</p>
              </div>
            ))}
          </div>
        </div>

        {selected.description && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">{selected.description}</p>
        )}

        {mainRows.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mainRows.map((r) => (
              <div
                key={r.key}
                className="relative rounded-lg border border-purple-500/40 bg-gradient-to-b from-[#2a1a45] to-[#160d26] px-3 py-2 text-center"
              >
                {r.scale ? (
                  <span className="absolute right-1.5 top-1 text-[9px] font-black text-purple-200">
                    ★ x{fmt(r.scale)}
                  </span>
                ) : null}
                {r.icon && <img src={r.icon} alt="" className="mx-auto mb-1 h-4 w-4" />}
                <p
                  className={`text-xl font-black ${r.bonus ? "text-emerald-300" : "text-white"}`}
                >
                  {show(r)}
                </p>
                <p className="text-[10px] font-bold uppercase text-neutral-300">{r.label}</p>
                {r.bonus ? (
                  <p className="text-[10px] font-bold text-emerald-300">
                    {r.bonus > 0 ? "+" : ""}
                    {fmt(r.bonus)}
                    {r.unit}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {otherRows.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {otherRows.map((r) => (
              <div
                key={r.key}
                className="rounded-lg border border-neutral-800/70 bg-[#121a16]/85 px-3 py-2"
              >
                <p className="text-[10px] font-bold uppercase text-neutral-400">{r.label}</p>
                <p
                  className={`text-sm font-black ${
                    r.bonus ? "text-emerald-300" : "text-neutral-100"
                  }`}
                >
                  {show(r)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-800/80 pt-4">
          {[0, 1, 2].map((i) => {
            const active = level > i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setLevel(level === i + 1 ? i : i + 1)}
                aria-pressed={active}
                className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                  active
                    ? "border-purple-400 bg-purple-900/40"
                    : "border-neutral-800 bg-[#121a16]/85 hover:border-purple-500/60"
                }`}
              >
                <span className="mb-1 block text-[10px] font-black text-purple-300">
                  T{i + 1} · ◆ {TIER_COSTS[i]}
                </span>
                <span className="block text-[11px] font-bold leading-snug text-neutral-200">
                  {tierText(i) || "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}