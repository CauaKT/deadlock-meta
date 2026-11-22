"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface HomeTrackerHero {
  id: number;
  name: string;
  image: string | null;
}

export interface HomeTrackerItem {
  className: string;
  name: string;
  image: string | null;
  slot: "weapon" | "vitality" | "spirit";
  cost: number;
}

export interface HomeMetaHero {
  id: number;
  name: string;
  image: string | null;
  matches: number;
  winRate: number;
  tier: string;
}

export interface HomePatchMover {
  id: number;
  name: string;
  image: string | null;
  winRateNow: number;
  winDelta: number;
}

interface RecentSearch {
  label: string;
  href: string;
  subtitle?: string;
  avatarUrl?: string | null;
  kind?: "profile" | "player" | "match" | "hero" | "item";
}

interface LeaderboardEntry {
  rank: number;
  accountId: number | null;
  accountName: string;
  avatarUrl?: string | null;
  badgeLevel: number | null;
  rankedRank?: number | null;
  rankedSubrank?: number | null;
  points?: number | null;
  matches?: number | null;
  winRate?: number | null;
  topHeroIds: number[];
}

const RANK_NAMES: Record<number, string> = {
  1: "Iniciado",
  2: "Aspirante",
  3: "Acólito",
  4: "Sentinela",
  5: "Místico",
  6: "Ritualista",
  7: "Emissário",
  8: "Oráculo",
  9: "Fantasma",
  10: "Ascendente",
  11: "Eterno",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

function formatRankInfo(entry: LeaderboardEntry): { label: string; iconUrl: string } {
  let tier = entry.rankedRank ?? null;
  let sub = entry.rankedSubrank ?? null;
  if ((tier === null || sub === null) && entry.badgeLevel !== null && entry.badgeLevel >= 11) {
    tier = Math.floor(entry.badgeLevel / 10);
    sub = entry.badgeLevel % 10;
  }
  if (!tier || tier < 1) {
    return {
      label: "Obscuro",
      iconUrl: "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_sm.webp",
    };
  }
  const validSub = sub && sub >= 1 && sub <= 6 ? sub : 1;
  const name = RANK_NAMES[tier] ?? `Tier ${tier}`;
  const roman = ROMAN[validSub] ?? String(validSub);
  return {
    label: `${name} ${roman}`,
    iconUrl: `https://api.deadlock-api.com/v1/assets/ranks/${tier}/${validSub}/image?format=webp`,
  };
}

interface LfgSummaryItem {
  id: string;
  region: string;
  rankTier: string;
  mode: string;
  note: string;
  author: { username: string; handle: string | null };
}

interface BuildSummaryItem {
  id: string;
  heroId: number;
  title: string;
  author: string;
}

interface TournamentSummaryItem {
  id: string;
  title: string;
  region: string;
  status: "ONGOING" | "UPCOMING" | "FINISHED";
  prizePool: string | null;
  startsAt?: string;
}

interface FeedSummaryItem {
  id: string;
  content: string;
  author: { username: string; handle: string | null };
}

const STORAGE_KEY = "lp_recent_tracker_searches";
const RECENT_TABS_KEY = "lp_recent_tabs";
const DEFAULT_RECENT_TABS = ["/tier-list", "/builds", "/calculator", "/compare", "/patches"];

const TAB_META: Record<string, { label: string; icon: ReactNode }> = {
  "/tier-list": {
    label: "Tier List",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  "/tier-maker": {
    label: "Tier Maker",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
    ),
  },
  "/heroes": {
    label: "Heróis",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 6v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V6l-8-4z" />
      </svg>
    ),
  },
  "/items": {
    label: "Itens",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </svg>
    ),
  },
  "/patches": {
    label: "Patch Tracker",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  "/builds": {
    label: "Editor de Builds",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  "/calculator": {
    label: "Calculadora",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
  "/leaderboard": {
    label: "Leaderboard",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  "/tournaments": {
    label: "Torneios",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      </svg>
    ),
  },
  "/compare": {
    label: "Comparador 1v1",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </svg>
    ),
  },
  "/feed": {
    label: "Feed",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  "/lfg": {
    label: "Procurar Duo",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

const REGIONS = [
  { id: "Global", label: "Global" },
  { id: "SAmerica", label: "América do Sul" },
  { id: "NAmerica", label: "América do Norte" },
  { id: "Europe", label: "Europa" },
  { id: "Asia", label: "Ásia" },
  { id: "Oceania", label: "Oceania" },
];

const SLOT_BADGE: Record<HomeTrackerItem["slot"], string> = {
  weapon: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  vitality: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  spirit: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

const TOURNAMENT_STATUS_STYLE: Record<
  TournamentSummaryItem["status"],
  { label: string; cls: string }
> = {
  ONGOING: {
    label: "AO VIVO",
    cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  },
  UPCOMING: {
    label: "EM BREVE",
    cls: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  },
  FINISHED: {
    label: "ENCERRADO",
    cls: "border-white/15 bg-white/5 text-neutral-400",
  },
};

function ArrowRightIcon({ className = "h-3 w-3 shrink-0" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function isSteamInput(raw: string): boolean {
  const clean = raw.replace(/^@+/, "").trim();
  return (
    /steamcommunity\.com\/(id|profiles)\//i.test(clean) ||
    /s\.team\/p\//i.test(clean) ||
    /^STEAM_[01]:[01]:\d+$/i.test(clean) ||
    /^\[U:1:\d+\]$/i.test(clean)
  );
}

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function HomeTracker({
  heroes,
  items,
  metaTop,
  risers,
  fallers,
  patchLabel,
  prevPatchLabel,
}: {
  heroes: HomeTrackerHero[];
  items: HomeTrackerItem[];
  metaTop: HomeMetaHero[];
  risers: HomePatchMover[];
  fallers: HomePatchMover[];
  patchLabel: string;
  prevPatchLabel: string;
}) {
  const router = useRouter();
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [recentTabs, setRecentTabs] = useState<string[]>(DEFAULT_RECENT_TABS);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const enrichedHrefsRef = useRef<Set<string>>(new Set());

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [disambiguate, setDisambiguate] = useState<{
    matchId?: string;
    handle?: string;
    steamId?: string;
    steamName?: string | null;
    hero?: HomeTrackerHero;
    item?: HomeTrackerItem;
  } | null>(null);

  const [region, setRegion] = useState("SAmerica");
  const [mmrLoading, setMmrLoading] = useState(true);
  const [topLeaders, setTopLeaders] = useState<LeaderboardEntry[]>([]);

  const [communityLoading, setCommunityLoading] = useState(true);
  const [lfgList, setLfgList] = useState<LfgSummaryItem[]>([]);
  const [buildsList, setBuildsList] = useState<BuildSummaryItem[]>([]);
  const [tournamentsList, setTournamentsList] = useState<TournamentSummaryItem[]>([]);
  const [feedList, setFeedList] = useState<FeedSummaryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentSearch[];
        if (Array.isArray(parsed)) {
          const sanitized = parsed
            .filter(
              (p) =>
                p &&
                typeof p.label === "string" &&
                typeof p.href === "string" &&
                !p.label.startsWith("@http") &&
                !p.href.startsWith("/profile/http"),
            )
            .slice(0, 5);
          setRecent(sanitized);
          if (sanitized.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          }
        }
      }
    } catch {}

    try {
      const rawTabs = localStorage.getItem(RECENT_TABS_KEY);
      if (rawTabs) {
        const parsedTabs = JSON.parse(rawTabs) as string[];
        if (Array.isArray(parsedTabs)) {
          const valid = parsedTabs.filter((t) => typeof t === "string" && TAB_META[t]);
          const merged = [
            ...valid,
            ...DEFAULT_RECENT_TABS.filter((d) => !valid.includes(d)),
          ].slice(0, 5);
          if (merged.length > 0) setRecentTabs(merged);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!searchFocused) return;
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchFocused]);

  useEffect(() => {
    if (!searchFocused || recent.length === 0) return;

    const pending = recent.filter(
      (r) => !enrichedHrefsRef.current.has(r.href) && (!r.avatarUrl || !r.kind),
    );
    if (pending.length === 0) return;

    let cancelled = false;

    Promise.all(
      pending.map(async (entry) => {
        enrichedHrefsRef.current.add(entry.href);

        if (entry.href.startsWith("/heroes/")) {
          const hid = Number(entry.href.replace("/heroes/", ""));
          const h = heroMap.get(hid);
          return h
            ? { ...entry, kind: "hero" as const, subtitle: "Herói", avatarUrl: h.image }
            : entry;
        }

        if (entry.href.startsWith("/items/")) {
          const cls = entry.href.replace("/items/", "");
          const it = items.find((i) => i.className === cls);
          return it
            ? { ...entry, kind: "item" as const, subtitle: "Item da Loja", avatarUrl: it.image }
            : entry;
        }

        if (entry.href.startsWith("/matches/")) {
          return {
            ...entry,
            kind: "match" as const,
            subtitle: `Partida #${entry.href.replace("/matches/", "")}`,
          };
        }

        if (entry.href.startsWith("/profile/")) {
          const handle = decodeURIComponent(entry.href.replace("/profile/", ""));
          const data = (await fetch(
            `/api/backend/profiles/by-handle/${encodeURIComponent(handle)}`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)) as {
            username?: string | null;
            handle?: string | null;
            avatarUrl?: string | null;
          } | null;

          if (data) {
            return {
              ...entry,
              kind: "profile" as const,
              label: data.username || `@${data.handle || handle}`,
              subtitle: `@${data.handle || handle}`,
              avatarUrl: data.avatarUrl ?? null,
            };
          }
          return { ...entry, kind: "profile" as const, subtitle: `@${handle}` };
        }

        if (entry.href.startsWith("/player/")) {
          const steamId = entry.href.replace("/player/", "");
          const data = (await fetch(
            `/api/backend/external-data/player/${encodeURIComponent(steamId)}/summary`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)) as {
            personaName?: string | null;
            avatarUrl?: string | null;
          } | null;

          if (data) {
            return {
              ...entry,
              kind: "player" as const,
              label: data.personaName || entry.label,
              subtitle: `Steam • #${steamId.slice(-6)}`,
              avatarUrl: data.avatarUrl ?? null,
            };
          }
          return { ...entry, kind: "player" as const, subtitle: `Steam • #${steamId.slice(-6)}` };
        }

        return entry;
      }),
    ).then((updated) => {
      if (cancelled) return;
      const byHref = new Map(updated.map((u) => [u.href, u]));
      setRecent((prev) => {
        const next = prev.map((item) => byHref.get(item.href) ?? item);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [searchFocused, recent, heroMap, items]);

  useEffect(() => {
    let cancelled = false;
    setMmrLoading(true);
    setTopLeaders([]);

    fetch(`/api/backend/external-data/leaderboard/${encodeURIComponent(region)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((lb: { entries?: LeaderboardEntry[] } | null) => {
        if (cancelled) return;
        const entries = Array.isArray(lb?.entries) ? [...lb.entries] : [];
        entries.sort((a, b) => {
          const diff = (b.points ?? -1) - (a.points ?? -1);
          return diff !== 0 ? diff : a.rank - b.rank;
        });
        setTopLeaders(entries.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMmrLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    let cancelled = false;
    setCommunityLoading(true);

    Promise.all([
      fetch("/api/backend/tournaments", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/builds", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/lfg", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/backend/feed?page=1&limit=3", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([tournaments, builds, lfg, feed]) => {
        if (cancelled) return;
        setTournamentsList(Array.isArray(tournaments) ? tournaments.slice(0, 3) : []);
        setBuildsList(Array.isArray(builds) ? builds.slice(0, 3) : []);
        setLfgList(Array.isArray(lfg) ? lfg.slice(0, 2) : []);
        setFeedList(Array.isArray(feed?.items) ? feed.items.slice(0, 2) : []);
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveRecent = (entry: RecentSearch) => {
    setRecent((prev) => {
      const next = [entry, ...prev.filter((p) => p.href !== entry.href)].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const catalogMatches = useMemo(() => {
    const raw = query.trim();
    if (raw.length < 2 || raw.startsWith("@") || isSteamInput(raw) || /^\d+$/.test(raw)) {
      return { heroes: [] as HomeTrackerHero[], items: [] as HomeTrackerItem[] };
    }
    const q = normalizeText(raw);
    return {
      heroes: heroes.filter((h) => normalizeText(h.name).includes(q)).slice(0, 4),
      items: items.filter((i) => normalizeText(i.name).includes(q)).slice(0, 4),
    };
  }, [query, heroes, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError(null);
    setDisambiguate(null);

    const raw = query.trim();
    if (!raw || resolving) return;

    // 1) Link ou identificador explícito da Steam
    if (isSteamInput(raw)) {
      setResolving(true);
      try {
        const res = await fetch(`/api/resolve-steam?q=${encodeURIComponent(raw)}`);
        const data = (await res.json().catch(() => null)) as {
          steamId?: string;
          personaName?: string | null;
          error?: string;
        } | null;
        if (!res.ok || !data?.steamId) {
          setResolveError(data?.error || "Não foi possível resolver este perfil Steam.");
          return;
        }
        const href = `/player/${data.steamId}`;
        saveRecent({
          label: data.personaName || `Steam #${data.steamId.slice(-6)}`,
          href,
        });
        router.push(href);
      } finally {
        setResolving(false);
      }
      return;
    }

    // 2) SteamID64 (17 dígitos começando com 7656119...)
    const cleanNumeric = raw.replace(/^@+/, "");
    if (/^7656119\d{10}$/.test(cleanNumeric)) {
      const href = `/player/${cleanNumeric}`;
      saveRecent({ label: `Jogador #${cleanNumeric.slice(-6)}`, href });
      router.push(href);
      return;
    }

    // 3) Número puro de 5 a 12 dígitos: pode ser Match ID ou Account ID
    if (/^\d{5,12}$/.test(cleanNumeric)) {
      setResolving(true);
      try {
        const [matchRes, playerRes] = await Promise.all([
          fetch(`/api/backend/external-data/match/${cleanNumeric}`, { cache: "no-store" })
            .then((r) => r.ok)
            .catch(() => false),
          fetch(`/api/backend/external-data/player/${cleanNumeric}/summary`, { cache: "no-store" })
            .then(async (r) => {
              if (!r.ok) return false;
              const d = (await r.json().catch(() => null)) as { matches?: number } | null;
              return Boolean(d && typeof d.matches === "number" && d.matches > 0);
            })
            .catch(() => false),
        ]);

        if (matchRes && !playerRes) {
          const href = `/matches/${cleanNumeric}`;
          saveRecent({ label: `Partida #${cleanNumeric}`, href });
          router.push(href);
          return;
        }
        if (playerRes && !matchRes) {
          const href = `/player/${cleanNumeric}`;
          saveRecent({ label: `Jogador #${cleanNumeric}`, href });
          router.push(href);
          return;
        }

        setDisambiguate({
          matchId: cleanNumeric,
          steamId: cleanNumeric,
          steamName: `Account #${cleanNumeric}`,
        });
      } finally {
        setResolving(false);
      }
      return;
    }

    // 4) @handle explícito do LockPro
    if (raw.startsWith("@")) {
      const cleanHandle = raw.replace(/^@+/, "").trim();
      if (!cleanHandle) return;
      const href = `/profile/${encodeURIComponent(cleanHandle)}`;
      saveRecent({ label: `@${cleanHandle}`, href });
      router.push(href);
      return;
    }

    // 5) Texto livre: checa herói exato, item exato, @handle LockPro e Steam vanity
    const normQ = normalizeText(raw);
    const exactHero = heroes.find((h) => normalizeText(h.name) === normQ);
    const exactItem = items.find((i) => normalizeText(i.name) === normQ);

    setResolving(true);
    try {
      const [lockproRes, steamRes] = await Promise.all([
        fetch(`/api/backend/profiles/by-handle/${encodeURIComponent(raw)}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/resolve-steam?mode=vanity&q=${encodeURIComponent(raw)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const hasLockpro = Boolean(lockproRes?.handle);
      const hasSteam = Boolean(steamRes?.steamId);
      const hitCount =
        (exactHero ? 1 : 0) +
        (exactItem ? 1 : 0) +
        (hasLockpro ? 1 : 0) +
        (hasSteam ? 1 : 0);

      if (hitCount > 1) {
        setDisambiguate({
          hero: exactHero,
          item: exactItem,
          handle: hasLockpro ? lockproRes.handle : undefined,
          steamId: hasSteam ? steamRes.steamId : undefined,
          steamName: hasSteam ? steamRes.personaName ?? raw : undefined,
        });
        return;
      }

      if (exactHero) {
        const href = `/heroes/${exactHero.id}`;
        saveRecent({ label: exactHero.name, href });
        router.push(href);
        return;
      }

      if (exactItem) {
        const href = `/items/${exactItem.className}`;
        saveRecent({ label: exactItem.name, href });
        router.push(href);
        return;
      }

      if (hasLockpro) {
        const href = `/profile/${encodeURIComponent(lockproRes.handle)}`;
        saveRecent({
          label: lockproRes.username || `@${lockproRes.handle}`,
          subtitle: `@${lockproRes.handle}`,
          avatarUrl: lockproRes.avatarUrl ?? null,
          kind: "profile",
          href,
        });
        router.push(href);
        return;
      }

      if (hasSteam) {
        const href = `/player/${steamRes.steamId}`;
        saveRecent({ label: steamRes.personaName || raw, href });
        router.push(href);
        return;
      }

      if (catalogMatches.heroes.length === 1 && catalogMatches.items.length === 0) {
        const h = catalogMatches.heroes[0];
        const href = `/heroes/${h.id}`;
        saveRecent({ label: h.name, href });
        router.push(href);
        return;
      }

      if (catalogMatches.items.length === 1 && catalogMatches.heroes.length === 0) {
        const it = catalogMatches.items[0];
        const href = `/items/${it.className}`;
        saveRecent({ label: it.name, href });
        router.push(href);
        return;
      }

      if (catalogMatches.heroes.length > 0 || catalogMatches.items.length > 0) {
        return;
      }

      setResolveError(
        `Nenhum jogador, partida, herói ou item encontrado para "${raw}".`,
      );
    } finally {
      setResolving(false);
    }
  };

  const regionLabel = REGIONS.find((r) => r.id === region)?.label ?? "Regional";

  return (
    <section className="space-y-8">
      {/* HERO + BUSCA UNIFICADA */}
      <div className="max-w-3xl mx-auto space-y-5 py-2">
        <div className="flex items-center justify-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />
              <img
                src="/logo.png"
                alt="LockPro"
                className="relative h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-[0_0_16px_rgba(245,158,11,0.3)]"
              />
            </div>
            <div>
              <span className="inline-block font-deadlock text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                Deadlock Stat Tracker
              </span>
              <h1 className="font-deadlock text-3xl sm:text-4xl font-black tracking-tight text-[#f4efe6] leading-none mt-0.5">
                LOCK<span className="text-amber-500">PRO</span>
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-neutral-300 max-w-xl mx-auto text-center">
            Estatísticas competitivas de Deadlock, histórico de partidas, comparador 1v1, builds da comunidade e análise do meta por patch e patente.
          </p>

          {/* Barra de Busca unificada */}
          <div ref={searchBoxRef} className="space-y-2">
            <form
              onSubmit={handleSubmit}
              className="dl-noise relative flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-1.5 shadow-2xl focus-within:border-amber-500/60 transition-colors"
            >
              <div className="flex flex-1 items-center gap-2.5 min-w-0 px-2.5">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onFocus={() => setSearchFocused(true)}
                  onClick={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDisambiguate(null);
                    setResolveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("");
                      setDisambiguate(null);
                      setResolveError(null);
                      setSearchFocused(false);
                    }
                  }}
                  placeholder="Buscar jogador (Steam / @handle), Match ID, herói ou item..."
                  className="w-full min-w-0 bg-transparent py-2 text-xs sm:text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={resolving}
                className="rounded-[4px] bg-amber-500 px-5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {resolving ? "Buscando..." : "Rastrear"}
              </button>
            </form>

            {searchFocused &&
              recent.length > 0 &&
              catalogMatches.heroes.length === 0 &&
              catalogMatches.items.length === 0 &&
              !disambiguate && (
                <div className="dl-noise relative rounded-[5px] border border-white/15 bg-[#0a0d0c]/98 shadow-2xl overflow-hidden text-left">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-2">
                    <span className="font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Pesquisas Recentes
                    </span>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-[10px] font-semibold text-neutral-500 hover:text-rose-400 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {recent.map((r) => {
                      const kind =
                        r.kind ??
                        (r.href.startsWith("/profile/")
                          ? "profile"
                          : r.href.startsWith("/player/")
                            ? "player"
                            : r.href.startsWith("/matches/")
                              ? "match"
                              : r.href.startsWith("/heroes/")
                                ? "hero"
                                : "item");
                      const badgeLabel =
                        kind === "profile"
                          ? "Perfil"
                          : kind === "player"
                            ? "Steam"
                            : kind === "match"
                              ? "Partida"
                              : kind === "hero"
                                ? "Herói"
                                : "Item";

                      return (
                        <Link
                          key={r.href}
                          href={r.href}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/[0.04] transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {r.avatarUrl ? (
                              <img
                                src={r.avatarUrl}
                                alt=""
                                className={`h-8 w-8 shrink-0 border border-white/15 object-cover ${
                                  kind === "profile" || kind === "player"
                                    ? "rounded-full"
                                    : "rounded-[4px]"
                                }`}
                              />
                            ) : (
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center border border-white/12 bg-black/60 font-deadlock text-xs font-black text-amber-400 ${
                                  kind === "profile" || kind === "player"
                                    ? "rounded-full"
                                    : "rounded-[4px]"
                                }`}
                              >
                                {kind === "match" ? "#" : r.label.replace(/^@/, "").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[#f4efe6] group-hover:text-amber-400 transition-colors">
                                {r.label}
                              </p>
                              <p className="truncate font-mono text-[10px] text-neutral-500">
                                {r.subtitle || r.href}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded-[3px] border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider text-neutral-400 group-hover:border-amber-500/40 group-hover:text-amber-300">
                              {badgeLabel}
                            </span>
                            <ArrowRightIcon className="h-3 w-3 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

            {(catalogMatches.heroes.length > 0 || catalogMatches.items.length > 0) && !disambiguate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-[5px] border border-white/10 bg-[#0a0d0c]/95 p-2">
                {catalogMatches.heroes.map((h) => (
                  <Link
                    key={`cat-h-${h.id}`}
                    href={`/heroes/${h.id}`}
                    onClick={() => saveRecent({ label: h.name, href: `/heroes/${h.id}` })}
                    className="flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-500/50 transition-colors"
                  >
                    {h.image && <img src={h.image} alt="" className="h-7 w-7 rounded-[3px] object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-amber-400">Herói</p>
                    </div>
                  </Link>
                ))}
                {catalogMatches.items.map((it) => (
                  <Link
                    key={`cat-i-${it.className}`}
                    href={`/items/${it.className}`}
                    onClick={() => saveRecent({ label: it.name, href: `/items/${it.className}` })}
                    className="flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/45 p-2 hover:border-amber-500/50 transition-colors"
                  >
                    {it.image && <img src={it.image} alt="" className="h-7 w-7 rounded-[3px] object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#f4efe6]">{it.name}</p>
                      <span className={`inline-block rounded border px-1 text-[9px] font-bold ${SLOT_BADGE[it.slot]}`}>
                        {it.cost}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {disambiguate && (
              <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-amber-500/35 bg-black/60 px-3 py-2 text-xs">
                <span className="text-neutral-300">Escolha o que deseja abrir:</span>
                {disambiguate.matchId && (
                  <Link
                    href={`/matches/${disambiguate.matchId}`}
                    onClick={() =>
                      saveRecent({
                        label: `Partida #${disambiguate.matchId}`,
                        href: `/matches/${disambiguate.matchId}`,
                      })
                    }
                    className="rounded-[4px] border border-emerald-500/45 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    Partida #{disambiguate.matchId}
                  </Link>
                )}
                {disambiguate.hero && (
                  <Link
                    href={`/heroes/${disambiguate.hero.id}`}
                    onClick={() =>
                      saveRecent({
                        label: disambiguate.hero!.name,
                        href: `/heroes/${disambiguate.hero!.id}`,
                      })
                    }
                    className="rounded-[4px] border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    Herói: {disambiguate.hero.name}
                  </Link>
                )}
                {disambiguate.item && (
                  <Link
                    href={`/items/${disambiguate.item.className}`}
                    onClick={() =>
                      saveRecent({
                        label: disambiguate.item!.name,
                        href: `/items/${disambiguate.item!.className}`,
                      })
                    }
                    className="rounded-[4px] border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    Item: {disambiguate.item.name}
                  </Link>
                )}
                {disambiguate.handle && (
                  <Link
                    href={`/profile/${encodeURIComponent(disambiguate.handle)}`}
                    onClick={() =>
                      saveRecent({
                        label: `@${disambiguate.handle}`,
                        href: `/profile/${encodeURIComponent(disambiguate.handle!)}`,
                      })
                    }
                    className="rounded-[4px] border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    Perfil LockPro (@{disambiguate.handle})
                  </Link>
                )}
                {disambiguate.steamId && (
                  <Link
                    href={`/player/${disambiguate.steamId}`}
                    onClick={() =>
                      saveRecent({
                        label: disambiguate.steamName || `Jogador #${disambiguate.steamId}`,
                        href: `/player/${disambiguate.steamId}`,
                      })
                    }
                    className="rounded-[4px] border border-white/20 bg-white/5 px-2.5 py-1 font-bold text-[#f4efe6] hover:border-amber-400"
                  >
                    Perfil Steam ({disambiguate.steamName})
                  </Link>
                )}
              </div>
            )}

            {resolveError && (
              <p className="text-xs font-semibold text-rose-400">{resolveError}</p>
            )}
          </div>

          {/* Últimas abas acessadas com ícones */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {recentTabs.map((href, idx) => {
              const meta = TAB_META[href];
              if (!meta) return null;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors ${
                    idx === 0
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "border-white/12 bg-[#0a0d0c]/90 text-[#f4efe6] hover:border-amber-500/50 hover:text-amber-400"
                  }`}
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* LINHA 2: LEADERBOARD REGIONAL (ESQUERDA) + TORNEIOS & BUILDS (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                Leaderboard Regional
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 truncate">
                .{regionLabel}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label="Região do Leaderboard"
                className="rounded-[4px] border border-white/12 bg-[#0a0d0c] px-2 py-1 font-deadlock text-[10px] font-black uppercase text-[#f4efe6] focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Link
                href="/leaderboard"
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
              >
                <span>Ranking completo</span>
                <ArrowRightIcon />
              </Link>
            </div>
          </div>

          <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 overflow-hidden">
            {mmrLoading ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-9 rounded-[4px] border border-white/5 bg-black/40 animate-pulse" />
                ))}
              </div>
            ) : topLeaders.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-500">
                Nenhum dado de leaderboard disponível para {regionLabel}.
              </p>
            ) : (
              <>
                <div className="divide-y divide-white/[0.07]">
                  {topLeaders.map((entry, idx) => {
                    const rk = formatRankInfo(entry);
                    const pos = idx + 1;
                    return (
                      <div
                        key={`${entry.rank}-${entry.accountName}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.025] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 font-mono text-xs font-black shrink-0 ${
                              pos <= 3 ? "text-amber-400" : "text-neutral-500"
                            }`}
                          >
                            #{pos}
                          </span>
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt=""
                              className="h-7 w-7 rounded-full border border-white/15 object-cover shrink-0"
                            />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/60 font-deadlock text-[10px] font-black text-amber-400">
                              {entry.accountName.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            {entry.accountId ? (
                              <Link
                                href={`/player/${entry.accountId}`}
                                className="block truncate font-bold text-[#f4efe6] hover:text-amber-400 transition-colors"
                              >
                                {entry.accountName}
                              </Link>
                            ) : (
                              <span className="block truncate font-bold text-[#f4efe6]">
                                {entry.accountName}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
                              <img src={rk.iconUrl} alt="" className="h-3.5 w-3.5 object-contain shrink-0" />
                              <span>{rk.label}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:block text-right font-mono leading-tight">
                            {typeof entry.points === "number" ? (
                              <p className="text-[11px] font-black text-[#f4efe6]">
                                {entry.points.toLocaleString("pt-BR")} pts
                              </p>
                            ) : typeof entry.winRate === "number" ? (
                              <p className={`text-[11px] font-black ${entry.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                                {entry.winRate.toFixed(1)}%
                              </p>
                            ) : null}
                            {typeof entry.matches === "number" && (
                              <p className="text-[9px] text-neutral-500">
                                {entry.matches.toLocaleString("pt-BR")}j
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {entry.topHeroIds.slice(0, 3).map((hid) => {
                              const h = heroMap.get(hid);
                              if (!h?.image) return null;
                              return (
                                <Link key={hid} href={`/heroes/${hid}`} title={h.name}>
                                  <img
                                    src={h.image}
                                    alt={h.name}
                                    className="h-7 w-7 rounded-[3px] border border-white/12 object-cover hover:border-amber-400 transition-colors"
                                  />
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href="/leaderboard"
                  className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-black/30 py-2.5 font-deadlock text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <span>Abrir Leaderboard Completo</span>
                  <ArrowRightIcon />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* TORNEIOS & BUILDS EMPILHADOS */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                Torneios
              </h2>
              <Link
                href="/tournaments"
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
              >
                <span>Ver todos</span>
                <ArrowRightIcon />
              </Link>
            </div>

            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-3 space-y-2">
              {communityLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((n) => (
                    <div key={n} className="h-12 rounded-[4px] border border-white/5 bg-black/40 animate-pulse" />
                  ))}
                </div>
              ) : tournamentsList.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Nenhum torneio cadastrado no momento.
                </p>
              ) : (
                tournamentsList.map((t) => {
                  const st = TOURNAMENT_STATUS_STYLE[t.status];
                  return (
                    <Link
                      key={t.id}
                      href="/tournaments"
                      className="flex items-center justify-between gap-3 rounded-[4px] border border-white/10 bg-black/40 p-2.5 hover:border-amber-500/45 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#f4efe6]">{t.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {t.region}
                          {t.prizePool ? ` • ${t.prizePool}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-[3px] border px-2 py-0.5 font-deadlock text-[9px] font-black uppercase ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <h2 className="font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                Builds
              </h2>
              <Link
                href="/builds"
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
              >
                <span>Editor de Builds</span>
                <ArrowRightIcon />
              </Link>
            </div>

            <div className="dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-3 space-y-2">
              {communityLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((n) => (
                    <div key={n} className="h-12 rounded-[4px] border border-white/5 bg-black/40 animate-pulse" />
                  ))}
                </div>
              ) : buildsList.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Nenhuma build publicada ainda.
                </p>
              ) : (
                buildsList.map((b) => {
                  const hero = heroMap.get(b.heroId);
                  return (
                    <Link
                      key={b.id}
                      href={`/builds/${b.id}`}
                      className="flex items-center gap-2.5 rounded-[4px] border border-white/10 bg-black/40 p-2.5 hover:border-amber-500/45 transition-colors"
                    >
                      {hero?.image && (
                        <img
                          src={hero.image}
                          alt=""
                          className="h-8 w-8 rounded-[3px] border border-white/10 object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#f4efe6]">{b.title}</p>
                        <p className="truncate text-[10px] text-neutral-400">
                          {hero?.name ?? `Herói #${b.heroId}`} • por {b.author}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 3: META, PATCH TRACKER & COMUNIDADE (ALINHADOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 dl-noise dl-halftone relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] truncate">
              Meta ({patchLabel})
            </h3>
            <Link
              href="/tier-list"
              className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
            >
              <span>Tier List</span>
              <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2 flex-1">
            {metaTop.slice(0, 5).map((h) => (
              <Link
                key={h.id}
                href={`/heroes/${h.id}`}
                className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-black/40 p-2 hover:border-amber-500/45 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {h.image && (
                    <img src={h.image} alt="" className="h-7 w-7 rounded-[3px] object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#f4efe6]">{h.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      {h.matches.toLocaleString("pt-BR")} jogos
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs font-black text-emerald-400">
                    {h.winRate.toFixed(1)}%
                  </p>
                  <span className="font-deadlock text-[9px] font-black uppercase text-amber-400">
                    {h.tier}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] truncate">
              Impacto vs {prevPatchLabel}
            </h3>
            <Link
              href="/patches"
              className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
            >
              <span>Patch Tracker</span>
              <ArrowRightIcon />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            <div className="space-y-1.5">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Em Alta
              </p>
              {risers.map((m) => (
                <Link
                  key={`rise-${m.id}`}
                  href={`/heroes/${m.id}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-emerald-500/20 bg-emerald-950/15 px-2.5 py-1.5 hover:border-emerald-400/55"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {m.image && <img src={m.image} alt="" className="h-5 w-5 rounded-[3px] object-cover" />}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{m.name}</span>
                  </span>
                  <span className="font-mono text-[11px] font-black text-emerald-400 shrink-0">
                    +{m.winDelta.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-rose-400">
                Em Queda
              </p>
              {fallers.map((m) => (
                <Link
                  key={`fall-${m.id}`}
                  href={`/heroes/${m.id}`}
                  className="flex items-center justify-between gap-2 rounded-[4px] border border-rose-500/20 bg-rose-950/15 px-2.5 py-1.5 hover:border-rose-400/55"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {m.image && <img src={m.image} alt="" className="h-5 w-5 rounded-[3px] object-cover" />}
                    <span className="truncate text-xs font-bold text-[#f4efe6]">{m.name}</span>
                  </span>
                  <span className="font-mono text-[11px] font-black text-rose-400 shrink-0">
                    {m.winDelta.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 dl-noise relative rounded-[5px] border border-white/12 bg-[#0a0d0c]/92 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <h3 className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6]">
              Comunidade & Procurar Duo
            </h3>
            <div className="flex items-center gap-2 font-deadlock text-[10px] font-black uppercase tracking-wider shrink-0">
              <Link href="/lfg" className="text-amber-400 hover:text-amber-300">
                LFG
              </Link>
              <span className="text-neutral-700">•</span>
              <Link href="/feed" className="text-amber-400 hover:text-amber-300">
                Feed
              </Link>
            </div>
          </div>

          {communityLoading ? (
            <div className="space-y-2 flex-1">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-12 rounded-[4px] border border-white/5 bg-black/40 animate-pulse" />
              ))}
            </div>
          ) : lfgList.length === 0 && feedList.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center flex-1">
              Nenhuma publicação recente na comunidade.
            </p>
          ) : (
            <div className="space-y-2 flex-1">
              {lfgList.map((post) => (
                <Link
                  key={post.id}
                  href="/lfg"
                  className="block rounded-[4px] border border-white/10 bg-black/40 p-2.5 hover:border-amber-500/45 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                    <span>Procurar Duo • {post.region} • {post.rankTier}</span>
                    <span>{post.mode}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-[#f4efe6]">{post.note}</p>
                  <p className="text-[10px] text-neutral-400">por {post.author.username}</p>
                </Link>
              ))}
              {feedList.map((post) => (
                <Link
                  key={post.id}
                  href="/feed"
                  className="block rounded-[4px] border border-white/10 bg-black/40 p-2.5 hover:border-amber-500/45 transition-colors"
                >
                  <p className="truncate text-xs text-[#f4efe6]">{post.content}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Feed • {post.author.username}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}