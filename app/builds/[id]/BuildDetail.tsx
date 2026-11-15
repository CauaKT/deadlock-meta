"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import type { CommunityBuildItem } from "@/lib/backend/types";
import type { ShopItem } from "@/lib/deadlock";

interface Props {
  build: CommunityBuildItem;
  heroName: string;
  heroImage: string | null;
  items: ShopItem[];
}

const PHASE_LABELS: Array<{ key: keyof CommunityBuildItem["phases"]; label: string }> = [
  { key: "early", label: "Early Game" },
  { key: "mid", label: "Mid Game" },
  { key: "late", label: "Late Game" },
  { key: "situational", label: "Situacional" },
];

export default function BuildDetail({ build, heroName, heroImage, items }: Props) {
  const [copied, setCopied] = useState(false);
  const byClass = new Map(items.map((i) => [i.className, i]));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              className="h-14 w-14 shrink-0 rounded-[4px] object-cover border border-neutral-700"
            />
          )}
          <div className="min-w-0">
            <h1 className="font-deadlock text-2xl sm:text-3xl font-black text-[#f4efe6] truncate">
              {build.title}
            </h1>
            <p className="text-xs text-neutral-400">
              Herói:{" "}
              <Link href={`/heroes/${build.heroId}`} className="text-amber-400 hover:underline font-semibold">
                {heroName}
              </Link>{" "}
              • por{" "}
              {build.authorHandle ? (
                <Link href={`/profile/${build.authorHandle}`} className="text-amber-400 hover:underline">
                  @{build.authorHandle}
                </Link>
              ) : (
                build.author
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-[4px] border border-neutral-700 bg-[#070908] px-3 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500 hover:text-amber-400 cursor-pointer"
          >
            {copied ? "Link Copiado!" : "Copiar Link"}
          </button>
          {build.canEdit && (
            <Link
              href={`/builds?edit=${build.id}`}
              className="rounded-[4px] bg-amber-500 px-3 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHASE_LABELS.map((phase) => {
          const list = build.phases[phase.key] || [];
          return (
            <div
              key={phase.key}
              className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 overflow-hidden shadow-lg"
            >
              <div className="dl-halftone relative border-b border-neutral-800/90 bg-neutral-900/70 px-4 py-2.5">
                <h2 className="relative z-10 font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
                  {phase.label}
                </h2>
              </div>
              <div className="p-4">
                {list.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">Nenhum item nesta fase.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {list.map((cn) => {
                      const it = byClass.get(cn);
                      if (!it) return null;
                      return (
                        <Link
                          key={`${phase.key}-${cn}`}
                          href={`/items/${it.className}`}
                          className="flex items-center gap-2 rounded-[4px] border border-neutral-800 bg-[#070908] p-2 hover:border-amber-500/60 transition-colors"
                        >
                          {it.image && (
                            <img src={it.image} alt="" className="h-8 w-8 shrink-0 rounded-[3px] object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#f4efe6]">{it.name}</p>
                            <p className="font-mono text-[10px] text-[#5ce1b6]">{it.cost}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}