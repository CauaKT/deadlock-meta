"use client";
// app/TierMaker.tsx
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useSyncExternalStore, type CSSProperties, type DragEvent } from "react";
import { TIERS, type TierKey } from "./tiers";

export interface MakerHero {
  id: number;
  name: string;
  image: string;
  gloatImage?: string;
  critImage?: string;
  rgb: [number, number, number] | null;
}

type Zone = TierKey | "POOL";
type Board = Record<Zone, number[]>;
interface Draft {
  title: string;
  board: Board;
}

// A tier list compartilhada vive no hash da URL (#tl=1&n=título&A=1,2,3). Não há banco de dados.
export const SHARE_PARAM = "tl";
const TITLE_MAX = 40;
const TIER_KEYS = TIERS.map((t) => t.key);
const ZONES: Zone[] = [...TIER_KEYS, "POOL"];

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useHash() {
  return useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
}

export function hasSharedList(hash: string) {
  return new URLSearchParams(hash.slice(1)).get(SHARE_PARAM) === "1";
}

function buildBoard(picked: Partial<Record<TierKey, number[]>>, heroes: MakerHero[]): Board {
  const valid = new Set(heroes.map((h) => h.id));
  const used = new Set<number>();
  const board = {} as Board;
  for (const key of TIER_KEYS) {
    const list: number[] = [];
    for (const id of picked[key] ?? []) {
      if (valid.has(id) && !used.has(id)) {
        used.add(id);
        list.push(id);
      }
    }
    board[key] = list;
  }
  board.POOL = heroes.map((h) => h.id).filter((id) => !used.has(id));
  return board;
}

function parseHash(hash: string, heroes: MakerHero[]): Draft {
  const p = new URLSearchParams(hash.slice(1));
  const picked: Partial<Record<TierKey, number[]>> = {};
  if (p.get(SHARE_PARAM) === "1") {
    for (const key of TIER_KEYS) {
      picked[key] = (p.get(key) ?? "").split(",").filter(Boolean).map(Number).filter(Number.isInteger);
    }
  }
  return { title: (p.get("n") ?? "").slice(0, TITLE_MAX), board: buildBoard(picked, heroes) };
}

