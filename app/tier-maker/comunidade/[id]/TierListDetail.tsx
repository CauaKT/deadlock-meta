"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MakerHero } from "@/app/TierMaker";
import { exportTierListToPng } from "@/app/tier-maker/exportTierListPng";
import { getTierListById } from "@/lib/backend/client";
import type { TierListItem } from "@/lib/backend/types";

export default function TierListDetail({ id, heroes }: { id: string; heroes: MakerHero[] }) {
  const [item, setItem] = useState<TierListItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [copied, setCopied] = useState(false);

  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  useEffect(() => {
    let active = true;
    getTierListById(id).then((res) => {
      if (!active) return;
      if (res.ok) setItem(res.data);
      else setNotFound(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const heroesOf = (ids: number[] | undefined) =>
    (ids || []).map((hId) => byId.get(hId)).filter((h): h is MakerHero => Boolean(h));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const exportPng = async () => {
    if (!item) return;
    setExporting(true);
    setExportError(false);
    try {
      await exportTierListToPng({
        title: item.title,
        author: item.author,
        dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
        tiers: item.tiers.map((t) => ({
          label: t.label,
          color: t.color,
          heroes: heroesOf(t.heroes).map((h) => ({ id: h.id, name: h.name, image: h.image })),
        })),
      });
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  if (notFound) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-neutral-800/90 bg-neutral-900/20 px-4 py-16 text-center">
        <p className="font-deadlock text-xl font-black text-[#f4efe6]">Tier list não encontrada</p>
        <p className="text-xs text-neutral-400">O link pode estar incorreto ou a tier list foi excluída.</p>
        <Link
          href="/tier-maker/comunidade"
          className="inline-block rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black"
        >
          Ver a Comunidade
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 py-16 text-center text-xs text-neutral-400">
        Carregando tier list...
      </div>
    );
  }

  const totalPlaced = item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0);
  const dateText = new Date(item.createdAt).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      <Link
        href="/tier-maker/comunidade"
        className="inline-block text-xs font-bold text-neutral-400 transition-colors hover:text-amber-400"
      >
        ← Voltar para a Comunidade
      </Link>

      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-deadlock text-3xl font-black text-[#f4efe6] md:text-4xl">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span>
              Por{" "}
              {item.authorHandle ? (
                <Link
                  href={`/profile/${item.authorHandle}`}
                  className="font-bold text-neutral-200 transition-colors hover:text-amber-400"
                >
                  {item.author}
                </Link>
              ) : (
                <strong className="text-neutral-200">{item.author}</strong>
              )}
            </span>
            <span>•</span>
            <span>{dateText}</span>
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
              {totalPlaced} {totalPlaced === 1 ? "herói" : "heróis"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 shadow transition-all hover:border-amber-500/70 hover:bg-neutral-800 hover:text-[#f4efe6]"
          >
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportPng}
            className="rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-amber-400 shadow transition-all hover:border-amber-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            {exporting ? "Gerando..." : "Exportar PNG"}
          </button>
          {item.canEdit && (
            <Link
              href={`/tier-maker?edit=${item.id}`}
              className="rounded-[5px] border border-neutral-700/80 bg-neutral-800/80 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] shadow transition-all hover:border-amber-500/80 hover:text-amber-400"
            >
              Abrir no Editor
            </Link>
          )}
        </div>
      </div>

      {exportError && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs font-bold text-rose-300">
          Não foi possível gerar o arquivo PNG.
        </div>
      )}

      <div className="divide-y divide-neutral-800/90 overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-900/50 shadow-2xl">
        {item.tiers.map((t, idx) => {
          const tierHeroes = heroesOf(t.heroes);
          return (
            <div key={idx} className="flex min-h-[72px] flex-row">
              <div
                style={{ backgroundColor: t.color }}
                className="flex w-24 shrink-0 items-center justify-center p-2 text-center select-none sm:w-36"
              >
                <span className="font-deadlock break-words px-1 text-sm font-black uppercase leading-tight text-black sm:text-base">
                  {t.label.replace(/\n+/g, " ")}
                </span>
              </div>
              <div className="flex flex-1 flex-wrap content-center items-center gap-2 bg-neutral-950/75 p-3">
                {tierHeroes.length === 0 ? (
                  <span className="px-1 text-xs italic text-neutral-600">—</span>
                ) : (
                  tierHeroes.map((h) => (
                    <div
                      key={h.id}
                      title={h.name}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm sm:h-14 sm:w-14"
                    >
                      <img src={h.image} alt={h.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}