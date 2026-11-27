"use client";
/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import DeadlockLoadingLogo from "@/components/ui/DeadlockLoadingLogo";
import { getPatchNoteTranslation } from "@/lib/backend/client";
import type { PatchNoteTranslationResponse } from "@/lib/backend/types";
import { SLOT_META } from "@/lib/data/config";
import type {
  PatchHeroAbilityRef,
  PatchNoteBlock,
  PatchNoteInline,
  SteamPatchNote,
} from "@/lib/deadlock";

export interface PatchHeroRef {
  id: number;
  name: string;
  image: string | null;
  portrait: string | null;
  bg: string | null;
  rgb: [number, number, number] | null;
  abilities: PatchHeroAbilityRef[];
}

export interface PatchItemRef {
  className: string;
  name: string;
  nameEn: string;
  image: string | null;
  slot: "weapon" | "vitality" | "spirit";
  cost: number;
  tier: number;
}

export type WikiHeroChangeKind = "buff" | "nerf" | "adj" | "fix" | "new";

export interface WikiPatchClassificationView {
  dateIso: string;
  undocumented: boolean;
  buffs: string[];
  nerfs: string[];
  adjs: string[];
  fixes: string[];
  newHeroes: string[];
}

type PatchBandKind = "nerf" | "adj" | "buff" | "new";

interface ImpactCounters {
  buffs: number;
  nerfs: number;
  adjs: number;
  fixes: number;
}

interface HighlightHeroEntry {
  key: string;
  name: string;
  hero: PatchHeroRef | null;
  inPatchBody: boolean;
  wikiKinds: WikiHeroChangeKind[];
  counters: ImpactCounters;
  previews: string[];
}

interface HighlightItemEntry {
  item: PatchItemRef;
  counters: ImpactCounters;
  previews: string[];
}

interface PatchImpactBand {
  kind: PatchBandKind;
  title: string;
  headerClass: string;
  borderClass: string;
  ringClass: string;
  heroes: HighlightHeroEntry[];
  itemsBySlot: Record<"weapon" | "vitality" | "spirit", HighlightItemEntry[]>;
  itemsCount: number;
}

const BAND_META: Record<
  PatchBandKind,
  {
    title: string;
    headerClass: string;
    borderClass: string;
    ringClass: string;
  }
> = {
  nerf: {
    title: "Nerfs",
    headerClass: "border-rose-500/30 bg-rose-500/12 text-rose-400",
    borderClass: "border-rose-500/30",
    ringClass: "border-rose-500/70",
  },
  adj: {
    title: "Ajustes",
    headerClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    borderClass: "border-amber-500/30",
    ringClass: "border-amber-500/70",
  },
  buff: {
    title: "Buffs",
    headerClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    borderClass: "border-emerald-500/30",
    ringClass: "border-emerald-500/70",
  },
  new: {
    title: "Novos Heróis",
    headerClass: "border-amber-400/35 bg-amber-400/12 text-amber-300",
    borderClass: "border-amber-400/35",
    ringClass: "border-amber-400/80",
  },
};

function classifyItemBand(counters: ImpactCounters): PatchBandKind {
  if (counters.buffs > 0 && counters.nerfs === 0) return "buff";
  if (counters.nerfs > 0 && counters.buffs === 0) return "nerf";
  return "adj";
}

const WIKI_BADGE_META: Record<
  WikiHeroChangeKind,
  {
    label: string;
    groupTitle: string;
    titleClass: string;
    ringClass: string;
    badgeClass: string;
  }
> = {
  nerf: {
    label: "Nerf",
    groupTitle: "Nerfs",
    titleClass: "text-rose-400",
    ringClass: "border-rose-500/70",
    badgeClass: "border-rose-500/45 bg-rose-500/12 text-rose-300",
  },
  buff: {
    label: "Buff",
    groupTitle: "Buffs",
    titleClass: "text-emerald-400",
    ringClass: "border-emerald-500/70",
    badgeClass: "border-emerald-500/45 bg-emerald-500/12 text-emerald-300",
  },
  adj: {
    label: "Ajuste",
    groupTitle: "Ajustes",
    titleClass: "text-amber-400",
    ringClass: "border-amber-500/70",
    badgeClass: "border-amber-500/45 bg-amber-500/12 text-amber-300",
  },
  fix: {
    label: "Correção",
    groupTitle: "Correções",
    titleClass: "text-sky-400",
    ringClass: "border-sky-500/65",
    badgeClass: "border-sky-500/45 bg-sky-500/12 text-sky-300",
  },
  new: {
    label: "Novo Herói",
    groupTitle: "Novo Herói",
    titleClass: "text-amber-300",
    ringClass: "border-amber-400/80",
    badgeClass: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  },
};

function WikiChangeIcon({
  kind,
  className = "h-3.5 w-3.5 shrink-0",
}: {
  kind: WikiHeroChangeKind | "items" | "other";
  className?: string;
}) {
  if (kind === "nerf") {
    return (
      <svg aria-hidden viewBox="0 0 12 12" className={className} fill="currentColor">
        <path d="M6 10 1 2h10L6 10Z" />
      </svg>
    );
  }
  if (kind === "buff") {
    return (
      <svg aria-hidden viewBox="0 0 12 12" className={className} fill="currentColor">
        <path d="M6 2 11 10H1L6 2Z" />
      </svg>
    );
  }
  if (kind === "adj") {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 5.5h9.5l-2.2-2.2" />
        <path d="M13.5 10.5H4l2.2 2.2" />
      </svg>
    );
  }
  if (kind === "fix") {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.4 2.4a3.8 3.8 0 0 0-4.9 4.9L2.2 10.6a1.4 1.4 0 0 0 2 2l3.3-3.3a3.8 3.8 0 0 0 4.9-4.9l-2.1 2.1-1.8-.4-.4-1.8 2.3-1.9Z" />
      </svg>
    );
  }
  if (kind === "new") {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className={className} fill="currentColor">
        <path d="M8 1.2 9.8 6.2 14.8 8 9.8 9.8 8 14.8 6.2 9.8 1.2 8 6.2 6.2 8 1.2Z" />
      </svg>
    );
  }
  if (kind === "items") {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2.2" />
        <path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="currentColor">
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

interface Props {
  notes: SteamPatchNote[];
  heroLinks: Record<string, PatchHeroRef>;
  itemLinks: Record<string, PatchItemRef>;
  wikiByGid: Record<string, WikiPatchClassificationView>;
  initialPatchId?: string;
  initialTranslations?: Record<string, PatchNoteTranslationResponse>;
}

type CategoryFilter = "all" | "balance" | "feature";
type LanguageMode = "pt" | "en";

type BulletBlock = Extract<PatchNoteBlock, { type: "bullet" }>;

interface HeroBulletEntry {
  block: BulletBlock;
  originalPlain: string;
  skipChars: number;
}

interface HeroAbilitySubGroup {
  ability: PatchHeroAbilityRef | null;
  entries: HeroBulletEntry[];
}

interface ItemBulletEntry {
  block: BulletBlock;
  originalPlain: string;
  skipChars: number;
  nested: boolean;
}

interface GeneralBulletEntry {
  block: BulletBlock;
  originalPlain: string;
  nested: boolean;
  topicPrefix: string | null;
}

type EditorialNode =
  | { kind: "quote"; blocks: PatchNoteBlock[] }
  | { kind: "section"; id: string; title: string }
  | { kind: "heading"; text: string }
  | { kind: "divider" }
  | { kind: "image"; src: string; alt: string; href?: string }
  | { kind: "paragraph"; block: Extract<PatchNoteBlock, { type: "paragraph" }> }
  | {
      kind: "hero-card";
      hero: PatchHeroRef;
      baseEntries: HeroBulletEntry[];
      abilityGroups: HeroAbilitySubGroup[];
      totalCount: number;
    }
  | {
      kind: "item-card";
      item: PatchItemRef;
      entries: ItemBulletEntry[];
    }
  | {
      kind: "topic-card";
      topic: string;
      entries: GeneralBulletEntry[];
    }
  | {
      kind: "bullet-panel";
      entries: GeneralBulletEntry[];
    };

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getRunsPlainText(runs: PatchNoteInline[]): string {
  return runs.map((r) => r.text).join("");
}

function normalizeAbilityKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) dp[j] = prev;
      else dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function matchHeroAbility(
  abilities: PatchHeroAbilityRef[],
  candidate: string,
): PatchHeroAbilityRef | null {
  const norm = normalizeAbilityKey(candidate);
  if (norm.length < 3) return null;

  for (const ab of abilities) {
    if (normalizeAbilityKey(ab.nameEn) === norm || normalizeAbilityKey(ab.namePt) === norm) {
      return ab;
    }
  }
  if (norm.length >= 6) {
    for (const ab of abilities) {
      const abNorm = normalizeAbilityKey(ab.nameEn);
      if (abNorm.length >= 6 && editDistance(norm, abNorm) <= 2) {
        return ab;
      }
    }
  }
  return null;
}

