import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oblivion Protocol — Confidential Concentrated Liquidity & Dark AMM on Starknet",
  description:
    "Shielded concentrated liquidity on Ekubo, zero-MEV CoW batch swaps, and institutional zero-knowledge compliance attestations powered by STRK20.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08080a] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="relative min-h-screen flex flex-col">
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
            <div className="absolute top-1/3 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />
            <div className="absolute bottom-10 left-1/3 h-96 w-96 rounded-full bg-emerald-600/5 blur-[120px]" />
          </div>

          <Navbar />
          <main className="relative z-10 flex-1">{children}</main>

          <footer className="relative z-10 border-t border-white/5 bg-[#08080a]/60 py-6 text-center text-xs text-zinc-500">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>Oblivion Protocol · Starknet Mainnet STRK20 Private Sprint</div>
              <div className="flex items-center gap-4 font-mono text-zinc-400">
                <span>Ekubo CLMM</span>
                <span>•</span>
                <span>Pragma Oracles</span>
                <span>•</span>
                <span>ATTEST Compliance</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
