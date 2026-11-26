"use client";

import { useSyncExternalStore } from "react";

const subscribeReducedMotion = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const getReducedMotionSnapshot = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroGrainFilter() {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      className="pointer-events-none absolute overflow-hidden"
    >
      <defs>
        <filter
          id="dl-hero-grain"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feOffset in="noise" dx="0" dy="0" result="shifted">
            {!reducedMotion && (
              <>
                <animate
                  attributeName="dx"
                  values="0;-37;29;-43;19;-23;41;-17;0"
                  dur="0.45s"
                  repeatCount="indefinite"
                  calcMode="discrete"
                />
                <animate
                  attributeName="dy"
                  values="0;23;-41;17;-31;37;-19;43;0"
                  dur="0.45s"
                  repeatCount="indefinite"
                  calcMode="discrete"
                />
              </>
            )}
          </feOffset>
          <feColorMatrix in="shifted" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="contrast">
            <feFuncR type="linear" slope="2.4" intercept="-0.7" />
            <feFuncG type="linear" slope="2.4" intercept="-0.7" />
            <feFuncB type="linear" slope="2.4" intercept="-0.7" />
            <feFuncA type="discrete" tableValues="1" />
          </feComponentTransfer>
          <feComposite in="contrast" in2="SourceAlpha" operator="in" result="clipped" />
          <feComponentTransfer in="clipped" result="softGrain">
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feBlend in="softGrain" in2="SourceGraphic" mode="overlay" />
        </filter>
      </defs>
    </svg>
  );
}