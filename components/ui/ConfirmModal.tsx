"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type ConfirmTone = "danger" | "warning";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

const emptySubscribe = () => () => {};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const isDanger = tone === "danger";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-confirm-title"
      aria-describedby="lp-confirm-desc"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-[fadeIn_140ms_ease-out]"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0d0c]/95 p-6 shadow-2xl shadow-black/90">
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
            isDanger
              ? "from-rose-600/80 via-rose-400 to-rose-600/80"
              : "from-amber-600/80 via-amber-400 to-amber-600/80"
          }`}
        />

        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isDanger
                ? "border-rose-500/40 bg-rose-950/50 text-rose-300"
                : "border-amber-500/40 bg-amber-950/50 text-amber-300"
            }`}
          >
            {isDanger ? (
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
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            ) : (
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
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="lp-confirm-title"
              className="font-deadlock text-base font-black uppercase tracking-wider text-[#f4efe6]"
            >
              {title}
            </h3>
            <p
              id="lp-confirm-desc"
              className="mt-1.5 text-xs leading-relaxed text-neutral-300"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900/90 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-xl border px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider transition-colors ${
              isDanger
                ? "border-rose-500 bg-rose-600 text-white hover:bg-rose-500"
                : "border-amber-500 bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const modal = (
    <ConfirmModal
      open={Boolean(pending)}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      tone={pending?.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, modal };
}