function stripLeadingPrefix(text: string, maxColon = 40): string {
  const colonIdx = text.indexOf(":");
  if (colonIdx > 0 && colonIdx <= maxColon) {
    return text.slice(colonIdx + 1).trim();
  }
  return text;
}

function stripAbilityDashPrefix(text: string): string {
  const dashIdx = text.indexOf(" - ");
  if (dashIdx > 0 && dashIdx <= 48) {
    return text.slice(dashIdx + 3).trim();
  }
  return text;
}

function renderHighlightedText(text: string, query: string): ReactNode {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIdx = lowerText.indexOf(lowerQuery, cursor);

  while (matchIdx !== -1) {
    if (matchIdx > cursor) {
      parts.push(text.slice(cursor, matchIdx));
    }
    parts.push(
      <mark
        key={`${matchIdx}-${cursor}`}
        className="rounded-[2px] bg-amber-400/25 px-0.5 text-amber-200"
      >
        {text.slice(matchIdx, matchIdx + query.length)}
      </mark>,
    );
    cursor = matchIdx + query.length;
    matchIdx = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length > 0 ? parts : text;
}

function ArrowRightSvg({ className = "mx-1.5 inline h-3 w-3 text-amber-400" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M1 8a.75.75 0 0 1 .75-.75h9.793L8.27 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.273-3.22H1.75A.75.75 0 0 1 1 8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function renderStatTransitions(text: string, highlight: string): ReactNode {
  // Destaca transições explícitas (ex: 57.8%->54.7%, from 28s to 29s, de 28s para 29s)
  const regex =
    /(\d[\d.,/%]*[a-zA-Z%]*)\s*(?:->|⇒)\s*(\d[\d.,/%]*[a-zA-Z%]*)|(\b(?:from|de)\s+)([+\-~0-9"][^.,;()]{0,34}?)\s+(?:to|para)\s+((?:~?[+\-]?\d[\d.,/+%\w\s-]{0,28}?|["“][^"”]{2,45}["”]))(?=$|[.,;)\s])/gi;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    const start = match.index;
    const end = regex.lastIndex;

    if (match[1] !== undefined && match[2] !== undefined) {
      if (start > lastIndex) {
        nodes.push(
          <Fragment key={`t-${lastIndex}`}>
            {renderHighlightedText(text.slice(lastIndex, start), highlight)}
          </Fragment>,
        );
      }
      nodes.push(
        <span key={`d-${start}`} className="inline-flex flex-wrap items-baseline">
          <span className="text-neutral-400">
            {renderHighlightedText(match[1], highlight)}
          </span>
          <ArrowRightSvg />
          <strong className="font-bold text-[#f4efe6]">
            {renderHighlightedText(match[2], highlight)}
          </strong>
        </span>,
      );
      lastIndex = end;
      match = regex.exec(text);
      continue;
    }

    const prep = match[3] ?? "";
    const oldVal = (match[4] ?? "").trim();
    const newVal = (match[5] ?? "").trim();
    const validOld =
      oldVal.length > 0 &&
      (/\d/.test(oldVal) || /^["“]/.test(oldVal)) &&
      !/\bup$/i.test(oldVal);

    if (!validOld || !newVal) {
      match = regex.exec(text);
      continue;
    }

    if (start > lastIndex) {
      nodes.push(
        <Fragment key={`t-${lastIndex}`}>
          {renderHighlightedText(text.slice(lastIndex, start), highlight)}
        </Fragment>,
      );
    }

    nodes.push(
      <Fragment key={`f-${start}`}>
        {renderHighlightedText(prep, highlight)}
        <span className="text-neutral-400">
          {renderHighlightedText(oldVal, highlight)}
        </span>
        <ArrowRightSvg />
        <strong className="font-bold text-[#f4efe6]">
          {renderHighlightedText(newVal, highlight)}
        </strong>
      </Fragment>,
    );

    lastIndex = end;
    match = regex.exec(text);
  }

  if (lastIndex === 0) return renderHighlightedText(text, highlight);
  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`t-${lastIndex}`}>
        {renderHighlightedText(text.slice(lastIndex), highlight)}
      </Fragment>,
    );
  }
  return nodes;
}

const TIER_PILL_CLASSES: Record<string, string> = {
  T1: "border-amber-500/45 bg-amber-500/15 text-amber-300",
  T2: "border-emerald-500/45 bg-emerald-500/15 text-emerald-300",
  T3: "border-sky-500/45 bg-sky-500/15 text-sky-300",
};

function renderFormattedLine(text: string, highlight: string): ReactNode {
  const tierMatch = text.match(/^(T[123])(?:\b|:|\s*-)\s*(.+)$/);
  if (tierMatch) {
    const tag = tierMatch[1];
    const body = tierMatch[2];
    return (
      <>
        <span
          className={`mr-1.5 inline-flex items-center rounded-[3px] border px-1.5 py-0.5 align-baseline font-deadlock text-[10px] font-black tracking-wider ${
            TIER_PILL_CLASSES[tag] ?? TIER_PILL_CLASSES.T1
          }`}
        >
          {tag}
        </span>
        {renderStatTransitions(body, highlight)}
      </>
    );
  }
  return renderStatTransitions(text, highlight);
}

