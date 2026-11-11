"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  patches: { id: string; label: string }[];
  selected: string;
}

export default function PatchSelect({ patches, selected }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
      {isPending && (
        <div className="fixed top-0 inset-x-0 z-40 h-0.5 overflow-hidden bg-amber-500/10">
          <div className="lp-bar h-full w-1/3 bg-amber-500" />
        </div>
      )}
      <span className="flex items-center gap-2">
        Dados do patch
        {isPending && <span className="h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />}
      </span>
      <select
        value={selected}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => router.push(`/?patch=${value}`));
        }}
        disabled={isPending}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[#f4efe6] outline-none transition-colors [color-scheme:dark] hover:border-amber-500/70 focus:border-amber-500"
      >
        {patches.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}