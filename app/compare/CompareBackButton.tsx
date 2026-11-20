"use client";

import { useRouter } from "next/navigation";

export default function CompareBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const ev = new CustomEvent("lp-compare-reset", { cancelable: true });
        const notCanceled = window.dispatchEvent(ev);
        if (!notCanceled) return;
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-white/15 bg-black/45 px-3 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-300 transition-colors hover:border-amber-400 hover:text-amber-400 cursor-pointer"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      Voltar
    </button>
  );
}