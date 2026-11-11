// app/layout.tsx
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LockPro • Heróis, Itens e Tier List de Deadlock",
  description: "Tier list por patch, atributos e habilidades dos heróis e catálogo de itens de Deadlock, com dados da Deadlock API e da Deadlock Wiki. Projeto não oficial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#070807] text-neutral-100 font-sans relative flex flex-col justify-between overflow-x-hidden selection:bg-[#5ce1b6] selection:text-[#0a1612]">
        {/* WALLPAPER FIXO DE FUNDO */}
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-15 blur-[2px] scale-105"
          style={{ backgroundImage: "url('/bg.webp')" }}
        />
        <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070807]/80 via-[#070807]/60 to-[#070807]/95" />

        {/* BANNER SUPERIOR / NAVBAR */}
        <header className="w-full relative z-30 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Nova Marca: LOCKPRO */}
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="LockPro"
                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(244,239,230,0.15)] group-hover:scale-105 transition-transform"
              />
              <span className="font-deadlock font-deadlock text-xl font-black tracking-tight text-[#f4efe6]">
                LOCK<span className="text-amber-500">PRO</span>
              </span>
            </Link>

            {/* Menu de Navegação */}
            <nav className="flex items-center gap-6 text-sm font-semibold">
              <Link
                href="/"
                className="text-[#f4efe6] hover:text-amber-400 transition-colors"
              >
                Tier List
              </Link>
              <Link
                href="/heroes"
                className="text-[#f4efe6] hover:text-amber-400 transition-colors"
              >
                Heróis
              </Link>
              <Link
                href="/items"
                className="text-[#f4efe6] hover:text-amber-400 transition-colors"
              >
                Itens
              </Link>
            </nav>

            {/* Status da API & GitHub */}
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <a
                href="https://github.com/CauaKT/deadlock-meta"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DINÂMICO */}
        <main className="flex-1 relative z-10 w-full">
          {children}
        </main>

        {/* BANNER INFERIOR / FOOTER */}
        <footer className="w-full relative z-20 border-t border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md py-8 px-4 text-neutral-400">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="LockPro"
                className="w-8 h-8 object-contain opacity-70"
              />
              <div>
                <p className="text-sm font-bold text-[#f4efe6]">
                  LOCK<span className="text-amber-500">PRO</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}