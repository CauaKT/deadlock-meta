"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCurrentClientUser, subscribeToAuthChanges } from "@/lib/backend/client";
import type { AuthUser } from "@/lib/backend/types";

interface NotificationItem {
  id: string;
  type:
    | "friend_request"
    | "post_like"
    | "post_comment"
    | "tier_list_like"
    | "tier_list_comment";
  actorName: string;
  actorHandle: string | null;
  message: string;
  href: string;
  createdAt: string;
}

const SEEN_KEY = "lp_notif_seen_at";

export default function NotificationBell({ placement = "header" }: { placement?: "header" | "sidebar" }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = Number(localStorage.getItem(SEEN_KEY) || "0");
        if (Number.isFinite(saved)) setSeenAt(saved);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sync = (u: AuthUser | null) => {
      setUser(u);
      if (!u) {
        setItems([]);
        return;
      }
      fetch("/api/backend/notifications", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: NotificationItem[] }) => {
          if (Array.isArray(d.items)) setItems(d.items);
        })
        .catch(() => {});
    };

    void getCurrentClientUser().then(sync);
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  const unreadCount = items.filter((it) => new Date(it.createdAt).getTime() > seenAt).length;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setSeenAt(now);
      try {
        localStorage.setItem(SEEN_KEY, String(now));
      } catch {}
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notificações"
        title="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded-[5px] border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-amber-500/60 hover:text-amber-400 transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-black text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-72 rounded-xl border border-neutral-800 bg-[#0a0d0c]/98 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-md ${
            placement === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
          }`}
        >
          <p className="border-b border-neutral-800/80 px-2.5 py-2 font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-400">
            Notificações
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-neutral-500">
              Nenhuma atividade recente.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-neutral-800/60 lp-scroll">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2.5 py-2 hover:bg-neutral-900 transition-colors"
                  >
                    <p className="text-xs text-neutral-200 leading-snug">
                      <strong className="text-[#f4efe6]">{it.actorName}</strong> {it.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-neutral-500">
                      {new Date(it.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}