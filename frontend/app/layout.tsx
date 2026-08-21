import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oblivion Protocol — Confidential Financial Terminal on Starknet",
  description:
    "Institutional shielded concentrated liquidity on Ekubo, zero-MEV CoW batch auctions, and zero-knowledge solvency compliance powered by STRK20.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0d] text-slate-100 antialiased min-h-screen flex flex-col tech-grid">
        <Navbar />
        <main className="flex-1 pb-16">{children}</main>

        <footer className="border-t border-[#181d27] bg-[#0b0d12] py-5 text-xs text-zinc-500 font-mono">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              <span>OBLIVION PROTOCOL · STARKNET STRK20 SPECIFICATION v1.0</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <span className="hover:text-zinc-200 cursor-pointer">Ekubo Core CLMM</span>
              <span>/</span>
              <span className="hover:text-zinc-200 cursor-pointer">Pragma Feeds</span>
              <span>/</span>
              <span className="hover:text-zinc-200 cursor-pointer">ATTEST ZK-Engine</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
