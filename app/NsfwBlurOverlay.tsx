"use client";

import { useState } from "react";

export default function NsfwBlurOverlay({
  src,
  alt = "",
  nsfw = false,
  className = "absolute inset-0 h-full w-full object-cover object-center",
}: {
  src: string;
  alt?: string;
  nsfw?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!nsfw) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-all duration-300 ${
          revealed ? "" : "scale-110 blur-2xl brightness-50"
        }`}
      />

      {!revealed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 px-4 text-center backdrop-blur-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-black/70 text-neutral-200">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-neutral-200">
            Esta imagem pode conter conteúdo pornográfico (+18)
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="cursor-pointer rounded-lg border border-neutral-600 bg-neutral-900/90 px-3.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-[#f4efe6] transition-colors hover:border-amber-400 hover:text-amber-400"
          >
            Visualizar imagem
          </button>
        </div>
      )}
    </>
  );
}