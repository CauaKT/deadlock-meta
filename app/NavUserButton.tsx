"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface ProfileSummary {
  username: string;
  avatar_url?: string;
  favorite_hero_id?: number;
}

export default function NavUserButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadUserData = async (u: User | null) => {
      setUser(u);
      if (u) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url, favorite_hero_id")
          .eq("id", u.id)
          .single();
        if (data) setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => loadUserData(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return <div className="h-8 w-20 rounded bg-neutral-800/40 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-[5px] border border-amber-300/80 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-1.5 font-deadlock text-xs font-black uppercase tracking-wider text-black shadow-[0_2px_12px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all hover:scale-105 hover:brightness-110 active:scale-95"
      >
        Entrar
      </Link>
    );
  }

  const displayName = profile?.username || user.user_metadata?.username || user.email?.split("@")[0] || "Perfil";

  return (
    <div ref={containerRef} className="relative select-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-[5px] border px-3 py-1 font-deadlock text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
          open
            ? "border-amber-400 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            : "border-neutral-700 bg-neutral-900/90 text-[#f4efe6] hover:border-amber-500/60 hover:text-amber-400"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="max-w-[110px] truncate">{displayName}</span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-3 w-3 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180 text-amber-400" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {/* Menu Suspenso */}
      <div
        className={`absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-neutral-800/90 bg-neutral-950/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 z-50 ${
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="border-b border-neutral-800/80 px-3 py-2.5">
          <p className="font-deadlock truncate text-sm font-black uppercase text-[#f4efe6]">
            {displayName}
          </p>
          <p className="truncate font-mono text-[11px] text-neutral-400">{user.email}</p>
        </div>

        <div className="py-1 space-y-0.5">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800/60 hover:text-[#f4efe6] transition-colors"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-amber-400" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
            </svg>
            <span>Meu Perfil & Deadlock ID</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 12l4-4-4-4M14 8H6" />
            </svg>
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}