function renderRuns(
  runs: PatchNoteInline[],
  highlight: string,
  skipChars = 0,
): ReactNode {
  let remainingSkip = skipChars;
  let checkedTier = false;

  return runs.map((run, idx) => {
    let text = run.text;
    if (remainingSkip > 0) {
      if (text.length <= remainingSkip) {
        remainingSkip -= text.length;
        return null;
      }
      text = text.slice(remainingSkip);
      remainingSkip = 0;
    }

    if (run.type === "link") {
      return (
        <a
          key={idx}
          href={run.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-amber-400 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-300 ${
            run.bold ? "font-bold" : ""
          } ${run.italic ? "italic" : ""}`}
        >
          {renderHighlightedText(text, highlight)}
        </a>
      );
    }

    let content: ReactNode;
    if (!checkedTier && text.trim().length > 0) {
      checkedTier = true;
      const trimmedLeading = text.trimStart();
      content = renderFormattedLine(trimmedLeading, highlight);
    } else {
      content = renderStatTransitions(text, highlight);
    }

    if (run.bold) content = <strong className="font-bold text-[#f4efe6]">{content}</strong>;
    if (run.italic) content = <em className="italic text-neutral-200">{content}</em>;
    if (run.underline) content = <span className="underline underline-offset-2">{content}</span>;
    return <Fragment key={idx}>{content}</Fragment>;
  });
}

export default function PatchNotesClient({
  wikiByGid,
  notes,
  heroLinks,
  itemLinks,
  initialPatchId,
  initialTranslations,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialPatchId && notes.some((n) => n.id === initialPatchId)) {
      return initialPatchId;
    }
    return notes[0]?.id ?? "";
  });
  const [listSearch, setListSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<LanguageMode>("pt");
  const [hoveredTip, setHoveredTip] = useState<string | null>(null);
  const [translationsByGid, setTranslationsByGid] = useState<
    Record<string, PatchNoteTranslationResponse>
  >(() => initialTranslations ?? {});
  const [failedGids, setFailedGids] = useState<Record<string, boolean>>({});
  const [delayedLoadingGid, setDelayedLoadingGid] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return notes.filter((n) => {
      if (category !== "all" && n.category !== category) return false;
      if (!q) return true;
      const tr = translationsByGid[n.id];
      const ptMatch =
        tr &&
        (tr.titlePt.toLowerCase().includes(q) ||
          Object.values(tr.translations).some((v) => v.toLowerCase().includes(q)));
      return (
        n.title.toLowerCase().includes(q) ||
        n.plainText.toLowerCase().includes(q) ||
        Boolean(ptMatch)
      );
    });
  }, [notes, listSearch, category, translationsByGid]);

  const activeNote =
    notes.find((n) => n.id === selectedId) ?? filteredNotes[0] ?? notes[0] ?? null;
  const activeGid = activeNote?.id ?? "";
  const activeCached = activeGid ? translationsByGid[activeGid] : undefined;
  const activeFailed = activeGid ? Boolean(failedGids[activeGid]) : false;

  useEffect(() => {
    if (!activeGid || activeCached || activeFailed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setDelayedLoadingGid(activeGid);
    }, 400);

    void getPatchNoteTranslation(activeGid).then((res) => {
      if (cancelled) return;
      clearTimeout(timer);
      setDelayedLoadingGid((cur) => (cur === activeGid ? null : cur));
      if (!res || !res.available) {
        setFailedGids((prev) => ({ ...prev, [activeGid]: true }));
        return;
      }
      setTranslationsByGid((prev) => ({ ...prev, [activeGid]: res }));
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeGid, activeCached, activeFailed]);

  const isTranslating = Boolean(activeGid && !activeCached && !activeFailed);
  const isDelayedTranslating = isTranslating && delayedLoadingGid === activeGid;
  const isWaitingPt = lang === "pt" && isDelayedTranslating;
  const activeTranslation = lang === "pt" && activeCached?.available ? activeCached : null;

  const translateText = (original: string): string | null => {
    if (!activeTranslation) return null;
    const key = original.trim();
    if (activeTranslation.translations[key]) {
      return activeTranslation.translations[key];
    }
    if (activeTranslation.translations[`-- ${key}`]) {
      return activeTranslation.translations[`-- ${key}`].replace(/^--\s+/, "").trim();
    }
    if (activeTranslation.translations[`${key}:`]) {
      return activeTranslation.translations[`${key}:`].replace(/:$/, "").trim();
    }
    return null;
  };

  const sections = useMemo(() => {
    if (!activeNote) return [];
    return activeNote.blocks.filter(
      (b): b is Extract<PatchNoteBlock, { type: "section" }> => b.type === "section",
    );
  }, [activeNote]);

  const visibleBlocks = useMemo(() => {
    if (!activeNote) return [];
    const q = noteSearch.trim().toLowerCase();
    if (!q) return activeNote.blocks;

    // Mantém cabeçalhos de seção apenas quando há ao menos um bloco correspondente abaixo
    const result: PatchNoteBlock[] = [];
    let pendingSection: PatchNoteBlock | null = null;

    for (const block of activeNote.blocks) {
      if (block.type === "section") {
        pendingSection = block;
        continue;
      }
      if (block.type === "divider" || block.type === "image") continue;

      const originalText =
        block.type === "heading" ? block.text : getRunsPlainText(block.runs);
      const trimmed = originalText.trim();
      const ptText =
        (activeTranslation?.translations[trimmed] ??
          activeTranslation?.translations[`-- ${trimmed}`] ??
          "") ||
        "";

      let localizedEntityName = "";
      if (block.type === "bullet") {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 1 && colonIdx <= 32) {
          const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
          const item = itemLinks[key];
          if (item) localizedEntityName = `${item.name} ${item.nameEn}`;
        }
      }

      if (
        originalText.toLowerCase().includes(q) ||
        ptText.toLowerCase().includes(q) ||
        localizedEntityName.toLowerCase().includes(q)
      ) {
        if (pendingSection) {
          result.push(pendingSection);
          pendingSection = null;
        }
        result.push(block);
      }
    }
    return result;
  }, [activeNote, noteSearch, activeTranslation, itemLinks]);

  const patchHighlights = useMemo(() => {
    const empty = {
      heroesCount: 0,
      itemsCount: 0,
      bands: [] as PatchImpactBand[],
      heroWikiKinds: new Map<number, WikiHeroChangeKind[]>(),
      itemBandByClass: new Map<string, { band: PatchBandKind; counters: ImpactCounters }>(),
      hasClassification: false,
    };
    if (!activeNote) return empty;

    const impacts = activeCached?.impacts ?? {};
    const emptyCounters = (): ImpactCounters => ({ buffs: 0, nerfs: 0, adjs: 0, fixes: 0 });
    const getImpact = (plain: string) => {
      const k = plain.trim();
      return impacts[k] ?? impacts[`-- ${k}`];
    };
    const bump = (c: ImpactCounters, imp: "buff" | "nerf" | "adj" | "fix" | undefined) => {
      if (imp === "buff") c.buffs += 1;
      else if (imp === "nerf") c.nerfs += 1;
      else if (imp === "adj") c.adjs += 1;
      else if (imp === "fix") c.fixes += 1;
    };

    const heroSteamData = new Map<
      number,
      { hero: PatchHeroRef; counters: ImpactCounters; previews: string[] }
    >();
    const itemSteamData = new Map<
      string,
      { item: PatchItemRef; counters: ImpactCounters; previews: string[] }
    >();

    let activeItemKey: string | null = null;
    for (const block of activeNote.blocks) {
      if (block.type !== "bullet") {
        activeItemKey = null;
        continue;
      }
      const full = getRunsPlainText(block.runs);
      const imp = getImpact(full);

      if (block.nested) {
        if (activeItemKey) {
          const curItem = itemSteamData.get(activeItemKey);
          if (curItem) bump(curItem.counters, imp);
        }
        continue;
      }

      const colonIdx = full.indexOf(":");
      if (colonIdx <= 1 || colonIdx > 32) {
        activeItemKey = null;
        continue;
      }

      const key = full.slice(0, colonIdx).trim().toLowerCase();
      const translatedFull =
        lang === "pt" && activeCached?.available
          ? activeCached.translations[full.trim()] ?? full
          : full;
      const previewLine = stripLeadingPrefix(translatedFull);

      const hero = heroLinks[key];
      if (hero) {
        activeItemKey = null;
        let rec = heroSteamData.get(hero.id);
        if (!rec) {
          rec = { hero, counters: emptyCounters(), previews: [] };
          heroSteamData.set(hero.id, rec);
        }
        bump(rec.counters, imp);
        if (rec.previews.length < 3) rec.previews.push(previewLine);
        continue;
      }

      const item = itemLinks[key];
      if (item) {
        activeItemKey = item.className;
        let rec = itemSteamData.get(item.className);
        if (!rec) {
          rec = { item, counters: emptyCounters(), previews: [] };
          itemSteamData.set(item.className, rec);
        }
        bump(rec.counters, imp);
        if (rec.previews.length < 3) rec.previews.push(previewLine);
        continue;
      }

      activeItemKey = null;
    }

    const resolveHero = (rawName: string): PatchHeroRef | null => {
      const k = rawName.trim().toLowerCase();
      return (
        heroLinks[k] ??
        heroLinks[k.replace(/^the\s+/i, "")] ??
        heroLinks[`the ${k}`] ??
        null
      );
    };

    const wikiRow = wikiByGid[activeNote.id];
    const heroWikiKinds = new Map<number, WikiHeroChangeKind[]>();
    const heroBandByKey = new Map<string, { band: PatchBandKind; entry: HighlightHeroEntry }>();

    if (wikiRow) {
      const buckets: Array<{ kind: WikiHeroChangeKind; band: PatchBandKind; names: string[] }> = [
        { kind: "nerf", band: "nerf", names: wikiRow.nerfs },
        { kind: "buff", band: "buff", names: wikiRow.buffs },
        { kind: "adj", band: "adj", names: wikiRow.adjs },
        { kind: "fix", band: "adj", names: wikiRow.fixes },
        { kind: "new", band: "new", names: wikiRow.newHeroes },
      ];

      for (const bucket of buckets) {
        for (const rawName of bucket.names) {
          const hero = resolveHero(rawName);
          const entryKey = hero ? `id:${hero.id}` : `raw:${rawName.toLowerCase()}`;
          if (hero) {
            const list = heroWikiKinds.get(hero.id) ?? [];
            if (!list.includes(bucket.kind)) {
              list.push(bucket.kind);
              heroWikiKinds.set(hero.id, list);
            }
          }
          if (!heroBandByKey.has(entryKey)) {
            const steamRec = hero ? heroSteamData.get(hero.id) : undefined;
            heroBandByKey.set(entryKey, {
              band: bucket.band,
              entry: {
                key: entryKey,
                name: hero?.name ?? rawName,
                hero,
                inPatchBody: Boolean(steamRec),
                wikiKinds: hero ? heroWikiKinds.get(hero.id) ?? [bucket.kind] : [bucket.kind],
                counters: steamRec?.counters ?? emptyCounters(),
                previews: steamRec?.previews ?? [],
              },
            });
          } else if (hero) {
            const existing = heroBandByKey.get(entryKey)!;
            existing.entry.wikiKinds = heroWikiKinds.get(hero.id) ?? existing.entry.wikiKinds;
            if (existing.band !== "adj" && existing.band !== bucket.band && bucket.band !== "new") {
              existing.band = "adj";
            }
          }
        }
      }
    }

    for (const [heroId, rec] of heroSteamData.entries()) {
      const entryKey = `id:${heroId}`;
      if (heroBandByKey.has(entryKey)) continue;
      const fallbackBand: PatchBandKind =
        rec.counters.buffs > 0 && rec.counters.nerfs === 0
          ? "buff"
          : rec.counters.nerfs > 0 && rec.counters.buffs === 0
            ? "nerf"
            : "adj";
      heroBandByKey.set(entryKey, {
        band: fallbackBand,
        entry: {
          key: entryKey,
          name: rec.hero.name,
          hero: rec.hero,
          inPatchBody: true,
          wikiKinds: [],
          counters: rec.counters,
          previews: rec.previews,
        },
      });
    }

    const createBand = (kind: PatchBandKind): PatchImpactBand => {
      const meta = BAND_META[kind];
      return {
        kind,
        title: meta.title,
        headerClass: meta.headerClass,
        borderClass: meta.borderClass,
        ringClass: meta.ringClass,
        heroes: [],
        itemsBySlot: { weapon: [], vitality: [], spirit: [] },
        itemsCount: 0,
      };
    };

    const bandMap: Record<PatchBandKind, PatchImpactBand> = {
      nerf: createBand("nerf"),
      adj: createBand("adj"),
      buff: createBand("buff"),
      new: createBand("new"),
    };

    for (const { band, entry } of heroBandByKey.values()) {
      bandMap[band].heroes.push(entry);
    }
    for (const band of Object.values(bandMap)) {
      band.heroes.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }

    const itemBandByClass = new Map<
      string,
      { band: PatchBandKind; counters: ImpactCounters }
    >();
    for (const rec of itemSteamData.values()) {
      const band = classifyItemBand(rec.counters);
      bandMap[band].itemsBySlot[rec.item.slot].push({
        item: rec.item,
        counters: rec.counters,
        previews: rec.previews,
      });
      bandMap[band].itemsCount += 1;
      itemBandByClass.set(rec.item.className, { band, counters: rec.counters });
    }
    for (const band of Object.values(bandMap)) {
      for (const slot of ["weapon", "vitality", "spirit"] as const) {
        band.itemsBySlot[slot].sort((a, b) => {
          const nameA = lang === "pt" ? a.item.name : a.item.nameEn;
          const nameB = lang === "pt" ? b.item.name : b.item.nameEn;
          return nameA.localeCompare(nameB, "pt-BR");
        });
      }
    }

    const bands = (["buff", "nerf", "adj", "new"] as PatchBandKind[])
      .map((k) => bandMap[k])
      .filter((b) => b.heroes.length > 0 || b.itemsCount > 0);

    return {
      heroesCount: heroBandByKey.size,
      itemsCount: itemSteamData.size,
      bands,
      heroWikiKinds,
      itemBandByClass,
      hasClassification: Object.keys(impacts).length > 0 || Boolean(wikiRow),
    };
  }, [activeNote, activeCached, lang, heroLinks, itemLinks, wikiByGid]);

  const editorialNodes = useMemo((): EditorialNode[] => {
    if (!activeNote) return [];

    const nodes: EditorialNode[] = [];
    const coverImg = activeNote.heroImage;
    let skippedCoverImg = false;
    let seenStructure = false;

    const pushGeneralEntries = (entries: GeneralBulletEntry[]) => {
      if (entries.length === 0) return;

      // Agrupa blocos consecutivos com mesmo tópico ("Mid-Boss:", "Permanent Buffs:") quando há >= 2 itens
      let idx = 0;
      let plainRun: GeneralBulletEntry[] = [];

      const flushPlainRun = () => {
        if (plainRun.length > 0) {
          nodes.push({ kind: "bullet-panel", entries: plainRun });
          plainRun = [];
        }
      };

      while (idx < entries.length) {
        const current = entries[idx];
        if (!current.nested && current.topicPrefix) {
          const topic = current.topicPrefix;
          let end = idx + 1;
          while (end < entries.length) {
            const next = entries[end];
            if (next.nested || next.topicPrefix === topic) {
              end += 1;
            } else {
              break;
            }
          }
          const primaryCount = entries
            .slice(idx, end)
            .filter((e) => !e.nested).length;

          if (primaryCount >= 2) {
            flushPlainRun();
            nodes.push({
              kind: "topic-card",
              topic,
              entries: entries.slice(idx, end),
            });
            idx = end;
            continue;
          }
        }
        plainRun.push(current);
        idx += 1;
      }

      flushPlainRun();
    };

    let i = 0;
    const blocks = visibleBlocks;

    // Bloco inicial antes da primeira seção/título em notas de atualização vira caixa de citação editorial
    if (!noteSearch.trim() && activeNote.category === "balance") {
      const introBlocks: PatchNoteBlock[] = [];
      while (i < blocks.length) {
        const b = blocks[i];
        if (b.type === "section" || b.type === "heading" || b.type === "divider") break;
        if (b.type === "image") {
          if (coverImg && !skippedCoverImg && b.src === coverImg) {
            skippedCoverImg = true;
            i += 1;
            continue;
          }
          break;
        }
        if (b.type === "bullet") {
          const full = getRunsPlainText(b.runs);
          const colonIdx = full.indexOf(":");
          if (colonIdx > 1 && colonIdx <= 32) {
            const key = full.slice(0, colonIdx).trim().toLowerCase();
            if (heroLinks[key] || itemLinks[key]) break;
          }
        }
        introBlocks.push(b);
        i += 1;
        if (introBlocks.length >= 2) break;
      }
      if (introBlocks.length > 0) {
        nodes.push({ kind: "quote", blocks: introBlocks });
      }
    }

    while (i < blocks.length) {
      const b = blocks[i];

      if (b.type === "section") {
        seenStructure = true;
        nodes.push({ kind: "section", id: b.id, title: b.title });
        i += 1;
        continue;
      }

      if (b.type === "heading") {
        seenStructure = true;
        nodes.push({ kind: "heading", text: b.text });
        i += 1;
        continue;
      }

      if (b.type === "divider") {
        nodes.push({ kind: "divider" });
        i += 1;
        continue;
      }

      if (b.type === "image") {
        if (coverImg && !skippedCoverImg && b.src === coverImg) {
          skippedCoverImg = true;
          i += 1;
          continue;
        }
        nodes.push({ kind: "image", src: b.src, alt: b.alt, href: b.href });
        i += 1;
        continue;
      }

      if (b.type === "paragraph") {
        const plain = getRunsPlainText(b.runs).trim();
        if (!seenStructure && !noteSearch.trim() && i < 2 && plain.length < 480) {
          nodes.push({ kind: "quote", blocks: [b] });
        } else {
          nodes.push({ kind: "paragraph", block: b });
        }
        i += 1;
        continue;
      }

      // Bullet: verifica se inicia um card de Herói ou Item
      const full = getRunsPlainText(b.runs);
      const colonIdx = !b.nested ? full.indexOf(":") : -1;
      const prefixKey =
        colonIdx > 1 && colonIdx <= 32
          ? full.slice(0, colonIdx).trim().toLowerCase()
          : "";
      const matchedHero = prefixKey ? heroLinks[prefixKey] : undefined;
      const matchedItem = !matchedHero && prefixKey ? itemLinks[prefixKey] : undefined;

      if (matchedHero) {
        seenStructure = true;
        const baseEntries: HeroBulletEntry[] = [];
        const abilityGroups: HeroAbilitySubGroup[] = [];
        const abilityGroupByKey = new Map<string, HeroAbilitySubGroup>();
        let totalCount = 0;

        while (i < blocks.length) {
          const cur = blocks[i];
          if (cur.type !== "bullet") break;
          const curFull = getRunsPlainText(cur.runs);
          const curColon = !cur.nested ? curFull.indexOf(":") : -1;
          const curKey =
            curColon > 1 && curColon <= 32
              ? curFull.slice(0, curColon).trim().toLowerCase()
              : "";
          if (!cur.nested && heroLinks[curKey]?.id !== matchedHero.id) break;

          const skipChars = cur.nested ? 0 : curColon + 1;
          const remainder = curFull.slice(skipChars).trim();
          const dashIdx = remainder.indexOf(" - ");
          let matchedAbility: PatchHeroAbilityRef | null = null;

          if (!cur.nested && dashIdx > 0 && dashIdx <= 44) {
            const abilityCandidate = remainder.slice(0, dashIdx).trim();
            matchedAbility = matchHeroAbility(matchedHero.abilities, abilityCandidate);
          }

          const entry: HeroBulletEntry = {
            block: cur,
            originalPlain: curFull,
            skipChars: matchedAbility ? skipChars + 1 + dashIdx + 3 : skipChars,
          };

          if (matchedAbility) {
            const gKey = matchedAbility.nameEn.toLowerCase();
            let grp = abilityGroupByKey.get(gKey);
            if (!grp) {
              grp = { ability: matchedAbility, entries: [] };
              abilityGroupByKey.set(gKey, grp);
              abilityGroups.push(grp);
            }
            grp.entries.push(entry);
          } else {
            baseEntries.push(entry);
          }

          totalCount += 1;
          i += 1;
        }

        nodes.push({
          kind: "hero-card",
          hero: matchedHero,
          baseEntries,
          abilityGroups,
          totalCount,
        });
        continue;
      }

      if (matchedItem) {
        seenStructure = true;
        const entries: ItemBulletEntry[] = [];

        while (i < blocks.length) {
          const cur = blocks[i];
          if (cur.type !== "bullet") break;
          const curFull = getRunsPlainText(cur.runs);
          if (cur.nested) {
            entries.push({
              block: cur,
              originalPlain: curFull,
              skipChars: 0,
              nested: true,
            });
            i += 1;
            continue;
          }

          const curColon = curFull.indexOf(":");
          const curKey =
            curColon > 1 && curColon <= 32
              ? curFull.slice(0, curColon).trim().toLowerCase()
              : "";
          if (itemLinks[curKey]?.className !== matchedItem.className) break;

          entries.push({
            block: cur,
            originalPlain: curFull,
            skipChars: curColon + 1,
            nested: false,
          });
          i += 1;
        }

        nodes.push({ kind: "item-card", item: matchedItem, entries });
        continue;
      }

      // Sequência de bullets gerais (até encontrar bloco não-bullet ou início de herói/item)
      const generalRun: GeneralBulletEntry[] = [];
      while (i < blocks.length) {
        const cur = blocks[i];
        if (cur.type !== "bullet") break;
        const curFull = getRunsPlainText(cur.runs);
        const curColon = !cur.nested ? curFull.indexOf(":") : -1;
        const curKey =
          curColon > 1 && curColon <= 32
            ? curFull.slice(0, curColon).trim().toLowerCase()
            : "";
        if (!cur.nested && (heroLinks[curKey] || itemLinks[curKey])) break;

        generalRun.push({
          block: cur,
          originalPlain: curFull,
          nested: Boolean(cur.nested),
          topicPrefix:
            !cur.nested && curColon > 1 && curColon <= 28
              ? curFull.slice(0, curColon).trim()
              : null,
        });
        i += 1;
      }

      pushGeneralEntries(generalRun);
    }

    return nodes;
  }, [activeNote, visibleBlocks, noteSearch, heroLinks, itemLinks]);

  const selectPatch = (id: string) => {
    setSelectedId(id);
    setNoteSearch("");
    setCopied(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (notes[0]?.id === id) url.searchParams.delete("patch");
      else url.searchParams.set("patch", id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const copyShareLink = async () => {
    if (!activeNote || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("patch", activeNote.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const renderInlineLinksRow = (runs: PatchNoteInline[]) => {
    const inlineLinks = runs.filter(
      (r): r is Extract<PatchNoteInline, { type: "link" }> => r.type === "link",
    );
    if (inlineLinks.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 pt-0.5">
        {inlineLinks.map((lnk, lIdx) => (
          <a
            key={lIdx}
            href={lnk.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-400 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-300"
          >
            {lnk.text}
          </a>
        ))}
      </div>
    );
  };

  const latestId = notes[0]?.id;
  const activeDisplayTitle = activeNote
    ? activeTranslation?.titlePt || activeNote.title
    : "";
  const highlight = noteSearch.trim();
  const showHighlights = !highlight && !isWaitingPt && patchHighlights.bands.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
            Patch <span className="text-amber-500">Notes</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide">
            Notas oficiais de atualização do Deadlock publicadas na Steam, organizadas por seção, herói, habilidade e item.
          </p>
        </div>

        <Link
          href="/patches"
          className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-[5px] border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
        >
          <span>Patch Tracker (Impacto)</span>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M1 8a.75.75 0 0 1 .75-.75h9.793L8.27 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.273-3.22H1.75A.75.75 0 0 1 1 8Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </header>

      {notes.length === 0 ? (
        <div className="rounded-[5px] border border-neutral-800/90 bg-[#0a0d0c]/95 p-8 text-center">
          <p className="text-sm text-rose-400">
            Não foi possível carregar as notas oficiais da Steam agora. Tente novamente em alguns minutos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-6 items-start">
          {/* COLUNA ESQUERDA: LISTA E BUSCA DE PATCHES */}
          <aside className="rounded-[5px] border border-neutral-800/90 bg-[#0a0d0c]/95 p-3.5 space-y-3 lg:sticky lg:top-6">
            <div className="relative">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500"
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
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Buscar patch, herói ou item..."
                className="w-full rounded-[5px] border border-neutral-800 bg-[#070807] py-2 pl-8 pr-3 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500/70"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-[5px] border border-neutral-800/80 bg-[#070807] p-1">
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "balance", label: "Balance" },
                  { id: "feature", label: "Anúncios" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`rounded-[4px] py-1.5 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    category === tab.id
                      ? "bg-amber-500 text-black"
                      : "text-neutral-400 hover:text-[#f4efe6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Seletor compacto no mobile */}
            <div className="lg:hidden">
              <select
                value={activeNote?.id ?? ""}
                onChange={(e) => selectPatch(e.target.value)}
                className="w-full rounded-[5px] border border-neutral-800 bg-[#070807] px-3 py-2.5 text-xs font-bold text-[#f4efe6] outline-none focus:border-amber-500/70"
              >
                {filteredNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {formatShortDate(n.publishedAt)} — {n.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista rolável no desktop */}
            <div className="hidden lg:block lp-scroll max-h-[calc(100svh-16rem)] overflow-y-auto pr-1 space-y-1.5">
              {filteredNotes.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">
                  Nenhuma nota encontrada.
                </p>
              ) : (
                filteredNotes.map((n) => {
                  const isActive = activeNote?.id === n.id;
                  const isLatest = n.id === latestId;
                  const itemTitle =
                    lang === "pt" ? translationsByGid[n.id]?.titlePt || n.title : n.title;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectPatch(n.id)}
                      className={`w-full text-left rounded-[5px] border p-2.5 transition-colors cursor-pointer space-y-1 ${
                        isActive
                          ? "border-amber-500/60 bg-amber-500/12"
                          : "border-neutral-800/80 bg-[#070908]/80 hover:border-neutral-700 hover:bg-neutral-900/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-neutral-400">
                          {formatShortDate(n.publishedAt)}
                        </span>
                        {isLatest && (
                          <span className="rounded-[3px] border border-amber-400/50 bg-amber-500/20 px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider text-amber-200">
                            Mais recente
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs font-bold leading-snug line-clamp-2 ${
                          isActive ? "text-amber-300" : "text-[#f4efe6]"
                        }`}
                      >
                        {itemTitle}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        por {n.author}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* COLUNA DIREITA: EDITORIAL PATCH NOTES */}
          {activeNote && (
            <article className="min-w-0 space-y-6">
              {/* CABEÇALHO EDITORIAL + BANNER OPCIONAL */}
              <div className="dl-noise relative overflow-hidden rounded-[5px] border border-white/12 bg-[#0a0d0c]/95 shadow-[0_18px_40px_rgba(0,0,0,0.65)]">
                {activeNote.heroImage && (
                  <div className="relative h-44 sm:h-60 w-full overflow-hidden border-b border-white/10">
                    <img
                      src={activeNote.heroImage}
                      alt={activeDisplayTitle}
                      className="h-full w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d0c] via-[#0a0d0c]/55 to-black/20" />
                  </div>
                )}

                <div className={`relative p-5 sm:p-7 space-y-4 ${activeNote.heroImage ? "-mt-10 sm:-mt-14" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {activeNote.id === latestId && (
                        <span className="rounded-[4px] border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-200">
                          Mais recente
                        </span>
                      )}
                      <span
                        className={`rounded-[4px] border px-2 py-0.5 font-deadlock text-[10px] font-black uppercase tracking-wider ${
                          activeNote.category === "balance"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                        }`}
                      >
                        {activeNote.category === "balance" ? "Atualização / Balance" : "Anúncio Oficial"}
                      </span>
                      <span className="font-mono text-neutral-400">
                        {formatFullDate(activeNote.publishedAt)} • por {activeNote.author}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isDelayedTranslating && (
                        <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>
                            {lang === "pt" ? "Traduzindo..." : "Classificando..."}
                          </span>
                        </span>
                      )}
                      {lang === "pt" && activeFailed && (
                        <span className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300">
                          Tradução indisponível (EN)
                        </span>
                      )}
                      <div className="inline-flex rounded-[4px] border border-neutral-800 bg-[#070807] p-0.5">
                        <button
                          type="button"
                          onClick={() => setLang("pt")}
                          className={`rounded-[3px] px-2 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                            lang === "pt"
                              ? "bg-amber-500 text-black"
                              : "text-neutral-400 hover:text-[#f4efe6]"
                          }`}
                        >
                          PT-BR
                        </button>
                        <button
                          type="button"
                          onClick={() => setLang("en")}
                          className={`rounded-[3px] px-2 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                            lang === "en"
                              ? "bg-amber-500 text-black"
                              : "text-neutral-400 hover:text-[#f4efe6]"
                          }`}
                        >
                          EN
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={copyShareLink}
                        className="rounded-[4px] border border-neutral-700/90 bg-neutral-900/90 px-2.5 py-1.5 text-[11px] font-bold text-neutral-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer"
                      >
                        {copied ? "Link copiado!" : "Copiar link"}
                      </button>
                      <a
                        href={activeNote.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-500/20"
                      >
                        <span>Abrir na Steam</span>
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
                          <path d="M9.5 2H14v4.5" />
                          <path d="M14 2 7.5 8.5" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  <h2 className="font-deadlock text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-[#f4efe6]">
                    {activeDisplayTitle}
                  </h2>

                  <div className="relative">
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500"
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
                      type="text"
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      placeholder="Filtrar linhas, heróis ou itens nesta atualização..."
                      className="w-full rounded-[5px] border border-neutral-800 bg-[#070807]/90 py-2 pl-8 pr-8 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500/70"
                    />
                    {noteSearch && (
                      <button
                        type="button"
                        onClick={() => setNoteSearch("")}
                        aria-label="Limpar filtro"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {sections.length > 0 && !highlight && (
                    <div className="flex flex-wrap gap-1.5">
                      {sections.map((sec) => (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="rounded-[4px] border border-neutral-800 bg-[#070807] px-2.5 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                        >
                          {translateText(sec.title) ?? sec.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isWaitingPt ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="dl-noise relative overflow-hidden rounded-[5px] border border-amber-500/25 bg-[#0a0d0c]/95 px-6 py-14 text-center shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                >
                  <div className="pointer-events-none absolute top-0 inset-x-0 h-0.5 overflow-hidden bg-amber-500/10">
                    <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  </div>

                  <div className="relative flex flex-col items-center gap-5">
                    <DeadlockLoadingLogo size="sm" />
                    <div className="space-y-1.5">
                      <p className="font-deadlock text-base sm:text-lg font-black uppercase tracking-[0.2em] text-[#f4efe6]">
                        Traduzindo <span className="text-amber-500">Patch Notes</span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        Traduzindo notas para PT-BR e classificando buffs, nerfs e ajustes…
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLang("en")}
                      className="rounded-[4px] border border-neutral-700/90 bg-neutral-900/90 px-3 py-1.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 cursor-pointer"
                    >
                      Ler em inglês enquanto carrega
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* DESTAQUES DO PATCH (FAIXAS NERFS / AJUSTES / BUFFS COM HEROIS + ITENS) */}
                  {showHighlights && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-4 flex-1 min-w-[220px]">
                      <h3 className="font-deadlock text-lg sm:text-xl font-black uppercase italic tracking-wider text-amber-400">
                        Destaques do Patch
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-amber-500/45 via-white/15 to-transparent" />
                    </div>
                    <p className="text-[11px] font-medium text-neutral-400">
                      {patchHighlights.heroesCount} heróis • {patchHighlights.itemsCount} itens • clique para ir ao card
                    </p>
                  </div>

                  <div className="space-y-3">
                    {patchHighlights.bands.map((band) => {
                      const hasBoth = band.heroes.length > 0 && band.itemsCount > 0;
                      const slotOrder: Array<"weapon" | "vitality" | "spirit"> = [
                        "weapon",
                        "vitality",
                        "spirit",
                      ];

                      return (
                        <div
                          key={band.kind}
                          className={`rounded-[5px] border bg-[#0a0d0c]/95 shadow-[0_14px_34px_rgba(0,0,0,0.48)] ${band.borderClass}`}
                        >
                          <div
                            className={`flex items-center justify-between gap-2 rounded-t-[4px] border-b px-3.5 py-2 ${band.headerClass}`}
                          >
                            <div className="flex items-center gap-2">
                              <WikiChangeIcon kind={band.kind} className="h-3.5 w-3.5" />
                              <h4 className="font-deadlock text-sm font-black uppercase italic tracking-wider">
                                {band.title}
                              </h4>
                            </div>
                            <span className="text-[11px] font-bold opacity-85">
                              {band.heroes.length > 0 ? `${band.heroes.length} heróis` : ""}
                              {hasBoth ? " • " : ""}
                              {band.itemsCount > 0 ? `${band.itemsCount} itens` : ""}
                            </span>
                          </div>

                          <div
                            className={`grid grid-cols-1 ${
                              !hasBoth
                                ? ""
                                : band.heroes.length > band.itemsCount * 1.25
                                  ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
                                  : band.itemsCount > band.heroes.length * 1.25
                                    ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]"
                                    : "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
                            }`}
                          >
                            {band.heroes.length > 0 && (
                              <div
                                className={`p-3.5 sm:p-4 ${
                                  hasBoth
                                    ? "border-b border-white/10 xl:border-b-0 xl:border-r xl:border-white/10"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`grid gap-2.5 ${
                                    hasBoth
                                      ? "grid-cols-3 sm:grid-cols-5 md:grid-cols-6"
                                      : "grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8"
                                  }`}
                                >
                                  {band.heroes.map((entry) => {
                                    const imgUrl = entry.hero?.portrait ?? entry.hero?.image ?? null;
                                    const heroBg = entry.hero?.bg ?? null;
                                    const hcVar = {
                                      "--hc": entry.hero?.rgb
                                        ? entry.hero.rgb.join(" ")
                                        : "245 158 11",
                                    } as CSSProperties;
                                    const tipId = `${band.kind}-h-${entry.key}`;
                                    const tile = (
                                      <div
                                        className="group relative"
                                        style={hcVar}
                                        onMouseEnter={() => setHoveredTip(tipId)}
                                        onMouseLeave={() =>
                                          setHoveredTip((cur) => (cur === tipId ? null : cur))
                                        }
                                      >
                                        <div
                                          className={`flex flex-col overflow-hidden rounded-[6px] border bg-[#0c0f0e] transition-transform duration-150 group-hover:scale-[1.03] ${band.ringClass}`}
                                        >
                                          <div className="hero-card-art relative aspect-[3/4] w-full overflow-hidden">
                                            {heroBg && (
                                              <Image
                                                src={heroBg}
                                                alt=""
                                                fill
                                                sizes="96px"
                                                draggable={false}
                                                className="object-cover opacity-90"
                                              />
                                            )}
                                            {imgUrl ? (
                                              <img
                                                src={imgUrl}
                                                alt={entry.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="relative z-[1] h-full w-full object-cover object-top"
                                              />
                                            ) : (
                                              <div className="relative z-[1] flex h-full w-full items-center justify-center font-deadlock text-sm font-black text-neutral-400">
                                                {entry.name.slice(0, 2).toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                          <div className="hero-card-name flex h-[36px] items-center justify-center border-t border-white/10 bg-[#080b0a] px-1 py-1 text-center">
                                            <span className="text-[11px] font-semibold leading-[1.15] text-neutral-100 group-hover:text-amber-300 line-clamp-2">
                                              {entry.name}
                                            </span>
                                          </div>
                                        </div>

                                        {hoveredTip === tipId && entry.previews.length > 0 && (
                                          <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-2 w-60 -translate-x-1/2 rounded-[5px] border border-white/15 bg-[#0e1211] p-2.5 text-left shadow-xl">
                                            <p className="mb-1 font-deadlock text-[11px] font-black text-amber-300">
                                              {entry.name}
                                            </p>
                                            <ul className="space-y-1 text-[11px] leading-snug text-neutral-300">
                                              {entry.previews.map((line, pIdx) => (
                                                <li key={pIdx} className="line-clamp-2">
                                                  {line}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    );

                                    if (entry.hero && entry.inPatchBody) {
                                      return (
                                        <a key={entry.key} href={`#hero-${entry.hero.id}`}>
                                          {tile}
                                        </a>
                                      );
                                    }
                                    if (entry.hero) {
                                      return (
                                        <Link key={entry.key} href={`/heroes/${entry.hero.id}`}>
                                          {tile}
                                        </Link>
                                      );
                                    }
                                    return <div key={entry.key}>{tile}</div>;
                                  })}
                                </div>
                              </div>
                            )}

                            {band.itemsCount > 0 && (
                              <div className="p-3.5 sm:p-4 bg-[#070908]/45">
                                <div className="flex flex-wrap gap-2.5">
                                  {slotOrder.flatMap((slot) => {
                                    const slotStyle = SLOT_META[slot];
                                    return band.itemsBySlot[slot].map(({ item: it, previews }) => {
                                      const itemLabel = lang === "pt" ? it.name : it.nameEn;
                                      const itemTipId = `${band.kind}-i-${it.className}`;
                                      return (
                                        <a
                                          key={it.className}
                                          href={`#item-${it.className}`}
                                          className="group relative w-[84px]"
                                          onMouseEnter={() => setHoveredTip(itemTipId)}
                                          onMouseLeave={() =>
                                            setHoveredTip((cur) =>
                                              cur === itemTipId ? null : cur,
                                            )
                                          }
                                        >
                                          <div
                                            className="flex flex-col overflow-hidden rounded-[6px] border bg-[#0e1211] transition-transform duration-150 group-hover:scale-[1.03]"
                                            style={{ borderColor: slotStyle.accent }}
                                          >
                                            <div className="aspect-[11/12] w-full overflow-hidden bg-black/75">
                                              {it.image && (
                                                <img
                                                  src={it.image}
                                                  alt={itemLabel}
                                                  loading="lazy"
                                                  decoding="async"
                                                  className="h-full w-full object-cover"
                                                />
                                              )}
                                            </div>
                                            <div className="flex h-[38px] items-center justify-center border-t border-white/10 bg-[#080b0a] px-1.5 py-1 text-center">
                                              <span className="text-[10px] font-semibold leading-[1.15] text-neutral-100 group-hover:text-amber-300 line-clamp-2">
                                                {itemLabel}
                                              </span>
                                            </div>
                                          </div>

                                          {hoveredTip === itemTipId && previews.length > 0 && (
                                            <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-2 w-60 -translate-x-1/2 rounded-[5px] border border-white/15 bg-[#0e1211] p-2.5 text-left shadow-xl">
                                              <p className={`mb-1 font-deadlock text-[11px] font-black ${slotStyle.colorClass}`}>
                                                {itemLabel}
                                              </p>
                                              <ul className="space-y-1 text-[11px] leading-snug text-neutral-300">
                                                {previews.map((line, pIdx) => (
                                                  <li key={pIdx} className="line-clamp-2">
                                                    {line}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </a>
                                      );
                                    });
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* CORPO EDITORIAL */}
              {editorialNodes.length === 0 ? (
                <div className="rounded-[5px] border border-neutral-800/90 bg-[#0a0d0c]/92 p-10 text-center space-y-3">
                  <p className="text-sm text-neutral-400">
                    Nenhuma linha encontrada para &ldquo;{noteSearch}&rdquo; nesta atualização.
                  </p>
                  <button
                    type="button"
                    onClick={() => setNoteSearch("")}
                    className="rounded-[4px] border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  >
                    Limpar filtro
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {editorialNodes.map((node, idx) => {
                    if (node.kind === "quote") {
                      return (
                        <blockquote
                          key={`q-${idx}`}
                          className="relative overflow-hidden rounded-[5px] border border-white/12 border-l-2 border-l-amber-500/75 bg-[#070908]/95 px-6 py-5 shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-2.5 top-1 font-serif text-4xl leading-none text-amber-500/30"
                          >
                            &ldquo;
                          </span>
                          <div className="relative space-y-2 pl-4 pr-4 text-sm sm:text-[15px] italic leading-relaxed text-neutral-200">
                            {node.blocks.map((qb, qIdx) => {
                              if (qb.type !== "bullet" && qb.type !== "paragraph") return null;
                              const plain = getRunsPlainText(qb.runs);
                              const pt = translateText(plain);
                              return (
                                <p key={qIdx}>
                                  {pt
                                    ? renderHighlightedText(pt, highlight)
                                    : renderRuns(qb.runs, highlight)}
                                </p>
                              );
                            })}
                          </div>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute bottom-1 right-3 font-serif text-4xl leading-none text-amber-500/30"
                          >
                            &rdquo;
                          </span>
                        </blockquote>
                      );
                    }

                    if (node.kind === "section") {
                      return (
                        <div
                          key={`${node.id}-${idx}`}
                          id={node.id}
                          className="scroll-mt-6 flex items-center gap-4 pt-5 first:pt-1"
                        >
                          <h3 className="font-deadlock text-xl sm:text-2xl font-black uppercase italic tracking-wider text-amber-400">
                            {translateText(node.title) ?? node.title}
                          </h3>
                          <div className="h-px flex-1 bg-gradient-to-r from-amber-500/45 via-white/15 to-transparent" />
                        </div>
                      );
                    }

                    if (node.kind === "heading") {
                      const text = translateText(node.text) ?? node.text;
                      return (
                        <h4
                          key={`h-${idx}`}
                          className="pt-2 font-deadlock text-lg sm:text-xl font-black tracking-tight text-[#f4efe6]"
                        >
                          {renderHighlightedText(text, highlight)}
                        </h4>
                      );
                    }

                    if (node.kind === "divider") {
                      return <hr key={`div-${idx}`} className="my-2 border-white/10" />;
                    }

                    if (node.kind === "image") {
                      const imgEl = (
                        <img
                          src={node.src}
                          alt={node.alt}
                          loading="lazy"
                          className="max-h-[460px] w-auto rounded-[5px] border border-white/12 object-contain"
                        />
                      );
                      return (
                        <div
                          key={`img-${idx}`}
                          className="rounded-[5px] border border-neutral-800/90 bg-[#0a0d0c]/92 p-4 flex justify-center"
                        >
                          {node.href ? (
                            <a
                              href={node.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              {imgEl}
                            </a>
                          ) : (
                            imgEl
                          )}
                        </div>
                      );
                    }

                    if (node.kind === "paragraph") {
                      const plain = getRunsPlainText(node.block.runs);
                      const pt = translateText(plain);
                      return (
                        <div
                          key={`p-${idx}`}
                          className="rounded-[5px] border border-neutral-800/80 bg-[#0a0d0c]/90 px-5 py-4 space-y-1.5"
                        >
                          <p className="text-sm leading-relaxed text-neutral-300">
                            {pt
                              ? renderStatTransitions(pt, highlight)
                              : renderRuns(node.block.runs, highlight)}
                          </p>
                          {pt && renderInlineLinksRow(node.block.runs)}
                        </div>
                      );
                    }

                    if (node.kind === "hero-card") {
                      const { hero, baseEntries, abilityGroups, totalCount } = node;
                      const rgb = hero.rgb;
                      const heroColor = rgb ? `rgb(${rgb.join(", ")})` : "#f59e0b";
                      const cardBorder = rgb
                        ? { borderColor: `rgba(${rgb.join(", ")}, 0.32)` }
                        : undefined;
                      const cardGlow = rgb
                        ? {
                            background: `radial-gradient(ellipse at top left, rgba(${rgb.join(", ")}, 0.16), transparent 58%)`,
                          }
                        : undefined;

                      return (
                        <section
                          key={`hero-${hero.id}-${idx}`}
                          id={`hero-${hero.id}`}
                          style={cardBorder}
                          className="scroll-mt-6 relative overflow-hidden rounded-[5px] border border-white/12 bg-[#0a0d0c]/95 shadow-[0_14px_34px_rgba(0,0,0,0.5)] [content-visibility:auto] [contain-intrinsic-size:auto_240px]"
                        >
                          {cardGlow && (
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0"
                              style={cardGlow}
                            />
                          )}

                          {/* Cabeçalho do Card do Herói */}
                          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                            <div className="flex items-center gap-3.5">
                              <Link
                                href={`/heroes/${hero.id}`}
                                className="hero-card-art relative h-16 w-12 shrink-0 overflow-hidden rounded-[5px] border transition-transform hover:scale-[1.03]"
                                style={
                                  {
                                    borderColor: heroColor,
                                    "--hc": rgb ? rgb.join(" ") : "245 158 11",
                                  } as CSSProperties
                                }
                              >
                                {hero.bg && (
                                  <Image
                                    src={hero.bg}
                                    alt=""
                                    fill
                                    sizes="96px"
                                    draggable={false}
                                    className="object-cover opacity-90"
                                  />
                                )}
                                {(hero.portrait ?? hero.image) && (
                                  <img
                                    src={(hero.portrait ?? hero.image) as string}
                                    alt={hero.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="relative z-[1] h-full w-full object-cover object-top"
                                  />
                                )}
                              </Link>
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/heroes/${hero.id}`}
                                    className="font-deadlock text-xl sm:text-2xl font-black tracking-tight transition-opacity hover:opacity-85"
                                    style={{ color: heroColor }}
                                  >
                                    {hero.name}
                                  </Link>
                                  {(patchHighlights.heroWikiKinds.get(hero.id) ?? []).map((kind) => {
                                    const meta = WIKI_BADGE_META[kind];
                                    return (
                                      <span
                                        key={kind}
                                        className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider ${meta.badgeClass}`}
                                      >
                                        <WikiChangeIcon kind={kind} className="h-2.5 w-2.5" />
                                        <span>{meta.label}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] font-medium text-neutral-400">
                                  {totalCount}{" "}
                                  {totalCount === 1 ? "alteração registrada" : "alterações registradas"}
                                </p>
                              </div>
                            </div>

                            <Link
                              href={`/heroes/${hero.id}`}
                              className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/12 bg-black/45 px-2.5 py-1.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                            >
                              <span>Ver Herói</span>
                              <ArrowRightSvg className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Conteúdo interno: Status Base & Sub-blocos por Habilidade */}
                          <div className="relative divide-y divide-white/8 px-5 py-2">
                            {baseEntries.length > 0 && (
                              <div className="py-3.5 space-y-2.5">
                                <p className="font-deadlock text-[11px] font-black uppercase tracking-widest text-neutral-400">
                                  Status Base &amp; Geral
                                </p>
                                <ul className="space-y-2">
                                  {baseEntries.map((entry, eIdx) => {
                                    const ptFull = translateText(entry.originalPlain);
                                    const ptText = ptFull
                                      ? stripLeadingPrefix(ptFull)
                                      : null;
                                    return (
                                      <li
                                        key={eIdx}
                                        className="flex items-start gap-2.5 text-sm leading-relaxed text-neutral-300"
                                      >
                                        <span
                                          aria-hidden
                                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                                          style={{ backgroundColor: heroColor }}
                                        />
                                        <div className="min-w-0 flex-1 space-y-1">
                                          <p>
                                            {ptText
                                              ? renderFormattedLine(ptText, highlight)
                                              : renderRuns(entry.block.runs, highlight, entry.skipChars)}
                                          </p>
                                          {ptText && renderInlineLinksRow(entry.block.runs)}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {abilityGroups.map((grp, gIdx) => {
                              const ab = grp.ability!;
                              const abTitle = lang === "pt" ? ab.namePt : ab.nameEn;
                              return (
                                <div key={`${ab.nameEn}-${gIdx}`} className="py-3.5 space-y-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {ab.image && (
                                        <img
                                          src={ab.image}
                                          alt={abTitle}
                                          loading="lazy"
                                          decoding="async"
                                          className="h-9 w-9 shrink-0 rounded-[4px] border border-white/15 bg-black/75 object-contain p-0.5"
                                        />
                                      )}
                                    <div className="min-w-0">
                                      <h4 className="font-deadlock text-sm sm:text-base font-black tracking-wide text-[#f4efe6]">
                                        {abTitle}
                                      </h4>
                                    </div>
                                  </div>

                                  <ul className="space-y-2 pl-1">
                                    {grp.entries.map((entry, eIdx) => {
                                      const ptFull = translateText(entry.originalPlain);
                                      const ptText = ptFull
                                        ? stripAbilityDashPrefix(stripLeadingPrefix(ptFull))
                                        : null;
                                      return (
                                        <li
                                          key={eIdx}
                                          className="flex items-start gap-2.5 text-sm leading-relaxed text-neutral-300"
                                        >
                                          <span
                                            aria-hidden
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: heroColor }}
                                          />
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <p>
                                              {ptText
                                                ? renderFormattedLine(ptText, highlight)
                                                : renderRuns(entry.block.runs, highlight, entry.skipChars)}
                                            </p>
                                            {ptText && renderInlineLinksRow(entry.block.runs)}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    }

                    if (node.kind === "item-card") {
                      const { item, entries } = node;
                      const slotStyle = SLOT_META[item.slot];
                      const itemTitle = lang === "pt" ? item.name : item.nameEn;

                      return (
                        <section
                          key={`item-${item.className}-${idx}`}
                          id={`item-${item.className}`}
                          className="scroll-mt-6 overflow-hidden rounded-[5px] border border-white/12 bg-[#0a0d0c]/95 shadow-[0_12px_30px_rgba(0,0,0,0.45)] [content-visibility:auto] [contain-intrinsic-size:auto_180px]"
                          style={{ borderLeftWidth: "3px", borderLeftColor: slotStyle.accent }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/items/${item.className}`}
                                className={`h-11 w-11 shrink-0 overflow-hidden rounded-[5px] border bg-black/65 transition-transform hover:scale-[1.04] ${slotStyle.borderClass}`}
                              >
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={itemTitle}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </Link>
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/items/${item.className}`}
                                    className={`font-deadlock text-lg sm:text-xl font-black tracking-tight transition-opacity hover:opacity-85 ${slotStyle.colorClass}`}
                                  >
                                    {itemTitle}
                                  </Link>
                                  {(() => {
                                    const info = patchHighlights.itemBandByClass.get(item.className);
                                    if (!info || !patchHighlights.hasClassification) return null;
                                    const badgeKind: WikiHeroChangeKind =
                                      info.counters.fixes > 0 &&
                                      info.counters.buffs === 0 &&
                                      info.counters.nerfs === 0 &&
                                      info.counters.adjs === 0
                                        ? "fix"
                                        : info.band === "buff"
                                          ? "buff"
                                          : info.band === "nerf"
                                            ? "nerf"
                                            : "adj";
                                    const meta = WIKI_BADGE_META[badgeKind];
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider ${meta.badgeClass}`}
                                      >
                                        <WikiChangeIcon kind={badgeKind} className="h-2.5 w-2.5" />
                                        <span>{meta.label}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span
                                    className={`rounded-[3px] border px-1.5 py-0.5 font-deadlock text-[9px] font-black uppercase tracking-wider ${slotStyle.badgeClass}`}
                                  >
                                    {slotStyle.label} • T{item.tier}
                                  </span>
                                  <span className="font-mono text-neutral-400">
                                    {item.cost.toLocaleString("pt-BR")} Almas
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Link
                              href={`/items/${item.className}`}
                              className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/12 bg-black/45 px-2.5 py-1.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                            >
                              <span>Ver Item</span>
                              <ArrowRightSvg className="h-3 w-3" />
                            </Link>
                          </div>

                          <ul className="space-y-2 px-5 py-4">
                            {entries.map((entry, eIdx) => {
                              const ptFull = translateText(entry.originalPlain);
                              const ptText = ptFull
                                ? entry.nested
                                  ? ptFull
                                  : stripLeadingPrefix(ptFull)
                                : null;

                              return (
                                <li
                                  key={eIdx}
                                  className={`flex items-start gap-2.5 text-sm leading-relaxed text-neutral-300 ${
                                    entry.nested ? "pl-6 text-[13px] text-neutral-400" : ""
                                  }`}
                                >
                                  <span
                                    aria-hidden
                                    className={`mt-2 shrink-0 rounded-full ${
                                      entry.nested
                                        ? "h-1.5 w-1.5 border border-neutral-500 bg-transparent"
                                        : "h-1.5 w-1.5"
                                    }`}
                                    style={entry.nested ? undefined : { backgroundColor: slotStyle.accent }}
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p>
                                      {ptText
                                        ? renderFormattedLine(ptText, highlight)
                                        : renderRuns(entry.block.runs, highlight, entry.skipChars)}
                                    </p>
                                    {ptText && renderInlineLinksRow(entry.block.runs)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    }

                    if (node.kind === "topic-card") {
                      const firstPt = translateText(node.entries[0]?.originalPlain ?? "");
                      const colonPt = firstPt ? firstPt.indexOf(":") : -1;
                      const displayTopic =
                        firstPt && colonPt > 1 && colonPt <= 36
                          ? firstPt.slice(0, colonPt).trim()
                          : node.topic;

                      return (
                        <section
                          key={`topic-${node.topic}-${idx}`}
                          className="rounded-[5px] border border-white/12 bg-[#0a0d0c]/95 shadow-[0_10px_28px_rgba(0,0,0,0.4)] [content-visibility:auto] [contain-intrinsic-size:auto_180px]"
                        >
                          <div className="border-b border-white/10 px-5 py-3">
                            <h4 className="font-deadlock text-sm sm:text-base font-black uppercase tracking-wider text-amber-300">
                              {renderHighlightedText(displayTopic, highlight)}
                            </h4>
                          </div>
                          <ul className="space-y-2 px-5 py-4">
                            {node.entries.map((entry, eIdx) => {
                              const ptFull = translateText(entry.originalPlain);
                              const ptText = ptFull
                                ? entry.nested
                                  ? ptFull
                                  : stripLeadingPrefix(ptFull)
                                : null;
                              const skip =
                                !entry.nested && entry.topicPrefix
                                  ? entry.originalPlain.indexOf(":") + 1
                                  : 0;
                              return (
                                <li
                                  key={eIdx}
                                  className={`flex items-start gap-2.5 text-sm leading-relaxed text-neutral-300 ${
                                    entry.nested ? "pl-6 text-[13px] text-neutral-400" : ""
                                  }`}
                                >
                                  <span
                                    aria-hidden
                                    className={`mt-2 shrink-0 rounded-full ${
                                      entry.nested
                                        ? "h-1.5 w-1.5 border border-neutral-500 bg-transparent"
                                        : "h-1.5 w-1.5 bg-amber-500/80"
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p>
                                      {ptText
                                        ? renderFormattedLine(ptText, highlight)
                                        : renderRuns(entry.block.runs, highlight, skip)}
                                    </p>
                                    {ptText && renderInlineLinksRow(entry.block.runs)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    }

                    // bullet-panel: grupo de bullets gerais soltos em painel limpo
                    return (
                      <div
                        key={`bp-${idx}`}
                        className="rounded-[5px] border border-neutral-800/90 bg-[#0a0d0c]/92 px-5 py-4 [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
                      >
                        <ul className="space-y-2.5">
                          {node.entries.map((entry, eIdx) => {
                            const ptFull = translateText(entry.originalPlain);
                            return (
                              <li
                                key={eIdx}
                                className={`flex items-start gap-2.5 text-sm leading-relaxed text-neutral-300 ${
                                  entry.nested ? "pl-6 text-[13px] text-neutral-400" : ""
                                }`}
                              >
                                <span
                                  aria-hidden
                                  className={`mt-2 shrink-0 rounded-full ${
                                    entry.nested
                                      ? "h-1.5 w-1.5 border border-neutral-500 bg-transparent"
                                      : "h-1.5 w-1.5 bg-amber-500/80"
                                  }`}
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p>
                                    {ptFull
                                      ? renderFormattedLine(ptFull, highlight)
                                      : renderRuns(entry.block.runs, highlight)}
                                  </p>
                                  {ptFull && renderInlineLinksRow(entry.block.runs)}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}