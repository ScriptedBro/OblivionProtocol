"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield, Droplets, ArrowLeftRight, FileCheck2, Wallet, CheckCircle2, Lock } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = () => {
    if (!connected) {
      setConnected(true);
      setWalletAddress("0x04e1...8f9a");
    } else {
      setConnected(false);
      setWalletAddress("");
    }
  };

  const navItems = [
    { name: "Terminal", href: "/", icon: Shield },
    { name: "Dark AMM Swaps", href: "/swap", icon: ArrowLeftRight },
    { name: "Concentrated LP", href: "/pool", icon: Droplets },
    { name: "ATTEST Compliance", href: "/compliance", icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#08080a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-white">OBLIVION</span>
              <span className="ml-1.5 text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">STRK20</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-white/10 text-emerald-400 shadow-sm border border-white/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status & Wallet Button */}
        <div className="flex items-center gap-3">
          {/* Mainnet Pool Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-xs font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            STRK20 Mainnet: Active
          </div>

          <button
            onClick={handleConnect}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              connected
                ? "bg-zinc-800/90 text-emerald-400 border border-emerald-500/30 hover:bg-zinc-800"
                : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold hover:opacity-90 shadow-lg shadow-emerald-500/10"
            }`}
          >
            {connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-mono">{walletAddress}</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
