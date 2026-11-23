/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import RouteTracker from "@/components/RouteTracker";
import AppSidebar from "./AppSidebar";
import EmailVerifyBanner from "./EmailVerifyBanner";
import PageTransitionBar from "./PageTransitionBar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lockpro.vercel.app"),
  title: "LockPro • Heróis, Itens e Tier List de Deadlock",
  description: "Tier list por patch, atributos e habilidades dos heróis e catálogo de itens de Deadlock, com dados da Deadlock API e da Deadlock Wiki. Projeto não oficial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#070807] text-neutral-100 font-sans relative flex flex-col lg:flex-row overflow-x-hidden selection:bg-[#5ce1b6] selection:text-[#0a1612]">
        <Suspense fallback={null}>
          <PageTransitionBar />
        </Suspense>
        <RouteTracker />

        {/* WALLPAPER FIXO DE FUNDO */}
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-15 blur-[2px] scale-105"
          style={{ backgroundImage: "url('/bg.webp')" }}
        />
        <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070807]/80 via-[#070807]/60 to-[#070807]/95" />
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_65%_40%_at_55%_0%,rgba(245,158,11,0.08),transparent_70%)]" />

        {/* SIDEBAR ESQUERDA (DESKTOP) + TOPBAR/DRAWER (MOBILE) */}
        <AppSidebar />

        {/* COLUNA PRINCIPAL */}
        <div className="flex-1 min-w-0 flex flex-col justify-between min-h-svh relative z-10">
          <EmailVerifyBanner />

          {/* CONTEÚDO DINÂMICO */}
          <main className="flex-1 w-full">
            {children}
          </main>

          {/* BANNER INFERIOR / FOOTER */}
          <footer className="w-full relative z-20 border-t border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md py-10 px-4 text-neutral-400">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="LockPro"
                      className="w-7 h-7 object-contain opacity-90"
                    />
                    <span className="font-deadlock text-lg font-black tracking-tight text-[#f4efe6]">
                      LOCK<span className="text-amber-500">PRO</span>
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-400 max-w-md">
                    Plataforma comunitária de estatísticas, tier list por patch, catálogo de itens e simulador de habilidades para Deadlock.
                  </p>
                </div>

                <div className="space-y-2.5 md:text-right">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#f4efe6]">
                    Transparência
                  </p>
                  <ul className="space-y-2 text-xs font-semibold">
                    <li>
                      <Link
                        href="/data-sources"
                        className="group inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                      >
                        <span>Fontes de Dados</span>
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 12 12 4M6 4h6v6" />
                        </svg>
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://github.com/CauaKT/deadlock-meta"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                      >
                        <span>Repositório GitHub</span>
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 12 12 4M6 4h6v6" />
                        </svg>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-800/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
                <p>
                  Deadlock é marca registrada da Valve Corporation. O LockPro é um projeto comunitário independente, sem fins lucrativos e sem afiliação oficial com a Valve.
                </p>
                <p className="shrink-0 font-semibold text-neutral-400">
                  LockPro © 2026
                </p>
              </div>
            </div>
          </footer>
        </div>

        <Analytics />
      </body>
    </html>
  );
}