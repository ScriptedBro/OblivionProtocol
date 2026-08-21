"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Shield, 
  ArrowLeftRight, 
  Droplets, 
  FileCheck2, 
  Wallet, 
  Check, 
  ExternalLink,
  ChevronDown,
  Layers,
  Lock,
  Copy
} from "lucide-react";
import { OBLIVION_CONTRACTS } from "@/lib/starknet";
import { fetchNetworkTelemetry, LiveNetworkState } from "@/lib/rpc";

export default function Navbar() {
  const pathname = usePathname();
  const [walletConnected, setWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [networkState, setNetworkState] = useState<LiveNetworkState>({
    blockNumber: 629148,
    gasPriceGwei: "1.18",
    isMainnet: true,
    status: "CONNECTED",
  });
  const [copied, setCopied] = useState(false);

  // Poll real Starknet RPC for live block height & network state
  useEffect(() => {
    let mounted = true;
    async function updateTelemetry() {
      const data = await fetchNetworkTelemetry();
      if (mounted) {
        setNetworkState(data);
      }
    }
    updateTelemetry();
    const interval = setInterval(updateTelemetry, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: "Terminal", href: "/", shortcut: "1", icon: Layers },
    { name: "Dark CoW Swap", href: "/swap", shortcut: "2", icon: ArrowLeftRight },
    { name: "Shielded CLMM", href: "/pool", shortcut: "3", icon: Droplets },
    { name: "ATTEST Compliance", href: "/compliance", shortcut: "4", icon: FileCheck2 },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#1f2634] bg-[#0d0f14]/90 backdrop-blur-md">
        {/* Top Technical Status Strip */}
        <div className="border-b border-[#181d27] bg-[#08090c] px-4 py-1 text-[11px] text-zinc-400">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>Starknet Mainnet</span>
              </div>
              <span className="text-zinc-600">|</span>
              <div className="flex items-center gap-1 text-zinc-400">
                <span>Block:</span>
                <span className="text-zinc-200 font-medium tnum">#{networkState.blockNumber}</span>
              </div>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 text-zinc-400">
                <span>Gas:</span>
                <span className="text-amber-400 font-medium tnum">{networkState.gasPriceGwei} Gwei</span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="text-zinc-500 hidden md:inline">STRK20 Pool Hook:</span>
              <a
                href={`https://starkscan.co/contract/${OBLIVION_CONTRACTS.STRK20_MAINNET_POOL}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <span>{OBLIVION_CONTRACTS.STRK20_MAINNET_POOL.substring(0, 8)}...{OBLIVION_CONTRACTS.STRK20_MAINNET_POOL.substring(62)}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-[#181d26] border border-[#2b3548] flex items-center justify-center text-amber-400 shadow-sm group-hover:border-amber-500/50 transition-colors">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  OBLIVION <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1e2533] border border-[#2c374c] text-amber-400 font-mono font-normal">v1.0</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono tracking-wider">CONFIDENTIAL DEFI</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#181d28] border border-[#2a354a] text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#12151d] border border-transparent"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Wallet & Account */}
          <div className="flex items-center gap-3">
            {walletConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141822] border border-[#263144] hover:border-[#384863] text-xs font-mono text-zinc-200 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>0x0419...e102</span>
                <ChevronDown className="h-3 w-3 text-zinc-500" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setWalletConnected(true);
                  setShowWalletModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs transition-colors shadow-sm"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Management Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md fin-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1f2634] pb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Lock className="h-4 w-4 text-amber-400" /> Shielded Session Manager
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#181d26] border border-[#252f40]"
              >
                ✕ ESC
              </button>
            </div>

            {/* Account Details */}
            <div className="space-y-3">
              <div className="p-3 fin-inset flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-zinc-400 text-[10px]">Active Wallet Address</div>
                  <div className="text-zinc-200 font-medium">0x0419a4e321...b182a938e102</div>
                </div>
                <button
                  onClick={() => handleCopy("0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102")}
                  className="p-1.5 rounded bg-[#161b24] border border-[#232c3d] text-zinc-400 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#151922] border border-[#202735] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Shielded Note Assets:</span>
                  <span className="font-mono text-emerald-400 font-semibold">$14,240.50</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="p-2 fin-inset text-center">
                    <div className="text-[10px] text-zinc-400">STRK</div>
                    <div className="font-semibold text-white">12,500.00</div>
                  </div>
                  <div className="p-2 fin-inset text-center">
                    <div className="text-[10px] text-zinc-400">USDC</div>
                    <div className="font-semibold text-white">4,800.00</div>
                  </div>
                  <div className="p-2 fin-inset text-center">
                    <div className="text-[10px] text-zinc-400">ETH</div>
                    <div className="font-semibold text-white">1.84</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setWalletConnected(false)}
                className="w-full py-2.5 rounded-lg border border-[#2b3548] bg-[#141822] text-xs font-semibold text-zinc-300 hover:bg-[#1a202d] transition-colors"
              >
                Disconnect
              </button>
              <button
                onClick={() => setShowWalletModal(false)}
                className="w-full py-2.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-xs font-semibold text-black transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
