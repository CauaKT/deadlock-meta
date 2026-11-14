"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getCurrentClientUser,
  getSavedAccounts,
  removeSavedAccount,
  signOut,
  subscribeToAuthChanges,
  switchAccount,
} from "@/lib/backend/client";
import type { AuthUser, ProfileSummary, SavedAccount } from "@/lib/backend/types";

type UserStatus = "online" | "dnd" | "invisible";

export default function NavUserButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slowApi, setSlowApi] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Status no estilo Discord com persistência em localStorage
  const [status, setStatus] = useState<UserStatus>("online");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Multikontas salvas (cookie httpOnly na API)
  const [switchOpen, setSwitchOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

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
    const loadUserData = (u: AuthUser | null) => {
      setUser(u);
      if (u) {
        setProfile(u.profile);
        if (u.mustChangePassword && pathname !== "/change-password") {
          router.replace("/change-password");
        } else if (!u.profile?.handle && pathname !== "/welcome" && pathname !== "/change-password") {
          router.replace("/welcome");
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    void getCurrentClientUser().then(loadUserData);
    return subscribeToAuthChanges(loadUserData);
  }, [pathname, router]);

  useEffect(() => {
    if (!loading) {
      setSlowApi(false);
      return;
    }
    const timer = setTimeout(() => setSlowApi(true), 1500);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!open) {
      setSwitchOpen(false);
      setSwitchError(null);
      return;
    }
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
    await signOut();
    router.push("/");
    router.refresh();
  };

  const handleToggleSwitchMenu = async () => {
    const next = !switchOpen;
    setSwitchOpen(next);
    setSwitchError(null);
    if (!next) return;
    setAccountsLoading(true);
    const list = await getSavedAccounts();
    setAccounts(list);
    setAccountsLoading(false);
  };

  const handleSelectAccount = async (acc: SavedAccount) => {
    if (acc.isCurrent) {
      setOpen(false);
      return;
    }
    setSwitchingId(acc.id);
    setSwitchError(null);
    const res = await switchAccount(acc.id);
    setSwitchingId(null);
    if (!res.ok) {
      setSwitchError(res.message);
      const list = await getSavedAccounts();
      setAccounts(list);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const handleRemoveAccount = async (acc: SavedAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await removeSavedAccount(acc.id);
    if (!res.ok) return;
    setAccounts((prev) => prev.filter((item) => item.id !== acc.id));
    if (res.removedCurrent) {
      setOpen(false);
      router.push("/");
      router.refresh();
    }
  };

  const handleAddAccount = async () => {
    setOpen(false);
    await signOut({ keepSavedAccount: true });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <>
        <div className="h-8 w-8 rounded-full bg-neutral-800/40 animate-pulse" />

        {slowApi && (
          <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-16 z-40 flex max-w-[260px] items-start gap-2.5 rounded-xl border border-amber-500/35 bg-[#0a0d0c]/95 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.85)] backdrop-blur-md"
          >
            <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <div className="space-y-0.5 text-left">
              <p className="font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-400">
                Acordando servidor...
              </p>
              <p className="text-[11px] leading-snug text-neutral-300">
                A API entra em repouso após inatividade e pode levar até 1 min para carregar.
              </p>
            </div>
          </div>
        )}
      </>
    );
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

  const displayName = profile?.username || user.suggestedFullName || "Perfil";
  const avatarUrl = profile?.avatar_url || user.suggestedAvatarUrl;

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

          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-neutral-800/60"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400">
                <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="font-deadlock text-xs font-black uppercase tracking-wider text-amber-400">
                Painel Admin
              </span>
            </Link>
          )}

          {/* Opção 2: Trocar de Conta */}
          <button
            type="button"
            onClick={handleToggleSwitchMenu}
            aria-expanded={switchOpen}
            className="group flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left transition-colors hover:bg-neutral-800/60 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
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
            </div>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${switchOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {switchOpen && (
            <div className="mx-1 rounded-xl border border-neutral-800/80 bg-black/50 p-1.5 space-y-1">
              {accountsLoading ? (
                <p className="px-2 py-2 text-[11px] text-neutral-400">Carregando contas...</p>
              ) : (
                <>
                  {accounts.map((acc) => {
                    const label = acc.username || acc.email.split("@")[0];
                    return (
                      <div
                        key={acc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectAccount(acc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void handleSelectAccount(acc);
                          }
                        }}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${
                          acc.isCurrent
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "hover:bg-neutral-800/70"
                        } ${switchingId === acc.id ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {acc.avatarUrl ? (
                            <img
                              src={acc.avatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="h-6 w-6 shrink-0 rounded-full object-cover border border-neutral-700"
                            />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-black text-neutral-300 border border-neutral-700">
                              {label.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#f4efe6]">{label}</p>
                            <p className="truncate font-mono text-[10px] text-neutral-500">
                              {acc.handle ? `@${acc.handle}` : acc.email}
                            </p>
                          </div>
                        </div>

                        {acc.isCurrent ? (
                          <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                            Atual
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Remover da lista"
                            onClick={(e) => handleRemoveAccount(acc, e)}
                            className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-700/60 hover:text-rose-400 cursor-pointer"
                          >
                            <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {switchError && (
                    <p className="px-2 py-1 text-[11px] font-semibold text-rose-400">{switchError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleAddAccount}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-cyan-400 transition-colors hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <span>+ Adicionar outra conta</span>
                  </button>
                </>
              )}
            </div>
          )}

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