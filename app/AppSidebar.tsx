"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationBell from "./NotificationBell";
import NavUserButton from "./NavUserButton";

interface NavSubItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: ReactNode;
  children?: NavSubItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Início",
    items: [
      {
        href: "/",
        label: "Tracker",
        match: (p) => p === "/",
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Meta",
    items: [
      {
        href: "/tier-list",
        label: "Tier List",
        match: (p) => p.startsWith("/tier-list"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        ),
      },
      {
        href: "/heroes",
        label: "Heróis",
        match: (p) => p.startsWith("/heroes"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 6v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V6l-8-4z" />
          </svg>
        ),
      },
      {
        href: "/items",
        label: "Itens",
        match: (p) => p.startsWith("/items"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
          </svg>
        ),
      },
      {
        href: "/patches",
        label: "Patch Tracker",
        match: (p) => p.startsWith("/patches"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
      },
      {
        href: "/builds",
        label: "Builds",
        match: (p) => p.startsWith("/builds"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        ),
      },
      {
        href: "/calculator",
        label: "Calculadora",
        match: (p) => p.startsWith("/calculator"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="8" y2="10.01" />
            <line x1="12" y1="10" x2="12" y2="10.01" />
            <line x1="16" y1="10" x2="16" y2="10.01" />
            <line x1="8" y1="14" x2="8" y2="14.01" />
            <line x1="12" y1="14" x2="12" y2="14.01" />
            <line x1="16" y1="14" x2="16" y2="14.01" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
        ),
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        match: (p) => p.startsWith("/leaderboard"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        ),
      },
      {
        href: "/tournaments",
        label: "Torneios",
        match: (p) => p.startsWith("/tournaments"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
          </svg>
        ),
      },
      {
        href: "/compare",
        label: "Comparador 1v1",
        match: (p) => p.startsWith("/compare"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        ),
      },
      {
        href: "/tier-maker",
        label: "Tier Maker",
        match: (p) => p.startsWith("/tier-maker"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 17.5h7M17.5 14v7" />
          </svg>
        ),
        children: [
          {
            href: "/tier-maker",
            label: "Montar Tier List",
            match: (p) => p === "/tier-maker",
          },
          {
            href: "/tier-maker/comunidade",
            label: "Comunidade",
            match: (p) => p.startsWith("/tier-maker/comunidade"),
          },
        ],
      },
    ],
  },
  {
    title: "Social",
    items: [
      {
        href: "/feed",
        label: "Feed",
        match: (p) => p.startsWith("/feed"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        href: "/lfg",
        label: "Procurar Duo / LFG",
        match: (p) => p.startsWith("/lfg"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        href: "/data-sources",
        label: "Fontes de Dados",
        match: (p) => p.startsWith("/data-sources"),
        icon: (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14a9 3 0 0 0 18 0V5" />
            <path d="M3 12a9 3 0 0 0 18 0" />
          </svg>
        ),
      },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "/tier-maker": pathname.startsWith("/tier-maker"),
  });

  useEffect(() => {
    if (pathname.startsWith("/tier-maker")) {
      setExpandedGroups((prev) => ({ ...prev, "/tier-maker": true }));
    }
  }, [pathname]);

  useEffect(() => {
    try {
      if (localStorage.getItem("lp_sidebar_collapsed") === "1") {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lp_sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const renderLinks = (isCompact: boolean) => (
    <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5 lp-scroll">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="space-y-1">
          {!isCompact && (
            <p className="px-2.5 pb-1 font-deadlock text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match(pathname);
              const hasChildren = Boolean(!isCompact && item.children && item.children.length > 0);
              const isExpanded = Boolean(expandedGroups[item.href]);

              return (
                <div key={item.href} className="space-y-0.5">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [item.href]: !prev[item.href],
                        }))
                      }
                      aria-expanded={isExpanded}
                      className={`flex w-full items-center justify-between gap-2 rounded-[5px] px-2.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                          : "text-[#f4efe6]/85 border border-transparent hover:bg-neutral-900 hover:text-amber-400"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-amber-400" : "text-neutral-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m4 6 4 4 4-4" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      title={isCompact ? item.label : undefined}
                      className={`flex w-full items-center gap-3 rounded-[5px] px-2.5 py-2 text-sm font-semibold transition-colors ${
                        isCompact ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                          : "text-[#f4efe6]/85 border border-transparent hover:bg-neutral-900 hover:text-amber-400"
                      }`}
                    >
                      {item.icon}
                      {!isCompact && <span className="truncate">{item.label}</span>}
                    </Link>
                  )}

                  {hasChildren && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-3 border-l border-neutral-800 pl-2.5 space-y-0.5 pt-0.5">
                          {item.children!.map((sub) => {
                            const subActive = sub.match(pathname);
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`block rounded-[4px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                  subActive
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "text-neutral-400 hover:bg-neutral-900/70 hover:text-[#f4efe6]"
                                }`}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* TOPBAR MOBILE (< lg) */}
      <header className="lg:hidden sticky top-0 z-40 h-14 w-full border-b border-neutral-800/80 bg-[#0a0d0c]/95 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu de navegação"
            className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-neutral-800 bg-neutral-900/80 text-[#f4efe6] hover:border-amber-500/60 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="LockPro"
              className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(244,239,230,0.15)]"
            />
            <span className="font-deadlock text-lg font-black tracking-tight text-[#f4efe6]">
              LOCK<span className="text-amber-500">PRO</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Busca rápida"
            className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-amber-500/60 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <NotificationBell placement="header" />
          <NavUserButton />
        </div>
      </header>

      {/* DRAWER MOBILE */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-neutral-800/90 bg-[#070807]/98 shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-neutral-800/80 px-4">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/logo.png" alt="LockPro" className="w-7 h-7 object-contain" />
                <span className="font-deadlock text-lg font-black tracking-tight text-[#f4efe6]">
                  LOCK<span className="text-amber-500">PRO</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-[5px] text-neutral-400 hover:bg-neutral-900 hover:text-white cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {renderLinks(false)}
          </aside>
        </div>
      )}

      {/* SIDEBAR DESKTOP (lg+) */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-svh shrink-0 z-30 border-r border-neutral-800/80 bg-[#0a0d0c]/95 backdrop-blur-md transition-[width] duration-200 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div
          className={`flex h-14 items-center border-b border-neutral-800/80 px-3 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <img
                src="/logo.png"
                alt="LockPro"
                className="w-7 h-7 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(244,239,230,0.15)] group-hover:scale-105 transition-transform"
              />
              <span className="font-deadlock text-lg font-black tracking-tight text-[#f4efe6] truncate">
                LOCK<span className="text-amber-500">PRO</span>
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-neutral-800/80 bg-neutral-900/70 text-neutral-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>

        <div className="px-2.5 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="Busca rápida (Ctrl + K)"
            className={`flex w-full items-center gap-2.5 rounded-[5px] border border-neutral-800/90 bg-neutral-900/70 px-2.5 py-2 text-xs text-neutral-400 transition-colors hover:border-amber-500/50 hover:text-[#f4efe6] cursor-pointer ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {!collapsed && <span className="truncate">Buscar...</span>}
            </span>
            {!collapsed && (
              <kbd className="shrink-0 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                Ctrl K
              </kbd>
            )}
          </button>
        </div>

        {renderLinks(collapsed)}

        <div className="border-t border-neutral-800/80 p-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <NavUserButton placement="sidebar" compact={collapsed} />
          </div>
          {!collapsed && <NotificationBell placement="sidebar" />}
        </div>
      </aside>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}