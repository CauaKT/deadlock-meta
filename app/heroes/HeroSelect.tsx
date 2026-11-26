"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { TierKey } from "@/app/tiers";
import HeroGrainFilter from "@/components/ui/HeroGrainFilter";
import {
  DEADLOCK_UI_COLORS,
  HERO_TYPE_OPTIONS,
  PICK_SCREEN_ASSETS,
  PICK_SCREEN_SOUNDS,
} from "@/lib/data/config";
import type { HeroAbilityFull } from "@/lib/deadlock";
import AbilityBar from "./[id]/AbilityBar";

export interface SelectHero {
  id: number;
  name: string;
  searchName?: string;
  heroType?: string;
  rgb: [number, number, number];
  tagBg: string;
  tagText: string;
  titleColor?: string;
  card: string;
  bg: string;
  art: string;
  nameSvgs: string[];
  tags: string[];
  selectSounds?: string[];
  abilities: HeroAbilityFull[];
  matches: number;
  winRate: number | null;
  tier?: TierKey | null;
  released: boolean;
}

type SortKey = "name" | "name-desc" | "winrate-desc" | "winrate-asc" | "matches";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "name", label: "Nome (A–Z)" },
  { id: "name-desc", label: "Nome (Z–A)" },
  { id: "winrate-desc", label: "Winrate (maior pra menor)" },
  { id: "winrate-asc", label: "Winrate (menor pra maior)" },
  { id: "matches", label: "Número de partidas" },
];

const TAG_ROTATIONS = [
  "-rotate-[4deg] sm:-rotate-[5deg]",
  "rotate-[4deg] sm:rotate-[5deg]",
  "-rotate-[3deg] sm:-rotate-[4deg]",
];

const TICKS = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * Math.PI * 2;
  const r2 = i % 5 === 0 ? 592 : 577;
  return {
    x1: (Math.cos(a) * 560).toFixed(1),
    y1: (Math.sin(a) * 560).toFixed(1),
    x2: (Math.cos(a) * r2).toFixed(1),
    y2: (Math.sin(a) * r2).toFixed(1),
  };
});

function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function GameTexture({ rgb }: { rgb: [number, number, number] }) {
  const rgbStr = rgb.join(", ");
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="dl-select-ray-a" x1="1" y1="0" x2="0.15" y2="0.95">
            <stop offset="0%" stopColor={`rgb(${rgbStr})`} stopOpacity="0.14" />
            <stop offset="55%" stopColor="#6f9a93" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#6f9a93" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dl-select-ray-b" x1="0.85" y1="0" x2="0" y2="0.85">
            <stop offset="0%" stopColor="#e8f6f2" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#6f9a93" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="820,-60 1120,-60 440,860 220,860" fill="url(#dl-select-ray-a)" />
        <polygon points="560,-60 720,-60 110,860 -40,860" fill="url(#dl-select-ray-b)" />
        <g transform="translate(380 430)" fill="none" stroke="#6f9a93" strokeWidth="1.4">
          <g strokeOpacity=".34">
            {[140, 230, 330, 450, 560].map((r) => (
              <circle key={r} r={r} />
            ))}
          </g>
          <circle r="395" strokeOpacity=".45" strokeDasharray="2 10" />
          <g strokeOpacity=".42">
            {TICKS.map((t, i) => (
              <line key={i} {...t} />
            ))}
          </g>
          <g strokeOpacity=".24">
            <line x1="-620" y1="-220" x2="620" y2="260" />
            <line x1="-480" y1="360" x2="500" y2="-340" />
            <path d="M0 -280 L242 140 L-242 140 Z" />
          </g>
        </g>
      </svg>

      {/* Sigilo oficial do Deadlock integrado de forma discreta atrás do palco */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-1/2 z-[1] hidden h-[520px] w-[520px] -translate-y-1/2 opacity-[0.13] transition-colors duration-500 wide:block"
        style={{
          backgroundColor: `rgb(${rgbStr})`,
          WebkitMask: `url(${PICK_SCREEN_ASSETS.playSigil}) center / contain no-repeat`,
          mask: `url(${PICK_SCREEN_ASSETS.playSigil}) center / contain no-repeat`,
        }}
      />
    </>
  );
}

const subscribeSoundEnabled = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("lp-hero-sound-toggle", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("lp-hero-sound-toggle", cb);
    window.removeEventListener("storage", cb);
  };
};

const getSoundEnabledSnapshot = () => {
  try {
    return typeof window !== "undefined" && localStorage.getItem("lp_hero_select_sound") === "1";
  } catch {
    return false;
  }
};

