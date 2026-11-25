"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, type ReactNode } from "react";

interface Props {
  name: string;
  handle?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  prefix?: string;
  clickable?: boolean;
  showHandle?: boolean;
  pill?: boolean;
  extra?: ReactNode;
}

export default function TierAuthorBadge({
  name,
  handle,
  avatarUrl,
  size = "md",
  prefix,
  clickable = true,
  showHandle = true,
  pill = true,
  extra,
}: Props) {
  const cleanName = name.trim() || "Jogador";
  const cleanHandle = handle?.trim().replace(/^@+/, "") || null;
  const isClickable = clickable && Boolean(cleanHandle);
  const shouldShowHandle =
    showHandle &&
    Boolean(cleanHandle) &&
    cleanName.toLowerCase() !== cleanHandle?.toLowerCase() &&
    cleanName.toLowerCase() !== `@${cleanHandle?.toLowerCase()}`;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const avatarSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  const avatarEl = showImage ? (
    <img
      src={avatarUrl!}
      alt={cleanName}
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(avatarUrl ?? null)}
      className={`${avatarSize} shrink-0 rounded-full border border-amber-500/35 bg-neutral-900 object-cover`}
    />
  ) : (
    <div
      aria-hidden
      className={`${avatarSize} flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className={iconSize} fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  );

  const labelEl = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {prefix && (
        <span className="text-[11px] font-medium text-neutral-400">{prefix}</span>
      )}
      <span
        className={`truncate font-bold text-[#f4efe6] transition-colors ${
          isClickable ? "group-hover/author:text-amber-400" : ""
        } ${size === "sm" ? "text-xs" : "text-xs sm:text-sm"}`}
      >
        {cleanName}
      </span>
      {shouldShowHandle && (
        <span className="truncate font-mono text-[11px] text-neutral-400">
          @{cleanHandle}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 select-none">
      {isClickable ? (
        <Link
          href={`/profile/${encodeURIComponent(cleanHandle!)}`}
          className={
            pill
              ? "group/author inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-neutral-900/75 py-0.5 pl-0.5 pr-2.5 transition-colors hover:border-amber-500/50"
              : "group/author inline-flex min-w-0 items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2.5 transition-colors"
          }
        >
          {avatarEl}
          {labelEl}
        </Link>
      ) : clickable ? (
        <div
          className={
            pill
              ? "inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 py-0.5 pl-0.5 pr-2.5"
              : "inline-flex min-w-0 items-center gap-2 py-0.5 pl-0.5 pr-2.5"
          }
        >
          {avatarEl}
          {labelEl}
        </div>
      ) : (
        <div className="inline-flex min-w-0 items-center gap-2">
          {avatarEl}
          {labelEl}
        </div>
      )}
      {extra}
    </div>
  );
}