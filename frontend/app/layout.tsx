import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { WalletProvider } from "@/lib/wallet";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oblivion Protocol — Confidential Liquidity Layer on Starknet",
  description:
    "Shielded concentrated liquidity, zero-MEV batch auctions, and zero-knowledge solvency compliance built on the STRK20 privacy pool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <WalletProvider>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>

          <footer className="border-t border-[#d8d0c8] bg-[#f6f0e8] py-5 text-xs text-[#605850] font-mono">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2652a]"></span>
                <span>OBLIVION PROTOCOL · STARKNET SEPOLIA TESTNET · STRK20 SPEC v1.0</span>
              </div>
              <div className="flex items-center gap-4 text-[#9a9088]">
                <a
                  href="https://sepolia.voyager.online/contract/0x05108e8659b0024fa93c809b4ff05761e70c68e0b9e0c456547d83bd68cc0396"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#c2652a] transition-colors"
                >
                  OblivionVault
                </a>
                <span>/</span>
                <a
                  href="https://sepolia.voyager.online/contract/0x0128a4513e035cfbb68f7b781661068d81873c1c942f5fab32997259ab719dda"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#c2652a] transition-colors"
                >
                  CoWMatcher
                </a>
                <span>/</span>
                <a
                  href="https://sepolia.voyager.online/contract/0x0103746eaabf31b727865b9da91b978ee5ca3d43a5563580d119497fd77d73e8"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#c2652a] transition-colors"
                >
                  AttestEngine
                </a>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