const subscribeReducedMotion = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const getReducedMotionSnapshot = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function CardSoulFlame() {
  const uid = useId().replace(/:/g, "");
  const maskId = `dl-flame-mask-${uid}`;
  const fillId = `dl-flame-fill-${uid}`;
  const fxId = `dl-flame-fx-${uid}`;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-x-8 -top-28 -bottom-5 z-[15] overflow-visible"
    >
      <span
        className="absolute inset-x-0 top-8 -bottom-2 rounded-full opacity-95 mix-blend-screen blur-[14px]"
        style={{
          background:
            "radial-gradient(ellipse 62% 66% at 50% 56%, rgba(30, 255, 182, 0.82) 0%, rgba(16, 218, 150, 0.45) 42%, rgba(8, 168, 118, 0.12) 64%, transparent 74%)",
        }}
      />
      <span
        className="absolute inset-x-2 -top-2 bottom-16 rotate-[10deg] rounded-full opacity-90 mix-blend-screen blur-[15px]"
        style={{
          background:
            "radial-gradient(ellipse 56% 70% at 62% 58%, rgba(68, 255, 200, 0.68) 0%, rgba(18, 215, 154, 0.32) 48%, transparent 74%)",
        }}
      />
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} x1="0.35" y1="1" x2="0.72" y2="0">
            <stop offset="0%" stopColor="#4bf5c4" stopOpacity="0.95" />
            <stop offset="42%" stopColor="#9bffe5" stopOpacity="1" />
            <stop offset="86%" stopColor="#d2fff3" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#d2fff3" stopOpacity="0" />
          </linearGradient>

          <filter
            id={fxId}
            x="-55%"
            y="-45%"
            width="210%"
            height="190%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.023 0.015"
              numOctaves="2"
              seed="11"
              result="warpRaw"
            />
            <feOffset in="warpRaw" dx="0" dy="0" result="warp">
              {!reducedMotion && (
                <>
                  <animate
                    attributeName="dy"
                    values="0;-36;-12;-54;0"
                    dur="3.9s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="dx"
                    values="0;12;-10;8;0"
                    dur="4.7s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </feOffset>
            <feDisplacementMap
              in="SourceGraphic"
              in2="warp"
              scale="28"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            >
              {!reducedMotion && (
                <animate
                  attributeName="scale"
                  values="24;34;21;31;24"
                  dur="3.3s"
                  repeatCount="indefinite"
                />
              )}
            </feDisplacementMap>
            <feGaussianBlur in="displaced" stdDeviation="16" result="outerBlur" />
            <feColorMatrix
              in="outerBlur"
              type="matrix"
              values="0 0 0 0 0.06  0 0 0 0 0.94  0 0 0 0 0.62  0 0 0 1.05 0"
              result="smokeGlow"
            />
            <feGaussianBlur in="displaced" stdDeviation="5.5" result="innerBlur" />
            <feColorMatrix
              in="innerBlur"
              type="matrix"
              values="0 0 0 0 0.16  0 0 0 0 0.98  0 0 0 0 0.72  0 0 0 1.15 0"
              result="emeraldGlow"
            />
            <feMerge>
              <feMergeNode in="smokeGlow" />
              <feMergeNode in="emeraldGlow" />
              <feMergeNode in="displaced" />
            </feMerge>
          </filter>

          <mask id={maskId} maskUnits="userSpaceOnUse" x="-40" y="-30" width="280" height="350">
            <rect x="-40" y="-30" width="280" height="350" fill="black" />
            <path
              d="M60 264 C50 226 54 182 68 146 C80 114 96 84 112 54 C122 34 132 16 142 6 C148 24 150 52 152 82 C156 114 160 148 154 188 C149 224 142 248 130 260 C108 270 78 270 60 264 Z"
              fill="white"
            />
            {reducedMotion ? (
              <>
                <ellipse cx="66" cy="70" rx="28" ry="38" transform="rotate(-14 66 70)" fill="black" />
                <ellipse cx="154" cy="82" rx="26" ry="34" transform="rotate(24 154 82)" fill="black" />
                <ellipse cx="120" cy="30" rx="22" ry="11" transform="rotate(-22 120 30)" fill="black" />
                <ellipse cx="114" cy="112" rx="10" ry="17" transform="rotate(20 114 112)" fill="black" />
                <circle cx="144" cy="22" r="4" fill="white" />
                <circle cx="158" cy="46" r="3" fill="white" />
              </>
            ) : (
              <>
                <g>
                  <ellipse cx="56" cy="0" rx="28" ry="38" transform="rotate(-12 56 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 175"
                    to="44 -40"
                    dur="1.73s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <ellipse cx="76" cy="0" rx="22" ry="32" transform="rotate(-18 76 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 165"
                    to="44 -45"
                    dur="2.11s"
                    begin="-0.9s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <ellipse cx="156" cy="0" rx="28" ry="42" transform="rotate(24 156 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 170"
                    to="34 -45"
                    dur="1.47s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <ellipse cx="136" cy="0" rx="22" ry="30" transform="rotate(30 136 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 155"
                    to="34 -45"
                    dur="1.89s"
                    begin="-0.7s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <ellipse cx="114" cy="0" rx="22" ry="11" transform="rotate(-22 114 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 120"
                    to="28 -38"
                    dur="1.29s"
                    begin="-0.4s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <ellipse cx="108" cy="0" rx="10" ry="17" transform="rotate(20 108 0)" fill="black" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 185"
                    to="32 25"
                    dur="2.37s"
                    begin="-1.1s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <path d="M128 0 L139 -10 L143 4 L132 7 Z" fill="white" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 88"
                    to="22 -22"
                    dur="1.31s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <path d="M148 0 L158 -7 L160 5 Z" fill="white" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 108"
                    to="26 2"
                    dur="1.67s"
                    begin="-0.6s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <path d="M96 0 L104 -8 L108 3 Z" fill="white" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 90"
                    to="20 -16"
                    dur="1.93s"
                    begin="-1.1s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <circle cx="142" cy="0" r="3" fill="white" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 74"
                    to="22 -24"
                    dur="1.19s"
                    begin="-0.3s"
                    repeatCount="indefinite"
                  />
                </g>
                <g>
                  <circle cx="118" cy="0" r="2.2" fill="white" />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 62"
                    to="18 -26"
                    dur="1.51s"
                    begin="-0.85s"
                    repeatCount="indefinite"
                  />
                </g>
              </>
            )}
          </mask>
        </defs>

        <g filter={`url(#${fxId})`}>
          <g className="lp-flame-sway" mask={`url(#${maskId})`}>
            <rect x="-40" y="-30" width="280" height="350" fill={`url(#${fillId})`} />
          </g>
        </g>
      </svg>
    </span>
  );
}

function ViewHeroButton({
  heroId,
  onClick,
  className = "",
}: {
  heroId: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={`/heroes/${heroId}`}
      onClick={onClick}
      className={`group relative shrink-0 items-center justify-center font-deadlock font-black uppercase tracking-wider text-[#f0e1cb] transition-all duration-200 hover:scale-[1.03] hover:text-amber-200 active:scale-[0.98] ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#0d1210]/95 transition-colors duration-200 group-hover:bg-[#1e170d]/95"
        style={{
          WebkitMask: `url(${PICK_SCREEN_ASSETS.playBoxFill}) center / 100% 100% no-repeat`,
          mask: `url(${PICK_SCREEN_ASSETS.playBoxFill}) center / 100% 100% no-repeat`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#5f7a76] transition-colors duration-200 group-hover:bg-amber-400"
        style={{
          WebkitMask: `url(${PICK_SCREEN_ASSETS.playBox}) center / 100% 100% no-repeat`,
          mask: `url(${PICK_SCREEN_ASSETS.playBox}) center / 100% 100% no-repeat`,
        }}
      />
      <span className="relative z-10">Ver herói</span>
    </Link>
  );
}

export default function HeroSelect({ heroes }: { heroes: SelectHero[] }) {
  const [activeId, setActiveId] = useState<number | null>(heroes[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [showUnreleased, setShowUnreleased] = useState(false);
  const [heroTypeFilter, setHeroTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [nameFails, setNameFails] = useState<Record<number, number>>({});
  const [pop, setPop] = useState<{
    slot: number;
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    maxH: number;
  } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchQueryRef = useRef(searchQuery);
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const parallaxTargetRef = useRef(0);
  const parallaxCurrentRef = useRef(0);
  const parallaxRafRef = useRef<number | null>(null);
  const [heroShift, setHeroShift] = useState(0);
  const soundOn = useSyncExternalStore(subscribeSoundEnabled, getSoundEnabledSnapshot, () => false);
  const lastHoverSoundAtRef = useRef(0);
  const voAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const playClip = useCallback((url: string, volume: number) => {
    if (typeof window === "undefined") return;
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      void audio.play().catch(() => {});
    } catch {}
  }, []);

  const playCardHoverSound = useCallback(() => {
    if (!soundOn) return;
    const now = performance.now();
    if (now - lastHoverSoundAtRef.current < 65) return;
    lastHoverSoundAtRef.current = now;
    const list = PICK_SCREEN_SOUNDS.cardHovers;
    playClip(list[Math.floor(Math.random() * list.length)], 0.22);
  }, [playClip, soundOn]);

  const playHeroPickSound = useCallback(
    (hero: SelectHero) => {
      if (!soundOn) return;
      playClip(PICK_SCREEN_SOUNDS.select, 0.3);
      const lines = hero.selectSounds;
      if (!lines || lines.length === 0) return;
      try {
        voAudioRef.current?.pause();
        const vo = new Audio(lines[Math.floor(Math.random() * lines.length)]);
        vo.volume = 0.45;
        voAudioRef.current = vo;
        void vo.play().catch(() => {});
      } catch {}
    },
    [playClip, soundOn],
  );

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    try {
      localStorage.setItem("lp_hero_select_sound", next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event("lp-hero-sound-toggle"));
    if (next) {
      const enters = PICK_SCREEN_SOUNDS.enterVariants;
      playClip(enters[Math.floor(Math.random() * enters.length)], 0.28);
    } else {
      voAudioRef.current?.pause();
    }
  }, [playClip, soundOn]);

  useEffect(() => {
    return () => {
      voAudioRef.current?.pause();
    };
  }, []);

  const startParallaxLoop = useCallback(() => {
    if (parallaxRafRef.current !== null) return;
    const step = () => {
      const el = parallaxRef.current;
      if (!el) {
        parallaxRafRef.current = null;
        return;
      }
      const target = parallaxTargetRef.current;
      const next = parallaxCurrentRef.current + (target - parallaxCurrentRef.current) * 0.08;
      if (Math.abs(target - next) < 0.04) {
        parallaxCurrentRef.current = target;
        el.style.transform = `translate3d(${target.toFixed(2)}px, 0, 0)`;
        parallaxRafRef.current = null;
        return;
      }
      parallaxCurrentRef.current = next;
      el.style.transform = `translate3d(${next.toFixed(2)}px, 0, 0)`;
      parallaxRafRef.current = requestAnimationFrame(step);
    };
    parallaxRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (parallaxRafRef.current !== null) cancelAnimationFrame(parallaxRafRef.current);
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (parallaxTargetRef.current === 0) return;
    parallaxTargetRef.current = 0;
    startParallaxLoop();
  }, [startParallaxLoop]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const vw = window.innerWidth;
      if (vw <= 0) return;
      const normX = (e.clientX / vw - 0.5) * 2;
      parallaxTargetRef.current = Math.max(-3, Math.min(3, normX * 3));
      startParallaxLoop();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", handleMouseLeave);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", handleMouseLeave);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave, startParallaxLoop]);

  // Digitação direta na tela alimenta a pesquisa automaticamente (como no jogo oficial)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Backspace") {
        if (searchQueryRef.current.length > 0) {
          e.preventDefault();
          setSearchQuery((q) => q.slice(0, -1));
        }
        return;
      }
      if (e.key === "Escape" && searchQueryRef.current.length > 0 && !filterOpen && !pop) {
        e.preventDefault();
        setSearchQuery("");
        return;
      }
      if (e.key.length === 1) {
        if (e.key === " " && searchQueryRef.current.length === 0) return;
        e.preventDefault();
        setSearchQuery((q) => q + e.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filterOpen, pop]);

  useEffect(() => {
    if (!pop) return;
    const close = () => setPop(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || rowRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close);
    };
  }, [pop]);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFilterOpen(false);
        if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuBack, 0.22);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [filterOpen, playClip, soundOn]);

  const updateHeroShift = useCallback(() => {
    const sec = sectionRef.current;
    const panel = panelRef.current;
    const grid = gridRef.current;
    const img = heroImgRef.current;
    if (!sec || !panel || !grid || !img) return;

    const secRect = sec.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const sideBySide = secRect.width > 0 && panelRect.width < secRect.width * 0.72;

    if (!sideBySide) {
      setHeroShift((prev) => (prev === 0 ? prev : 0));
      return;
    }

    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    const renderedW = secRect.height * (natW / natH);
    const baseLeft = secRect.right - renderedW;
    // Garante que a borda esquerda da arte não seja invadida pela grade quando o personagem avança
    const overlap = Math.max(0, gridRect.right + 16 - baseLeft);
    const baseTranslate = secRect.width * 0.015;
    const extraPush = Math.min(renderedW * 0.25, secRect.width * 0.16, overlap * 0.9);
    const nextShift = Math.round(baseTranslate + extraPush);

    setHeroShift((prev) => (prev === nextShift ? prev : nextShift));
  }, []);

  useEffect(() => {
    updateHeroShift();
    const sec = sectionRef.current;
    const panel = panelRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeroShift) : null;
    if (ro && sec) ro.observe(sec);
    if (ro && panel) ro.observe(panel);
    window.addEventListener("resize", updateHeroShift);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateHeroShift);
    };
  }, [activeId, showUnreleased, heroTypeFilter, sort, updateHeroShift]);

  const openAbility = (slot: number, el: HTMLElement) => {
    if (pop?.slot === slot) return setPop(null);
    const r = el.getBoundingClientRect();
    const secRect = sectionRef.current?.getBoundingClientRect();
    const boundsLeft = Math.max(8, Math.round((secRect?.left ?? 0) + 8));
    const boundsRight = Math.min(
      window.innerWidth - 8,
      Math.round((secRect?.right ?? window.innerWidth) - 8),
    );
    const availW = Math.max(260, boundsRight - boundsLeft);
    const width = Math.min(544, availW);
    const left = Math.round(
      Math.min(
        Math.max(r.left + r.width / 2 - width / 2, boundsLeft),
        boundsRight - width,
      ),
    );
    const spaceAbove = r.top - 16;
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const openBelow = spaceAbove < 260 && spaceBelow > spaceAbove;
    setPop({
      slot,
      left,
      width,
      ...(openBelow
        ? {
            top: Math.round(r.bottom + 12),
            maxH: Math.max(Math.round(spaceBelow - 12), 180),
          }
        : {
            bottom: Math.round(window.innerHeight - r.top + 12),
            maxH: Math.max(Math.round(spaceAbove - 12), 200),
          }),
    });
  };

  const visible = useMemo(() => {
    return heroes
      .filter((h) => {
        if (!showUnreleased && !h.released) return false;
        if (heroTypeFilter !== "all" && h.heroType !== heroTypeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name, "pt-BR");
        if (sort === "name") return byName;
        if (sort === "name-desc") return -byName;
        if (sort === "matches") return b.matches - a.matches || byName;
        // Winrate: heróis sem amostra mínima (null) ficam sempre no final
        if (a.winRate === null || b.winRate === null) {
          return (a.winRate === null ? 1 : 0) - (b.winRate === null ? 1 : 0) || byName;
        }
        return (sort === "winrate-asc" ? a.winRate - b.winRate : b.winRate - a.winRate) || byName;
      });
  }, [heroes, showUnreleased, heroTypeFilter, sort]);

  const normalizedQuery = normalizeSearch(searchQuery);
  const matchedIds = useMemo(() => {
    if (!normalizedQuery) return null;
    const set = new Set<number>();
    for (const h of visible) {
      const hay = normalizeSearch(`${h.name} ${h.searchName ?? ""}`);
      if (hay.includes(normalizedQuery)) {
        set.add(h.id);
      }
    }
    return set;
  }, [visible, normalizedQuery]);

  const active = visible.find((h) => h.id === activeId) ?? visible[0];
  if (!active) return null;

  const color = `rgb(${active.rgb.join(", ")})`;
  const circleBg = color;
  const iconColor = "#070908";
  const nameFail = nameFails[active.id] ?? 0;
  const flameHeroId = hoveredId ?? active.id;
  const showCardWinRate = sort === "winrate-desc" || sort === "winrate-asc";
  const showCardMatches = sort === "matches";
  const hasActiveFilters = showUnreleased || sort !== "name" || heroTypeFilter !== "all";

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh select-none flex-col overflow-hidden bg-[#070807] wide:h-svh"
    >
      {/* Palco A1: textura oficial de ardósia + fumaça + atmosfera dinâmica na cor do herói */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={PICK_SCREEN_ASSETS.slateTexture}
          alt=""
          className="h-full w-full object-cover opacity-35"
        />
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `
              radial-gradient(ellipse 56% 78% at 76% 52%, rgba(${active.rgb.join(", ")}, 0.24) 0%, rgba(${active.rgb.join(", ")}, 0.08) 44%, transparent 76%),
              radial-gradient(ellipse 50% 70% at 24% 48%, rgba(${active.rgb.join(", ")}, 0.07) 0%, transparent 72%),
              linear-gradient(135deg, rgba(10, 14, 13, 0.72) 0%, rgba(7, 8, 7, 0.5) 55%, rgba(7, 8, 7, 0.85) 100%)
            `,
          }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-screen"
      >
        <img src={PICK_SCREEN_ASSETS.smokeBg} alt="" className="h-full w-full object-cover" />
      </div>

      <GameTexture rgb={active.rgb} />

      {/* Névoa temática + anéis astrológicos atrás da arte do herói (ativo em todas as telas) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        style={{ "--hc": active.rgb.join(" ") } as CSSProperties}
      >
        <svg
          viewBox="0 0 400 400"
          className="absolute left-1/2 top-[22%] h-[360px] w-[360px] -translate-x-1/2 opacity-40 sm:left-auto sm:right-[6%] sm:top-[46%] sm:h-[460px] sm:w-[460px] sm:translate-x-0 sm:-translate-y-1/2 wide:right-[7%] wide:top-[48%] wide:h-[540px] wide:w-[540px]"
        >
          <g className="lp-spin-slow" style={{ transformOrigin: "200px 200px" }}>
            <circle
              cx="200"
              cy="200"
              r="176"
              fill="none"
              stroke={`rgba(${active.rgb.join(", ")}, 0.34)`}
              strokeWidth="1"
              strokeDasharray="3 10"
            />
            <circle
              cx="200"
              cy="200"
              r="152"
              fill="none"
              stroke={`rgba(${active.rgb.join(", ")}, 0.18)`}
              strokeWidth="1.2"
              strokeDasharray="46 22 10 22"
            />
          </g>
          <g className="lp-spin-reverse" style={{ transformOrigin: "200px 200px" }}>
            <circle
              cx="200"
              cy="200"
              r="122"
              fill="none"
              stroke="#6f9a93"
              strokeOpacity="0.24"
              strokeWidth="1"
              strokeDasharray="16 14"
            />
            <path
              d="M200 66 L200 84 M200 316 L200 334 M66 200 L84 200 M316 200 L334 200"
              stroke={`rgba(${active.rgb.join(", ")}, 0.45)`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </svg>

        <div className="pf-smoke absolute inset-0 opacity-60">
          <i
            className="hero-tip-puff hero-tip-puff-a"
            style={{ width: "36%", maxWidth: 420, left: "44%", top: "14%", opacity: 0.45 }}
          />
          <i
            className="hero-tip-puff hero-tip-puff-b"
            style={{ width: "38%", maxWidth: 440, left: "58%", right: "auto", bottom: "-14%", opacity: 0.5 }}
          />
          <i
            className="hero-tip-puff hero-tip-puff-c"
            style={{ width: "52%", maxWidth: 560, left: "auto", right: "-6%", top: "-18%", opacity: 0.8 }}
          />
        </div>

        {[
          { right: "14%", top: "24%", size: 4, delay: "0s", dur: "5.2s" },
          { right: "26%", top: "48%", size: 3, delay: "-1.6s", dur: "6.1s" },
          { right: "8%", top: "64%", size: 5, delay: "-3.1s", dur: "5.8s" },
          { right: "32%", top: "74%", size: 3, delay: "-2.3s", dur: "4.9s" },
          { right: "19%", top: "82%", size: 4, delay: "-4.0s", dur: "6.4s" },
        ].map((m, idx) => (
          <span
            key={idx}
            className="lp-mote-float absolute rounded-full"
            style={{
              right: m.right,
              top: m.top,
              width: m.size,
              height: m.size,
              backgroundColor: `rgb(${active.rgb.join(", ")})`,
              boxShadow: `0 0 10px rgb(${active.rgb.join(", ")})`,
              animationDelay: m.delay,
              animationDuration: m.dur,
            }}
          />
        ))}
      </div>

      {/* Vinheta radial sutil só nas bordas externas sem apagar o herói */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_50%,transparent_48%,rgba(7,8,7,0.72)_100%)]"
      />

      {/* Granulação fina sobre o palco */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[18] opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: `url(${PICK_SCREEN_ASSETS.grain})`,
          backgroundRepeat: "repeat",
          backgroundSize: "380px 380px",
        }}
      />

      {/* PAINEL ESQUERDO (Cabeçalho + Grade de Cards + Botão Ver Herói) */}
      <div
        ref={panelRef}
        className="relative z-30 flex min-h-0 flex-col p-4 md:p-6 lg:px-8 lg:py-6 wide:h-full wide:w-[45%] wide:max-w-[820px] min-[2100px]:w-[46%] min-[2100px]:max-w-[1080px] min-[2100px]:px-10 min-[2100px]:py-8"
      >
        {/* Cabeçalho z-40 sempre acima da grade e da chama */}
        <div className="relative z-40 mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-oracle text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6d8a85] min-[2100px]:text-xs">
              Deadlock
            </p>
            <h1 className="font-deadlock text-4xl font-black uppercase leading-none tracking-tight text-[#6d8a85] sm:text-5xl xl:text-[54px] min-[2100px]:text-6xl">
              Heróis
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial min-[2100px]:gap-2.5">
            {/* Caixa de Pesquisa à esquerda do botão de som */}
            <div className="group relative flex h-10 w-full max-w-[210px] items-center gap-2 rounded-[5px] border border-neutral-700/80 bg-[#0a0e0d]/95 px-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 focus-within:border-amber-500 focus-within:shadow-[0_0_18px_rgba(245,158,11,0.25)] focus-within:ring-1 focus-within:ring-amber-500/40 sm:w-48 min-[2100px]:h-11 min-[2100px]:w-64 min-[2100px]:max-w-none">
              <span
                aria-hidden
                className={`block h-4 w-4 shrink-0 transition-colors ${
                  searchQuery ? "bg-amber-400" : "bg-neutral-400 group-focus-within:bg-amber-400"
                }`}
                style={{
                  WebkitMask: `url(${PICK_SCREEN_ASSETS.searchIcon}) center / contain no-repeat`,
                  mask: `url(${PICK_SCREEN_ASSETS.searchIcon}) center / contain no-repeat`,
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar..."
                aria-label="Pesquisar herói"
                className="min-w-0 flex-1 bg-transparent font-deadlock text-xs font-bold uppercase tracking-wider text-[#f4efe6] placeholder:text-neutral-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Limpar pesquisa"
                  aria-label="Limpar pesquisa"
                  className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:text-amber-300"
                >
                  <span
                    aria-hidden
                    className="block h-3.5 w-3.5 bg-current"
                    style={{
                      WebkitMask: `url(${PICK_SCREEN_ASSETS.clearIcon}) center / contain no-repeat`,
                      mask: `url(${PICK_SCREEN_ASSETS.clearIcon}) center / contain no-repeat`,
                    }}
                  />
                </button>
              )}
            </div>

            {/* Botão de Som */}
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              title={soundOn ? "Desativar som da seleção" : "Ativar som da seleção"}
              aria-label={soundOn ? "Desativar som da seleção" : "Ativar som da seleção"}
              className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border bg-[#0a0e0d]/95 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400/70 min-[2100px]:h-11 min-[2100px]:w-11 ${
                soundOn
                  ? "border-emerald-400/70 bg-emerald-500/15 text-[#a8ffc9] shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                  : "border-neutral-700/80 text-neutral-400 hover:border-amber-500/70 hover:text-[#f4efe6]"
              }`}
            >
              <span
                aria-hidden
                className="block h-4 w-4"
                style={{
                  backgroundColor: "currentColor",
                  WebkitMask: `url(${soundOn ? PICK_SCREEN_ASSETS.soundOnIcon : PICK_SCREEN_ASSETS.soundOffIcon}) center / contain no-repeat`,
                  mask: `url(${soundOn ? PICK_SCREEN_ASSETS.soundOnIcon : PICK_SCREEN_ASSETS.soundOffIcon}) center / contain no-repeat`,
                }}
              />
            </button>

            {/* Botão e Popover de Filtros no padrão LockPro */}
            <div ref={filterRef} className="relative shrink-0">
              <button
                type="button"
                title="Filtros e Ordenação"
                aria-label="Filtros e Ordenação"
                aria-haspopup="true"
                aria-expanded={filterOpen}
                onClick={() => {
                  const next = !filterOpen;
                  setFilterOpen(next);
                  if (soundOn) {
                    playClip(next ? PICK_SCREEN_SOUNDS.menuActivate : PICK_SCREEN_SOUNDS.menuBack, 0.22);
                  }
                }}
                className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[5px] border bg-[#0a0e0d]/95 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400/70 min-[2100px]:h-11 min-[2100px]:w-11 ${
                  filterOpen
                    ? "border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50"
                    : hasActiveFilters
                      ? "border-amber-500/70 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700/80 text-neutral-300 hover:border-amber-500/70 hover:text-[#f4efe6]"
                }`}
              >
                <span
                  aria-hidden
                  className="block h-4 w-4 bg-current"
                  style={{
                    WebkitMask: `url(${PICK_SCREEN_ASSETS.filterIcon}) center / contain no-repeat`,
                    mask: `url(${PICK_SCREEN_ASSETS.filterIcon}) center / contain no-repeat`,
                  }}
                />
                {hasActiveFilters && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#070807] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                  />
                )}
              </button>

              {filterOpen && (
                <div
                  role="dialog"
                  aria-label="Filtros e Ordenação"
                  className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-[6px] border border-neutral-800/90 bg-neutral-950/95 p-3 text-[#f4efe6] shadow-[0_20px_45px_rgba(0,0,0,0.9)] backdrop-blur-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-deadlock text-[11px] font-black uppercase tracking-widest text-amber-400">
                      Ordenar por
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setSort("name");
                          setHeroTypeFilter("all");
                          setShowUnreleased(false);
                          if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuHover, 0.2);
                        }}
                        className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-amber-300"
                      >
                        Resetar
                      </button>
                    )}
                  </div>

                  <div role="radiogroup" className="space-y-1">
                    {SORT_OPTIONS.map((o) => {
                      const activeSort = sort === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={activeSort}
                          onMouseEnter={() => {
                            if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuHover, 0.14);
                          }}
                          onClick={() => {
                            setSort(o.id);
                            if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuActivate, 0.2);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[4px] border px-2.5 py-1.5 text-left font-deadlock text-xs font-black uppercase tracking-wider transition-colors ${
                            activeSort
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-transparent text-neutral-300 hover:bg-neutral-800/70 hover:text-[#f4efe6]"
                          }`}
                        >
                          <span>{o.label}</span>
                          {activeSort && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <img
                    src={PICK_SCREEN_ASSETS.linebreak}
                    alt=""
                    aria-hidden
                    className="my-3 h-2 w-full object-contain opacity-35"
                  />

                  <p className="mb-2 font-deadlock text-[11px] font-black uppercase tracking-widest text-amber-400">
                    Classe (Hero Type)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHeroTypeFilter("all");
                        if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuActivate, 0.18);
                      }}
                      className={`cursor-pointer rounded-[4px] border px-2 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors ${
                        heroTypeFilter === "all"
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                          : "border-neutral-800 bg-[#0a0e0d] text-neutral-400 hover:border-neutral-600 hover:text-[#f4efe6]"
                      }`}
                    >
                      Todas
                    </button>
                    {HERO_TYPE_OPTIONS.map((opt) => {
                      const activeType = heroTypeFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setHeroTypeFilter((cur) => (cur === opt.id ? "all" : opt.id));
                            if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuActivate, 0.18);
                          }}
                          className={`cursor-pointer rounded-[4px] border px-2 py-1 font-deadlock text-[10px] font-black uppercase tracking-wider transition-colors ${
                            activeType
                              ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                              : "border-neutral-800 bg-[#0a0e0d] text-neutral-400 hover:border-neutral-600 hover:text-[#f4efe6]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <img
                    src={PICK_SCREEN_ASSETS.linebreak}
                    alt=""
                    aria-hidden
                    className="my-3 h-2 w-full object-contain opacity-35"
                  />

                  <p className="mb-2 font-deadlock text-[11px] font-black uppercase tracking-widest text-amber-400">
                    Exibição
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showUnreleased}
                    onClick={() => {
                      setShowUnreleased((v) => !v);
                      if (soundOn) playClip(PICK_SCREEN_SOUNDS.menuActivate, 0.2);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[4px] border px-2.5 py-2 text-left transition-colors ${
                      showUnreleased
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        : "border-neutral-800 bg-[#0a0e0d] text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <span className="font-deadlock text-xs font-black uppercase tracking-wider">
                      Mostrar não lançados
                    </span>
                    <span
                      aria-hidden
                      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                        showUnreleased ? "bg-amber-500" : "bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-black transition-transform ${
                          showUnreleased ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grade de Heróis (z-10, sempre abaixo do cabeçalho z-40) */}
        <div className="relative z-10 -mx-3.5 -mt-12 min-h-0 flex-1 px-1 wide:-mx-[54px] wide:px-11 wide:overflow-y-auto lp-scroll">
          <div
            ref={gridRef}
            onMouseLeave={() => setHoveredId(null)}
            className="grid grid-cols-5 gap-1.5 px-5 pt-16 pb-5 sm:grid-cols-7 sm:gap-2 md:grid-cols-9 lg:grid-cols-11 wide:grid-cols-8 lg:gap-2 lg:px-6 lg:pt-20 lg:pb-6 min-[2100px]:grid-cols-9 min-[2100px]:gap-2.5 min-[2100px]:pt-22"
          >
            {visible.map((hero) => {
              const isActive = hero.id === active.id;
              const isHovered = hero.id === hoveredId;
              const showFlame = hero.id === flameHeroId;
              const lit = isActive || isHovered;
              const isSearchDimmed = matchedIds !== null && !matchedIds.has(hero.id);
              const isSearchHit = matchedIds !== null && matchedIds.has(hero.id);

              return (
                <div
                  key={hero.id}
                  className={`relative aspect-[2/3] transition-opacity duration-150 ${
                    isHovered ? "z-30" : isActive ? "z-20" : "z-0"
                  } ${isSearchDimmed ? "opacity-20 saturate-0 brightness-50" : "opacity-100"}`}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-4 -z-10 bg-[radial-gradient(closest-side,rgba(7,8,7,0.75)_0%,rgba(7,8,7,0.45)_65%,transparent_100%)]"
                  />
                  {showFlame && !isSearchDimmed && <CardSoulFlame />}
                  <div
                    className={`absolute inset-0 ${showFlame && !isSearchDimmed ? "lp-card-sway z-20" : "z-0"}`}
                    style={
                      showFlame && !isSearchDimmed
                        ? { animationDirection: hero.id % 2 === 0 ? "normal" : "reverse" }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onMouseEnter={() => {
                        setHoveredId(hero.id);
                        playCardHoverSound();
                      }}
                      onFocus={() => setHoveredId(hero.id)}
                      onBlur={() => setHoveredId((cur) => (cur === hero.id ? null : cur))}
                      onClick={() => {
                        setActiveId(hero.id);
                        playHeroPickSound(hero);
                      }}
                      aria-label={hero.name}
                      aria-pressed={isActive}
                      className={`relative block h-full w-full cursor-pointer overflow-hidden bg-[#0c0f0e] outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/70 ${
                        showFlame && !isSearchDimmed
                          ? "z-20"
                          : isActive
                            ? "z-20 ring-1 ring-[#69e799]/60"
                            : isSearchHit
                              ? "z-10 border border-amber-400/70 brightness-105"
                              : "z-0 border border-neutral-800/70 brightness-[.65] saturate-[.65] hover:brightness-95"
                      }`}
                      style={
                        lit && !isSearchDimmed
                          ? {
                              boxShadow: showFlame
                                ? `0 0 24px ${DEADLOCK_UI_COLORS.deadlockGreen}b8, 0 0 46px ${DEADLOCK_UI_COLORS.soulColor}66, 0 8px 18px rgba(0, 0, 0, 0.85)`
                                : `0 0 14px ${DEADLOCK_UI_COLORS.deadlockGreen}66, 0 4px 12px rgba(0, 0, 0, 0.8)`,
                            }
                          : undefined
                      }
                    >
                      {hero.bg && (
                        <Image
                          src={hero.bg}
                          alt=""
                          fill
                          sizes="96px"
                          draggable={false}
                          className="object-cover"
                        />
                      )}
                      {hero.card ? (
                        <img
                          src={hero.card}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className={`absolute inset-0 h-full w-full object-cover object-top ${
                            !hero.released ? "opacity-75 saturate-75" : ""
                          }`}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-extrabold text-neutral-500">
                          {hero.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}

                      {/* Moldura oficial do jogo (A3) quando selecionado/em hover */}
                      {(showFlame || isActive) && !isSearchDimmed && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -inset-[1px] z-[6] block"
                          style={{
                            backgroundColor: showFlame
                              ? DEADLOCK_UI_COLORS.offWhite
                              : DEADLOCK_UI_COLORS.deadlockGreen,
                            WebkitMask: `url(${PICK_SCREEN_ASSETS.cardBorder}) center / 100% 100% no-repeat`,
                            mask: `url(${PICK_SCREEN_ASSETS.cardBorder}) center / 100% 100% no-repeat`,
                          }}
                        />
                      )}

                      {/* Badge de Winrate ou Partidas no mesmo estilo de TierHeroCard */}
                      {(showCardWinRate || showCardMatches) && (
                        <span
                          className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-[radial-gradient(ellipse_75%_95%_at_50%_100%,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.6)_58%,transparent_100%)] pt-3 pb-0.5 text-center font-deadlock text-[10px] font-black leading-none sm:text-[11px] [paint-order:stroke_fill] [-webkit-text-stroke:2px_rgba(0,0,0,0.92)] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_6px_rgba(0,0,0,0.9)] ${
                            showCardWinRate
                              ? hero.winRate === null
                                ? "text-neutral-400"
                                : hero.winRate >= 50
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              : "text-amber-300"
                          }`}
                        >
                          {showCardWinRate
                            ? hero.winRate !== null
                              ? `${hero.winRate.toFixed(1)}%`
                              : "—"
                            : hero.matches >= 1000
                              ? `${(hero.matches / 1000).toFixed(1)}k`
                              : String(hero.matches)}
                        </span>
                      )}

                      {!hero.released && (
                        <>
                          <span className="pointer-events-none absolute left-1 top-1 z-[7] rounded-[2px] bg-[#2b7047]/95 px-1 py-0.5 font-oracle text-[8px] font-semibold uppercase tracking-wider text-[#a8ffc9]">
                            Novo
                          </span>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute bottom-1 right-1 z-[7] block h-3.5 w-3.5 opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                            style={{
                              backgroundColor: DEADLOCK_UI_COLORS.offWhite,
                              WebkitMask: `url(${PICK_SCREEN_ASSETS.lockIcon}) center / contain no-repeat`,
                              mask: `url(${PICK_SCREEN_ASSETS.lockIcon}) center / contain no-repeat`,
                            }}
                          />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {normalizedQuery && matchedIds?.size === 0 && (
            <p className="px-6 pb-3 text-center text-xs font-semibold text-neutral-400">
              Nenhum herói encontrado para &ldquo;{searchQuery.trim()}&rdquo;. Pressione ESC para limpar.
            </p>
          )}
        </div>

        <ViewHeroButton
          heroId={active.id}
          onClick={() => {
            if (soundOn) playClip(PICK_SCREEN_SOUNDS.play, 0.3);
          }}
          className="relative z-20 mt-3 hidden self-center px-16 py-3 text-2xl wide:inline-flex sm:px-20 sm:text-3xl min-[2100px]:mt-4 min-[2100px]:px-24 min-[2100px]:py-3.5 min-[2100px]:text-[32px]"
        />
      </div>

      {/* PAINEL DIREITO (Arte do Herói 100% opaca + Animação da direita para a esquerda + Info) */}
      <div className="relative mt-2 w-full flex-1 overflow-visible sm:flex sm:min-h-[390px] sm:items-center md:min-h-[420px] wide:pointer-events-none wide:absolute wide:inset-0 wide:mt-0 wide:block wide:h-auto wide:min-h-0 wide:flex-none">
        <div
          className="pointer-events-none relative z-[2] h-[310px] w-full transition-transform duration-200 sm:absolute sm:-top-12 sm:right-0 sm:bottom-0 sm:left-0 sm:h-auto md:-top-16 wide:inset-0 wide:h-full"
          style={heroShift ? { transform: `translateX(${heroShift}px)` } : undefined}
        >
          <div ref={parallaxRef} className="h-full w-full">
            <div key={`slide-${active.id}`} className="lp-hero-slide-in h-full w-full">
              <img
                ref={heroImgRef}
                key={active.id}
                src={active.art}
                alt={active.name}
                draggable={false}
                onLoad={updateHeroShift}
                style={{ filter: "url(#dl-hero-grain)" }}
                className="hero-select-art-mask h-full w-full object-cover object-top sm:absolute sm:top-0 sm:-right-2 sm:h-full sm:w-auto sm:max-w-none"
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 -mt-8 flex flex-col items-center px-4 pb-6 sm:mt-0 sm:w-[58%] sm:items-start sm:p-8 md:w-[56%] md:p-10 wide:pointer-events-none wide:absolute wide:bottom-8 wide:right-10 wide:w-auto wide:origin-bottom-right wide:scale-110 wide:items-center wide:p-0 wide:2xl:scale-125">
          <div className="mb-3.5 flex h-[84px] w-[240px] items-end justify-center sm:h-[104px] sm:w-[290px] sm:justify-start md:mb-4 md:h-[120px] md:w-[350px] wide:mb-5 wide:block wide:h-auto wide:w-auto">
            {nameFail >= active.nameSvgs.length ? (
              <span
                style={{ color: active.titleColor || "#f4efe6" }}
                className="font-deadlock text-center text-3xl font-black uppercase leading-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)] sm:text-left sm:text-4xl md:text-5xl wide:block wide:text-center wide:text-[42px]"
              >
                {active.name}
              </span>
            ) : (
              <img
                key={`n${active.id}-${nameFail}`}
                src={active.nameSvgs[nameFail]}
                alt={active.name}
                onError={() => setNameFails((f) => ({ ...f, [active.id]: nameFail + 1 }))}
                className="h-full w-full object-contain object-bottom drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] sm:object-left-bottom wide:h-auto wide:w-[305px] wide:object-center"
              />
            )}
          </div>

          <div className="flex origin-center scale-90 flex-wrap items-center justify-center gap-1.5 sm:origin-left sm:scale-100 sm:justify-start sm:gap-2 wide:origin-center wide:scale-90 wide:justify-center wide:gap-2.5">
            {active.tags.map((tag, i) => (
              <span
                key={tag}
                className={`inline-block ${TAG_ROTATIONS[i % TAG_ROTATIONS.length]}`}
              >
                <span
                  style={{
                    backgroundColor: active.tagBg,
                    color: active.tagText,
                    animationDelay: `${(i * -0.27).toFixed(2)}s`,
                  }}
                  className="lp-tag-jitter inline-block font-deadlock px-3 py-0.5 text-[14px] font-black uppercase tracking-wider shadow-md sm:px-3.5 sm:py-1 sm:text-[15px] md:px-3.5 md:py-1 md:text-[17px] wide:px-4 wide:py-1 wide:text-[18px]"
                >
                  {tag}
                </span>
              </span>
            ))}
          </div>

          <div
            ref={rowRef}
            className="mt-2.5 flex items-center justify-center gap-2 sm:mt-3.5 sm:justify-start sm:gap-2.5 wide:mt-3 wide:justify-center wide:gap-2"
          >
            {active.abilities.map((ab) => (
              <button
                key={ab.slot}
                type="button"
                title={ab.name}
                aria-label={ab.name}
                onMouseEnter={() => {
                  if (soundOn) playClip(PICK_SCREEN_SOUNDS.abilityHover, 0.22);
                }}
                onClick={(e) => {
                  if (soundOn) playClip(PICK_SCREEN_SOUNDS.abilityHover, 0.24);
                  openAbility(ab.slot, e.currentTarget);
                }}
                aria-expanded={pop?.slot === ab.slot}
                className={`pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white/70 sm:h-12 sm:w-12 md:h-[52px] md:w-[52px] wide:h-[45px] wide:w-[45px] ${
                  pop?.slot === ab.slot ? "scale-110 ring-2 ring-white" : ""
                }`}
                style={{
                  backgroundColor: circleBg,
                  boxShadow:
                    "0 4px 14px rgba(0, 0, 0, 0.68), inset 0 1px 0 rgba(255, 255, 255, 0.28)",
                }}
              >
                {ab.image && (
                  <span
                    aria-hidden
                    className="block h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 wide:h-[29px] wide:w-[29px]"
                    style={{
                      backgroundColor: iconColor,
                      WebkitMask: `url(${ab.image}) center / contain no-repeat`,
                      mask: `url(${ab.image}) center / contain no-repeat`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <ViewHeroButton
            heroId={active.id}
            onClick={() => {
              if (soundOn) playClip(PICK_SCREEN_SOUNDS.play, 0.3);
            }}
            className="mt-4 inline-flex self-center px-12 py-2.5 text-xl sm:mt-6 sm:self-start sm:px-14 sm:py-3 sm:text-2xl md:px-20 md:py-3.5 md:text-3xl wide:hidden"
          />
        </div>
      </div>

      {pop &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-50 select-text overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:thin]"
            style={{
              left: pop.left,
              top: pop.top,
              bottom: pop.bottom,
              width: pop.width,
              maxHeight: pop.maxH,
            }}
          >
            <AbilityBar
              key={`${active.id}-${pop.slot}`}
              abilities={active.abilities}
              initialSlot={pop.slot}
              hideSelector
              accent={active.tagBg}
              accentText={active.tagText}
            />
          </div>,
          document.body,
        )}
      <HeroGrainFilter />
    </section>
  );
}