"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { HeroAbilityFull } from "@/lib/deadlock";
import { ABILITY_NOTES } from "@/lib/abilityNotes";
const TIER_COSTS = [1, 2, 5];
const COOLDOWN_KEY = "AbilityCooldown";
// Chips do cabeçalho, na ordem da wiki: alcance, raio, duração
const CHIP_KEYS = ["AbilityCastDelay", "AbilityCastRange", "Radius", "AbilityDuration"];

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
function fmt(n: number) {
  return nf.format(Math.round(n * 100) / 100);
}

const BOX_STYLES: Record<string, { box: string; badge: string; glyph: string }> = {
  spirit: {
    box: "border-[#7d4ea8] bg-[radial-gradient(ellipse_at_center,#150b24_25%,#34204f_100%)]",
    badge: "text-[#ce91ff]",
    glyph: "☆",
  },
  weapon: {
    box: "border-[#9e630c] bg-[radial-gradient(ellipse_at_center,#241505_25%,#4a3010_100%)]",
    badge: "text-[#ec981a]",
    glyph: "⚙",
  },
  vitality: {
    box: "border-[#659818] bg-[radial-gradient(ellipse_at_center,#12200a_25%,#2e4619_100%)]",
    badge: "text-[#7cbb1e]",
    glyph: "✚",
  },
  other: {
    box: "border-[#3f8574] bg-[radial-gradient(ellipse_at_center,#0d2119_25%,#1f4a3b_100%)]",
    badge: "text-[#99ffd6]",
    glyph: "◆",
  },
  none: {
    box: "border-transparent bg-[#3a3731]",
    badge: "text-[#cdcdcd]",
    glyph: "",
  },
};

// Cor do ícone de cada propriedade, como na wiki
function iconColor(key: string): string {
  if (/heal/i.test(key)) return "#00ff99";
  if (/speed/i.test(key)) return "#00ff99";
  if (/distance|range|radius/i.test(key)) return "#b57edc";
  if (/amp/i.test(key)) return "#f0553d";
  if (/damage|dps/i.test(key)) return "#ff5a47";
  return "#cdcdcd";
}

// Pinta um ícone branco da API com a cor que a gente escolher
function TintIcon({
  src,
  color,
  className = "h-4 w-4",
}: {
  src: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: color,
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" />
      <path d="M13 6 8.5 13h3l-.5 5 4.5-7h-3z" fill="#2b1a45" />
    </svg>
  );
}

