"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import type { CommunityBuildItem } from "@/lib/backend/types";
import type { ShopItem } from "@/lib/deadlock";
import SlantFrame from "@/app/heroes/[id]/SlantFrame";

interface Props {
  build: CommunityBuildItem;
  heroName: string;
  heroImage: string | null;
  items: ShopItem[];
}

const PHASE_LABELS: Array<{
  key: keyof CommunityBuildItem["phases"];
  label: string;
  border: string;
  bg: string;
  titleColor: string;
}> = [
  {
    key: "early",
    label: "Early Game",
    border: "#659337",
    bg: "linear-gradient(160deg, rgba(22,38,14,0.88), rgba(8,11,9,0.96))",
    titleColor: "text-emerald-400",
  },
  {
    key: "mid",
    label: "Mid Game",
    border: "#c97a2e",
    bg: "linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))",
    titleColor: "text-amber-400",
  },
  {
    key: "late",
    label: "Late Game",
    border: "#9153b8",
    bg: "linear-gradient(160deg, rgba(36,18,48,0.88), rgba(9,9,12,0.96))",
    titleColor: "text-purple-400",
  },
  {
    key: "situational",
    label: "Situacional",
    border: "#3897a1",
    bg: "linear-gradient(160deg, rgba(16,44,48,0.88), rgba(7,12,14,0.96))",
    titleColor: "text-cyan-400",
  },
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
      <SlantFrame
        shape="narrowTop"
        border="#c97a2e"
        background="linear-gradient(160deg, rgba(46,30,12,0.88), rgba(8,10,10,0.96))"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 min-w-0">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              className="h-14 w-14 shrink-0 rounded-[4px] object-cover border border-white/15"
            />
          )}
          <div className="min-w-0">
            <h1 className="font-deadlock text-2xl sm:text-3xl font-black text-[#f4efe6] truncate">
              {build.title}
            </h1>
            <p className="text-xs text-neutral-300">
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
            className="rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500 hover:text-amber-400 cursor-pointer"
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
      </SlantFrame>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHASE_LABELS.map((phase, idx) => {
          const list = build.phases[phase.key] || [];
          return (
            <SlantFrame
              key={phase.key}
              shape={idx % 2 === 0 ? "slantLeft" : "slantRight"}
              border={phase.border}
              background={phase.bg}
              className="space-y-3"
            >
              <div className="border-b border-white/10 pb-2.5">
                <h2 className={`font-deadlock text-xs font-black uppercase tracking-wider ${phase.titleColor}`}>
                  {phase.label}
                </h2>
              </div>
              <div>
                {list.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Nenhum item nesta fase.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {list.map((cn) => {
                      const it = byClass.get(cn);
                      if (!it) return null;
                      return (
                        <Link
                          key={`${phase.key}-${cn}`}
                          href={`/items/${it.className}`}
                          className="flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-400/60 transition-colors"
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
            </SlantFrame>
          );
        })}
      </div>
    </div>
  );
}