function writeHash({ title, board }: Draft) {
  const p = new URLSearchParams();
  if (title.trim() || TIER_KEYS.some((k) => board[k].length > 0)) {
    p.set(SHARE_PARAM, "1");
    if (title.trim()) p.set("n", title);
    for (const k of TIER_KEYS) if (board[k].length > 0) p.set(k, board[k].join(","));
  }
  const qs = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${qs ? `#${qs}` : ""}`);
}

interface Props {
  heroes: MakerHero[];
  metaTiers: Record<TierKey, number[]>;
  patchLabel: string;
}

export default function TierMaker({ heroes, metaTiers, patchLabel }: Props) {
  const hash = useHash();
  const [override, setOverride] = useState<(Draft & { base: string }) | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<{ zone: Zone; before?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseHash(hash, heroes), [hash, heroes]);
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const draft: Draft = override && override.base === hash ? override : parsed;
  const placed = heroes.length - draft.board.POOL.length;

  const commit = (next: Draft) => {
    setOverride({ ...next, base: hash });
    writeHash(next);
  };

  const moveHero = (id: number, zone: Zone, beforeId?: number) => {
    if (beforeId === id) return;
    const board = {} as Board;
    for (const z of ZONES) board[z] = draft.board[z].filter((x) => x !== id);
    const at = beforeId === undefined ? -1 : board[zone].indexOf(beforeId);
    if (at >= 0) board[zone].splice(at, 0, id);
    else board[zone].push(id);
    commit({ ...draft, board });
    setSelected(null);
  };

  const confirmReplace = () => placed === 0 || window.confirm("Isso substitui a sua tier list atual. Continuar?");

  const fillWithMeta = () => {
    if (confirmReplace()) commit({ ...draft, board: buildBoard(metaTiers, heroes) });
  };

  const clearBoard = () => {
    if (confirmReplace()) commit({ ...draft, board: buildBoard({}, heroes) });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  };

  const dropOn = (zone: Zone, beforeId?: number) => {
    if (dragId !== null) moveHero(dragId, zone, beforeId);
    setDragId(null);
    setOver(null);
  };

  const renderChip = (id: number, zone: Zone) => {
    const hero = byId.get(id);
    if (!hero) return null;
    const isSelected = selected === id;
    const isTarget = over?.zone === zone && over.before === id && dragId !== id;
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        draggable
        title={hero.name}
        aria-label={hero.name}
        aria-pressed={isSelected}
        style={{ "--hc": hero.rgb ? hero.rgb.join(" ") : "245 158 11" } as CSSProperties}
        onClick={(e) => {
          e.stopPropagation();
          if (selected !== null && selected !== id) moveHero(selected, zone, id);
          else setSelected(isSelected ? null : id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(id));
          e.dataTransfer.effectAllowed = "move";
          setDragId(id);
          setSelected(null);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        onDragOver={(e) => {
          if (dragId === null) return;
          e.preventDefault();
          e.stopPropagation();
          setOver({ zone, before: id });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dropOn(zone, id);
        }}
        className={`relative w-[64px] shrink-0 cursor-grab select-none rounded-lg border bg-neutral-900/40 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/70 active:cursor-grabbing sm:w-[72px] ${
          isSelected ? "z-10 -translate-y-1 border-amber-400 ring-2 ring-amber-400/70" : "border-neutral-800/70 hover:border-amber-500/80"
        } ${dragId === id ? "opacity-40" : ""} ${isTarget ? "shadow-[-5px_0_0_0_rgb(245_158_11)]" : ""}`}
      >
        <div className="hero-card-art relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-lg">
          {hero.image ? (
            <img src={hero.image} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-extrabold text-neutral-500">{hero.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <p className="truncate px-1 py-1 text-center text-[10px] font-bold leading-tight text-neutral-200">{hero.name}</p>
      </div>
    );
  };

  const zoneHandlers = (zone: Zone) => ({
    onClick: () => {
      if (selected !== null) moveHero(selected, zone);
    },
    onDragOver: (e: DragEvent) => {
      if (dragId === null) return;
      e.preventDefault();
      setOver({ zone });
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      dropOn(zone);
    },
  });

  const zoneHot = (zone: Zone) => over?.zone === zone && over.before === undefined;
  const btn =
    "rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#f4efe6] transition-colors hover:border-amber-500/70 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <input
            value={draft.title}
            onChange={(e) => commit({ ...draft, title: e.target.value.slice(0, TITLE_MAX) })}
            placeholder="Minha Tier List"
            aria-label="Título da sua tier list"
            maxLength={TITLE_MAX}
            className="font-deadlock w-full border-b border-dashed border-neutral-700 bg-transparent pb-1 text-2xl font-black text-[#f4efe6] outline-none placeholder:text-neutral-600 focus:border-amber-500 md:text-4xl"
          />
          <p className="mt-2 text-xs font-medium text-neutral-400">
            Arraste os heróis para os tiers. No celular, toque no herói e depois no tier. {placed}/{heroes.length} classificados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fillWithMeta} className={btn} title={`Preenche com o tier do meta: ${patchLabel}`}>
            Preencher com o meta
          </button>
          <button type="button" onClick={clearBoard} disabled={placed === 0} className={btn}>
            Limpar
          </button>
          <button
            type="button"
            onClick={copyLink}
            disabled={placed === 0}
            className="rounded-lg border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-black uppercase tracking-wider text-black transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      <div className="divide-y divide-neutral-800/90 rounded-2xl border border-neutral-800/90 bg-neutral-900/50 shadow-2xl backdrop-blur-sm">
        {TIERS.map((tier, i) => {
          const isFirst = i === 0;
          const isLast = i === TIERS.length - 1;
          const list = draft.board[tier.key];
          return (
            <div key={tier.key} className="flex min-h-[104px] flex-row">
              <button
                type="button"
                onClick={() => selected !== null && moveHero(selected, tier.key)}
                aria-label={`Mover o herói selecionado para o tier ${tier.label}`}
                className={`flex w-24 shrink-0 select-none items-center justify-center p-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-36 md:w-40 ${tier.badgeBg} ${tier.badgeText} ${
                  isFirst ? "rounded-tl-2xl" : ""
                } ${isLast ? "rounded-bl-2xl" : ""}`}
              >
                <span className="font-deadlock text-xs sm:text-sm md:text-base lg:text-lg font-black leading-tight tracking-wider [overflow-wrap:anywhere] max-w-full px-1">{tier.label}</span>
              </button>
              <div
                {...zoneHandlers(tier.key)}
                className={`flex flex-1 flex-wrap content-center items-center gap-2 p-2 transition-colors sm:p-3 ${
                  zoneHot(tier.key) ? "bg-amber-500/15" : "bg-neutral-950/75"
                } ${selected !== null ? "cursor-pointer" : ""} ${isFirst ? "rounded-tr-2xl" : ""} ${isLast ? "rounded-br-2xl" : ""}`}
              >
                {list.length === 0 ? (
                  <span className="px-2 text-xs italic text-neutral-600">Solte heróis aqui</span>
                ) : (
                  list.map((id) => renderChip(id, tier.key))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section
        {...zoneHandlers("POOL")}
        className={`sticky bottom-0 z-20 mt-4 rounded-2xl border bg-neutral-950/95 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors ${
          zoneHot("POOL") ? "border-amber-500/80" : "border-neutral-800/90"
        }`}
      >
        <div className="flex items-center justify-between px-3 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Heróis disponíveis</span>
          <span>{draft.board.POOL.length}</span>
        </div>
        <div className="flex max-h-[34svh] flex-wrap gap-2 overflow-y-auto p-2 [scrollbar-width:thin] sm:p-3">
          {draft.board.POOL.length === 0 ? (
            <span className="px-2 py-3 text-xs italic text-neutral-500">Todos os heróis foram classificados.</span>
          ) : (
            draft.board.POOL.map((id) => renderChip(id, "POOL"))
          )}
        </div>
      </section>
    </div>
  );
}