"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCommunityProfiles } from "@/lib/backend/client";
import type { CommunityProfileItem } from "@/lib/backend/types";

interface SearchHeroItem {
  id: number;
  name: string;
  image: string | null;
}

interface SearchShopItem {
  className: string;
  name: string;
  image: string | null;
  slot: "weapon" | "vitality" | "spirit";
  cost: number;
}

type ResultEntry =
  | { kind: "hero"; href: string; data: SearchHeroItem }
  | { kind: "item"; href: string; data: SearchShopItem }
  | { kind: "user"; href: string; data: CommunityProfileItem };

const SLOT_LABEL: Record<SearchShopItem["slot"], { label: string; color: string }> = {
  weapon: { label: "Arma", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  vitality: { label: "Vitalidade", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  spirit: { label: "Espírito", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function GlobalSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<{
    heroes: SearchHeroItem[];
    items: SearchShopItem[];
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [users, setUsers] = useState<CommunityProfileItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Atalho global Ctrl + K / Cmd + K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Focar input e carregar catálogo na primeira abertura
  useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
      setActiveIndex(0);
      return;
    }

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 20);

    if (!catalog && !catalogLoading) {
      setCatalogLoading(true);
      fetch("/api/search-catalog")
        .then((res) => (res.ok ? res.json() : { heroes: [], items: [] }))
        .then((data) => {
          setCatalog({
            heroes: Array.isArray(data.heroes) ? data.heroes : [],
            items: Array.isArray(data.items) ? data.items : [],
          });
        })
        .catch(() => setCatalog({ heroes: [], items: [] }))
        .finally(() => setCatalogLoading(false));
    }

    return () => clearTimeout(focusTimer);
  }, [open, catalog, catalogLoading]);

  // Busca de usuários na API com debounce
  useEffect(() => {
    if (!open) return;
    const clean = query.trim().replace(/^@+/, "");
    if (clean.length < 2) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    let cancelled = false;
    setUsersLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await searchCommunityProfiles({ search: clean, limit: 5 });
        if (!cancelled) {
          setUsers(list.filter((u) => Boolean(u.handle)));
        }
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const { matchedHeroes, matchedItems, flatResults } = useMemo(() => {
    const q = normalize(query.replace(/^@+/, ""));
    const isHandleOnly = query.trim().startsWith("@");

    const hList =
      !q || isHandleOnly || !catalog
        ? []
        : catalog.heroes
            .filter((h) => normalize(h.name).includes(q))
            .slice(0, 5);

    const iList =
      !q || isHandleOnly || !catalog
        ? []
        : catalog.items
            .filter((item) => normalize(item.name).includes(q))
            .slice(0, 5);

    const flat: ResultEntry[] = [
      ...hList.map((data): ResultEntry => ({
        kind: "hero",
        href: `/heroes/${data.id}`,
        data,
      })),
      ...iList.map((data): ResultEntry => ({
        kind: "item",
        href: `/items/${data.className}`,
        data,
      })),
      ...users
        .filter((u) => Boolean(u.handle))
        .map((data): ResultEntry => ({
          kind: "user",
          href: `/profile/${data.handle}`,
          data,
        })),
    ];

    return { matchedHeroes: hList, matchedItems: iList, flatResults: flat };
  }, [query, catalog, users]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length, query]);

  if (!open) return null;

  const navigateTo = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[activeIndex];
      if (target) navigateTo(target.href);
    }
  };

  const hasQuery = query.trim().length > 0;
  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0d0c] shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
      >
        {/* Campo de busca */}
        <div className="flex items-center gap-3 border-b border-neutral-800/90 px-4 py-3.5">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-amber-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar heróis, itens ou @handle..."
            className="w-full bg-transparent text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2 lp-scroll">
          {!hasQuery ? (
            <div className="px-3 py-8 text-center space-y-1.5">
              <p className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-400">
                Busca Rápida
              </p>
              <p className="text-xs text-neutral-500">
                Digite o nome de um herói, item ou <span className="font-mono text-amber-400">@handle</span> de jogador.
              </p>
            </div>
          ) : catalogLoading && !catalog ? (
            <div className="px-3 py-8 text-center text-xs text-neutral-400">
              Carregando catálogo...
            </div>
          ) : flatResults.length === 0 && !usersLoading ? (
            <div className="px-3 py-8 text-center text-xs text-neutral-500">
              Nenhum resultado encontrado para &ldquo;{query.trim()}&rdquo;.
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {matchedHeroes.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Heróis
                  </p>
                  {matchedHeroes.map((hero) => {
                    globalIdx += 1;
                    const idx = globalIdx;
                    const active = activeIndex === idx;
                    return (
                      <button
                        key={`hero-${hero.id}`}
                        type="button"
                        onClick={() => navigateTo(`/heroes/${hero.id}`)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? "bg-amber-500/15 text-amber-300"
                            : "text-[#f4efe6] hover:bg-neutral-900"
                        }`}
                      >
                        {hero.image ? (
                          <img
                            src={hero.image}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded-md object-cover border border-neutral-700"
                          />
                        ) : (
                          <span className="h-7 w-7 shrink-0 rounded-md bg-neutral-800 border border-neutral-700" />
                        )}
                        <span className="flex-1 truncate text-sm font-semibold">{hero.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Herói
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedItems.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Itens
                  </p>
                  {matchedItems.map((item) => {
                    globalIdx += 1;
                    const idx = globalIdx;
                    const active = activeIndex === idx;
                    const slotMeta = SLOT_LABEL[item.slot];
                    return (
                      <button
                        key={`item-${item.className}`}
                        type="button"
                        onClick={() => navigateTo(`/items/${item.className}`)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? "bg-amber-500/15 text-amber-300"
                            : "text-[#f4efe6] hover:bg-neutral-900"
                        }`}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded-md object-cover border border-neutral-700 bg-neutral-900"
                          />
                        ) : (
                          <span className="h-7 w-7 shrink-0 rounded-md bg-neutral-800 border border-neutral-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                        </div>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${slotMeta.color}`}>
                          {slotMeta.label}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                          {item.cost}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {(users.length > 0 || usersLoading) && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Jogadores
                  </p>
                  {usersLoading && users.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-neutral-500">Buscando usuários...</p>
                  ) : (
                    users
                      .filter((u) => Boolean(u.handle))
                      .map((u) => {
                        globalIdx += 1;
                        const idx = globalIdx;
                        const active = activeIndex === idx;
                        return (
                          <button
                            key={`user-${u.id}`}
                            type="button"
                            onClick={() => navigateTo(`/profile/${u.handle}`)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              active
                                ? "bg-amber-500/15 text-amber-300"
                                : "text-[#f4efe6] hover:bg-neutral-900"
                            }`}
                          >
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-7 w-7 shrink-0 rounded-full object-cover border border-neutral-700"
                              />
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-neutral-300 border border-neutral-700">
                                {(u.username || u.handle || "?").charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {u.username || `@${u.handle}`}
                              </p>
                              <p className="truncate font-mono text-[11px] text-neutral-400">
                                @{u.handle}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              Perfil
                            </span>
                          </button>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}