export default function AbilityBar({
  abilities: rawAbilities,
  heroKey,
}: {
  abilities?: HeroAbilityFull[];
  heroKey?: string;
}) {
  const abilities: HeroAbilityFull[] = (rawAbilities ?? [])
    .filter(Boolean)
    .map((a) => ({
      ...a,
      stats: a.stats ?? [],
      upgrades: a.upgrades ?? [],
      tiers: a.tiers ?? [],
      tiersHtml: a.tiersHtml ?? [],
      descriptionHtml: a.descriptionHtml ?? "",
      importantKeys: a.importantKeys ?? [],
      headerKeys: a.headerKeys ?? [],
      basicKeys: a.basicKeys ?? [],
      groups: a.groups ?? [],
    }));

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
  const notes = (heroKey && ABILITY_NOTES[heroKey]?.[selected.slot]) || [];
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

  const cooldown = rows.find((r) => r.key === COOLDOWN_KEY);
  const chipKeys = [...CHIP_KEYS, ...selected.headerKeys].filter(
    (k, i, arr) => k !== COOLDOWN_KEY && arr.indexOf(k) === i
  );
  const chips = chipKeys
    .map((k) => rows.find((r) => r.key === k))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const used = new Set([COOLDOWN_KEY, ...chips.map((c) => c.key)]);

  // Grupos de caixas ("Ao atingir inimigos:", ...) na ordem que a API manda
  const groups = selected.groups
    .map((g) => {
      const boxes = g.props
        .map((p) => {
          const row = rows.find((r) => r.key === (p.valueKey || p.key));
          if (!row || used.has(row.key)) return null;
          return { prop: p, row };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
      boxes.forEach((b) => used.add(b.row.key));
      return { label: g.label, boxes };
    })
    .filter((g) => g.boxes.length > 0);

  const basicRows = selected.basicKeys
    .map((k) => rows.find((r) => r.key === k))
    .filter((r): r is NonNullable<typeof r> => Boolean(r) && !used.has(r!.key));

  const show = (r: { prefix: string; value: number; unit: string }) => {
    const prefix = r.prefix
      .replace(/\{s:sign\}/g, r.value > 0 ? "+" : "")
      .replace(/\{[^}]*\}/g, "");
    return `${prefix}${fmt(r.value)}`;
  };

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
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-8">
        {abilities.map((ab) => {
          const active = ab.slot === selected.slot;
          return (
            <button
              key={`${ab.slot}-${ab.className}`}
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

      {/* Plano inclinado: card + upgrades */}
      <div className="dl-stage w-full max-w-[520px]">
        <div className="dl-tilt flex flex-col gap-3">
          {/* Card da habilidade */}
          <div className="dl-text dl-panel dl-noise w-full p-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {selected.image && (
                  <img
                    src={selected.image}
                    alt=""
                    className="h-9 w-9 shrink-0 object-contain"
                  />
                )}
                <h3 className="text-[1.7rem] font-semibold leading-none text-[#ffefd7] [text-shadow:2px_2px_0_rgba(0,0,0,0.25)]">
                  {selected.name}
                </h3>
              </div>
              {cooldown && (
                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-[4px] bg-white/10 px-2 py-1 font-bold ${
                    cooldown.bonus ? "text-[#99f051]" : "text-[#ffefd7]"
                  }`}
                >
                  <ClockIcon />
                  <span className="text-lg leading-none">
                    {fmt(cooldown.value)}
                    <span className="text-xs">{cooldown.unit || "s"}</span>
                  </span>
                </div>
              )}
            </div>

            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <div
                    key={c.key}
                    className={`flex items-center gap-1.5 rounded-[4px] bg-white/10 px-2 py-1 font-bold ${
                      c.bonus ? "text-[#99f051]" : "text-[#ffefd7]"
                    }`}
                  >
                    {c.icon && <img src={c.icon} alt="" className="h-4 w-4 opacity-80" />}
                    <span className="text-sm leading-none">
                      {show(c)}
                      <span className="ml-0.5 text-xs">{c.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selected.descriptionHtml ? (
              <div
                className="dl-rich mt-3 text-[0.95rem]"
                dangerouslySetInnerHTML={{ __html: selected.descriptionHtml }}
              />
            ) : selected.description ? (
              <p className="mt-3 text-[0.95rem]">{selected.description}</p>
            ) : null}

            {groups.map((g, gi) => (
              <div key={gi} className="mt-3">
                {g.label && <p className="dl-label mb-1">{g.label}</p>}
                <div className="grid auto-cols-fr grid-flow-col gap-1">
                  {g.boxes.map(({ prop, row: r }) => {
                    // Efeito de status (Atordoa, Imobiliza...): caixa cinza com nome + duração
                    if (prop.valueKey) {
                      return (
                        <div
                          key={r.key}
                          className={`dl-stat dl-noise flex min-h-[72px] flex-col items-center justify-center rounded-[3px] border px-2 py-2 text-center ${BOX_STYLES.none.box}`}
                        >
                          <div className="flex items-center justify-center gap-1.5 font-bold text-[#ffefd7]">
                            {prop.icon && <TintIcon src={prop.icon} color="#b58cff" className="h-5 w-5" />}
                            <span className="text-[1.25rem] leading-none">{prop.statusName}</span>
                          </div>
                          <p
                            className={`mt-1 text-[0.8rem] font-semibold leading-tight ${
                              r.bonus ? "text-[#99f051]" : "text-[#ffefd7]"
                            }`}
                          >
                            {show(r)}
                            {r.unit}{" "}
                            <span className="font-medium text-[#cdcdcd]">
                              {r.postLabel || r.label}
                            </span>
                          </p>
                        </div>
                      );
                    }

                    const st = BOX_STYLES[r.scaleType ?? "none"];
                    return (
                      <div
                        key={r.key}
                        className={`dl-stat dl-noise flex min-h-[72px] flex-col items-center justify-center rounded-[3px] border px-2 py-2 text-center ${st.box}`}
                      >
                        {r.scale ? (
                          <span
                            className={`absolute -right-2 -top-3 z-10 rotate-6 text-[0.8rem] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${st.badge}`}
                          >
                            {st.glyph} x {fmt(r.scale)}
                          </span>
                        ) : null}
                        <div
                          className={`flex items-center justify-center gap-1.5 font-bold ${
                            r.bonus ? "text-[#99f051]" : "text-[#ffefd7]"
                          }`}
                        >
                          {r.icon && (
                            <TintIcon src={r.icon} color={iconColor(r.key)} className="h-[1.1rem] w-[1.1rem]" />
                          )}
                          <span className="text-[1.55rem] leading-none">{show(r)}</span>
                          <span className="text-[0.85rem]">{r.unit}</span>
                        </div>
                        <p className="mt-1 text-[0.8rem] font-semibold leading-tight text-[#ffefd7]">
                          {r.postLabel || r.label}
                        </p>
                        {r.bonus ? (
                          <p className="text-[0.65rem] font-bold text-[#99f051]">
                            ({r.bonus > 0 ? "+" : ""}
                            {fmt(r.bonus)}
                            {r.unit})
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {basicRows.length > 0 && (
              <div className="mt-1 flex flex-wrap justify-around gap-x-6 gap-y-1 rounded-[3px] bg-[#3a3731]/90 px-4 py-2.5">
                {basicRows.map((r) => (
                  <div
                    key={r.key}
                    className={`flex items-baseline gap-1.5 ${
                      r.bonus ? "text-[#99f051]" : "text-[#ffefd7]"
                    }`}
                  >
                    {r.icon && (
                      <TintIcon src={r.icon} color={iconColor(r.key)} className="h-4 w-4 self-center" />
                    )}
                    <span className="text-[1.05rem] font-bold leading-none">
                      {show(r)}
                      <span className="text-[0.75rem]">{r.unit}</span>
                    </span>
                    <span className="text-[0.8rem] font-medium text-[#cdcdcd]">
                      {r.postLabel || r.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cartas de upgrade (T1 / T2 / T3) */}
          <div className="grid w-full grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => {
              const active = level > i;
              const html = selected.tiersHtml[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLevel(level === i + 1 ? i : i + 1)}
                  aria-pressed={active}
                  className={`dl-text dl-tier dl-noise relative flex flex-col overflow-hidden rounded-[3px] border-2 text-center transition-colors ${
                    active ? "border-[#99f051]" : "border-[#2a2a2a] hover:border-[#4a4a4a]"
                  }`}
                >
                  <div className="flex shrink-0 items-center justify-center gap-1.5 bg-[#3b2a57] py-1.5 font-bold text-[#d9b8ff]">
                    <DiamondIcon />
                    <span className="text-lg leading-none">{TIER_COSTS[i]}</span>
                  </div>
                  <div className="relative flex min-h-[104px] flex-1 items-center justify-center px-2 py-3">
                    {html ? (
                      <div
                        className="dl-rich relative text-[0.9rem] font-bold leading-snug text-[#ffefd7]"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    ) : (
                      <div className="relative text-[0.9rem] font-bold leading-snug text-[#ffefd7]">
                        {tierText(i) || "—"}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="w-full max-w-[520px] border-t border-neutral-800/80 pt-4 text-left">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-400">
            Notas
          </h4>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-neutral-300">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-neutral-500">
            Fonte:{" "}
            <a
              href="https://deadlock.wiki"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-neutral-300"
            >
              The Deadlock Wiki
            </a>{" "}
            (CC BY-SA)
          </p>
        </div>
      )}
    </div>
  );
}