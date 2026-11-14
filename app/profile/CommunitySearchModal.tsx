"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchCommunityProfiles } from "@/lib/backend/client";
import type { CommunityProfileItem } from "@/lib/backend/types";

export default function CommunitySearchModal({
  open,
  onCloseAction,
}: {
  open: boolean;
  onCloseAction: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CommunityProfileItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseAction();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCloseAction]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void searchCommunityProfiles({ search: query, limit: 100 }).then((res) => {
        if (!active) return;
        setItems(res);
        setLoading(false);
      });
    }, query ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Todas as contas do site"
      onClick={onCloseAction}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0d0c] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h3 className="border-l-2 border-amber-500 pl-2 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
            Contas da Comunidade
          </h3>
          <button
            type="button"
            onClick={onCloseAction}
            aria-label="Fechar"
            className="cursor-pointer rounded-lg px-2 py-1 text-xs font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-neutral-800/80 px-5 py-3">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nick ou @handle..."
            className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="lp-scroll flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-neutral-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span>Buscando contas...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-xs text-neutral-500">
              {query.trim()
                ? `Nenhuma conta encontrada para "${query.trim()}".`
                : "Nenhuma outra conta cadastrada."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/profile/${p.handle}`}
                    onClick={onCloseAction}
                    className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-neutral-800 hover:bg-neutral-900/70"
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-neutral-700 object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 font-deadlock text-xs font-black text-amber-400">
                        {(p.username || p.handle || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#f4efe6]">
                        {p.username || p.handle}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">@{p.handle}</p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400">Ver perfil →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}