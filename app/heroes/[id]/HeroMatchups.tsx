/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { HeroMatchupEntry, HeroMatchups as HeroMatchupsData } from "@/lib/deadlock";
import SlantFrame from "@/components/ui/SlantFrame";

const PLATE = "rounded-[3px] border border-black/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]";

function MatchupGroup({
  title,
  entries,
  positive,
}: {
  title: string;
  entries: HeroMatchupEntry[];
  positive: boolean;
}) {
  return (
    <div className="space-y-2">
      <p
        className={`font-deadlock text-xs font-black uppercase tracking-wider ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {title}
      </p>
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.heroId}
              href={`/heroes/${entry.heroId}`}
              className={`flex items-center gap-3 px-3 py-2 ${PLATE} transition-colors hover:border-white/25`}
            >
              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="h-9 w-9 shrink-0 rounded-[3px] bg-black/50 object-cover"
                />
              ) : (
                <span aria-hidden className="h-9 w-9 shrink-0 rounded-[3px] bg-black/50" />
              )}
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#f4efe6]">{entry.name}</span>
                <span className="block text-[11px] font-medium text-[#d6c9b4]/70">
                  {entry.matches.toLocaleString("pt-BR")} jogos
                </span>
              </div>
              <span
                className={`font-deadlock text-sm font-black ${
                  positive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {entry.winRate.toFixed(1)}%
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#d6c9b4]/70">Sem dados suficientes.</p>
      )}
    </div>
  );
}

export default function HeroMatchups({
  heroName,
  matchups,
  accent,
}: {
  heroName: string;
  matchups: HeroMatchupsData;
  accent: string;
}) {
  const titleColor = `color-mix(in srgb, ${accent} 55%, #ffffff)`;

  return (
    <SlantFrame
      shape="narrowTop"
      border={`color-mix(in srgb, ${accent} 45%, #1b2621)`}
      background={`linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, #0e1512), #0e1512 75%)`}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3
            className="font-deadlock border-b border-white/10 pb-2 text-base font-black uppercase tracking-wider"
            style={{ color: titleColor }}
          >
            Jogando Junto (Sinergia)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MatchupGroup title="Melhores aliados" entries={matchups.bestWith} positive />
            <MatchupGroup title="Piores aliados" entries={matchups.worstWith} positive={false} />
          </div>
        </div>

        <div className="space-y-4">
          <h3
            className="font-deadlock border-b border-white/10 pb-2 text-base font-black uppercase tracking-wider"
            style={{ color: titleColor }}
          >
            Jogando Contra (Matchup)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MatchupGroup title={`${heroName} vence mais`} entries={matchups.bestAgainst} positive />
            <MatchupGroup title={`${heroName} perde mais`} entries={matchups.worstAgainst} positive={false} />
          </div>
        </div>
      </div>
    </SlantFrame>
  );
}