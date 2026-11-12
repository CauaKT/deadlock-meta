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
  handle?: string | null;
}

type UserStatus = "online" | "dnd" | "invisible";

export default function NavUserButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Status no estilo Discord com persistência em localStorage
  const [status, setStatus] = useState<UserStatus>("online");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lockpro_user_status") as UserStatus;
      if (saved === "online" || saved === "dnd" || saved === "invisible") {
        setStatus(saved);
      }
    } catch {}
  }, []);

  const changeStatus = (newStatus: UserStatus) => {
    setStatus(newStatus);
    setStatusMenuOpen(false);
    try {
      localStorage.setItem("lockpro_user_status", newStatus);
    } catch {}
  };

  useEffect(() => {
    const supabase = createClient();

    const loadUserData = async (u: User | null) => {
      setUser(u);
      if (u) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url, favorite_hero_id, handle")
          .eq("id", u.id)
          .maybeSingle();
        if (data) setProfile(data);
        if (!error && !data?.handle && pathname !== "/welcome") router.replace("/welcome");
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
  }, [pathname, router]);

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

  const handleSwitchAccount = async () => {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-neutral-800/40 animate-pulse" />;
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

  const displayName = profile?.username || user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Perfil";
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <div ref={containerRef} className="relative select-none flex items-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={`Menu de ${displayName}`}
          aria-expanded={open}
          className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border transition-all cursor-pointer ${
            open
              ? "border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              : "border-neutral-700 bg-neutral-900 hover:border-amber-500/80 hover:scale-105"
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4 text-neutral-400"
              fill="currentColor"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </button>

        {/* Indicador de Status Visível no Topo da Navbar */}
        {status === "online" && (
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#070807] bg-emerald-400" />
        )}
        {status === "dnd" && (
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-[#070807] bg-rose-500">
            <span className="h-0.5 w-1 rounded-full bg-[#070807]" />
          </span>
        )}
        {status === "invisible" && (
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-neutral-400 bg-[#070807]" />
        )}
      </div>

      {/* Menu Suspenso Redesenhado */}
      <div
        className={`absolute right-0 top-full mt-2 w-[270px] origin-top-right rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/98 p-2 shadow-[0_24px_50px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-200 z-50 ${
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        {/* Cabeçalho do Usuário com Mini-Avatar e Seletor de Status Discord */}
        <div className="relative flex items-center gap-3 border-b border-neutral-800/80 p-2.5">
          <div className="relative h-10 w-10 shrink-0">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-neutral-900 shadow-inner">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-neutral-400" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>

            {/* Botão Interativo do Status (Abre opções no clique) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatusMenuOpen((prev) => !prev);
              }}
              title="Alterar status de atividade"
              className="group absolute -bottom-0.5 -right-0.5 cursor-pointer outline-none transition-transform hover:scale-125"
            >
              {status === "online" && (
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-[#0a0d0c] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              )}
              {status === "dnd" && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#0a0d0c] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]">
                  <span className="h-0.5 w-1.5 rounded-full bg-[#0a0d0c]" />
                </span>
              )}
              {status === "invisible" && (
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-neutral-400 bg-[#0a0d0c] shadow-sm" />
              )}
            </button>
          </div>

          {/* Submenu Flutuante de Status Estilo Discord */}
          {statusMenuOpen && (
            <div className="absolute left-2.5 top-full z-50 mt-1 w-48 rounded-xl border border-neutral-800 bg-[#070908] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-1 animate-fade-in">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-500 font-deadlock border-b border-neutral-800/80">
                Definir Status
              </p>

              {/* Opção 1: Disponível */}
              <button
                type="button"
                onClick={() => changeStatus("online")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                  status === "online"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>Disponível</span>
              </button>

              {/* Opção 2: Não Perturbe */}
              <button
                type="button"
                onClick={() => changeStatus("dnd")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                  status === "dnd"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                }`}
              >
                <span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-rose-500">
                  <span className="h-0.5 w-1.5 rounded-full bg-[#0a0d0c]" />
                </span>
                <span>Não Perturbe</span>
              </button>

              {/* Opção 3: Invisível */}
              <button
                type="button"
                onClick={() => changeStatus("invisible")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                  status === "invisible"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-neutral-400 bg-[#0a0d0c]" />
                <span>Invisível</span>
              </button>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-deadlock truncate text-sm font-black uppercase tracking-wide text-[#f4efe6]">
              {displayName}
            </p>
            {profile?.handle && (
              <p className="truncate font-mono text-[10.5px] text-neutral-400">@{profile.handle}</p>
            )}
          </div>
        </div>

        {/* Lista de Ações Diretas */}
        <div className="py-1 space-y-0.5">
          {/* Opção 1: Meu Perfil */}
          <Link
            href={profile?.handle ? `/profile/${profile.handle}` : "/profile"}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-neutral-800/60"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-black/40 text-neutral-300 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] group-hover:text-amber-400 transition-colors">
              Meu Perfil
            </span>
          </Link>

          {/* Opção 2: Trocar de Conta */}
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-neutral-800/60 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-black/40 text-neutral-300 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 11l-3-3m0 0l-3 3m3-3v8" />
              </svg>
            </div>
            <span className="font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] group-hover:text-cyan-400 transition-colors">
              Trocar de Conta
            </span>
          </button>

          {/* Divisor */}
          <div className="border-t border-neutral-800/70 my-1" />

          {/* Opção 3: Sair da Conta */}
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-rose-950/25 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-950/50 bg-rose-950/20 text-rose-400 group-hover:bg-rose-900/40 transition-colors">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span className="font-deadlock text-xs font-black uppercase tracking-wider text-rose-400 transition-colors">
              Sair da Conta
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}