"use client";

import { useRouter } from "next/navigation";

interface Props {
  patches: { id: string; label: string }[];
  selected: string;
}

export default function PatchSelect({ patches, selected }: Props) {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
      Dados do patch
      <select
        value={selected}
        onChange={(e) => router.push(`/?patch=${e.target.value}`)}
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