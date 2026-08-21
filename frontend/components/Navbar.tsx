"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Wallet,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Layers,
  ArrowLeftRight,
  Droplets,
  FileCheck2,
} from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { shortAddress, getProvider, ADDRESSES } from "@/lib/starknet";

const navItems = [
  { name: "Home", href: "/", icon: Layers },
  { name: "Dark Swap", href: "/swap", icon: ArrowLeftRight },
  { name: "Shielded LP", href: "/pool", icon: Droplets },
  { name: "ATTEST Engine", href: "/compliance", icon: FileCheck2 },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, chainId, connecting, connectWallet, disconnectWallet } =
    useWallet();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [rpcUp, setRpcUp] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const n = await getProvider().getBlockNumber();
        if (active) {
          setBlockNumber(n);
          setRpcUp(true);
        }
      } catch {
        if (active) setRpcUp(false);
      }
    }
    poll();
    const t = setInterval(poll, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#f6f0e8]/90 backdrop-blur-md border-b border-[#d8d0c8]/60 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
        {/* Top Technical Status Strip */}
        <div className="border-b border-[#e6e0d6] bg-[#f2ece4] px-4 py-1 text-[11px] text-[#605850]">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5 text-[#3a302a]">
                <span className="h-2 w-2 rounded-full bg-[#c2652a]"></span>
                <span className="font-semibold tracking-wide font-body text-[11px]">
                  Starknet Sepolia · Testnet
                </span>
              </div>
              <span className="text-[#d8d0c8]">|</span>
              <div className="flex items-center gap-1">
                <span className="text-[#9a9088]">Block:</span>
                <span className="text-[#3a302a] font-semibold tnum">
                  {blockNumber !== null ? `#${blockNumber}` : rpcUp ? "…" : "unreachable"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-[#9a9088] hidden md:inline">OblivionVault:</span>
              <a
                href={`https://sepolia.voyager.online/contract/${ADDRESSES.vault}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#605850] hover:text-[#c2652a] transition-colors font-mono"
              >
                <span>
                  {ADDRESSES.vault
                    ? `${ADDRESSES.vault.substring(0, 8)}...${ADDRESSES.vault.substring(62)}`
                    : "not configured"}
                </span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-lg bg-[#c2652a] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-2xl font-bold text-[#c2652a] tracking-tight">
                  Oblivion Protocol
                </span>
                <span className="text-[10px] text-[#9a9088] font-body tracking-wider uppercase font-semibold">
                  Confidential Liquidity Layer
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all font-body ${
                      isActive
                        ? "bg-[#ffffff] text-[#c2652a] shadow-sm border border-[#d8d0c8]/80 font-bold"
                        : "text-[#605850] hover:text-[#c2652a] hover:bg-[#ffffff]/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#c2652a]" : "text-[#9a9088]"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {address ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffffff] border border-[#d8d0c8] hover:border-[#c2652a] text-xs font-mono text-[#3a302a] transition-all shadow-sm"
              >
                <div className="h-2 w-2 rounded-full bg-[#c2652a]"></div>
                <span className="font-semibold">{shortAddress(address)}</span>
                {chainId && (
                  <span className="text-[9px] uppercase text-[#9a9088] border border-[#d8d0c8] rounded px-1 py-0.5">
                    {chainId}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-[#9a9088]" />
              </button>
            ) : (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-semibold text-xs transition-all shadow-[0_2px_12px_rgba(194,101,42,0.2)] disabled:opacity-60"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Management Modal */}
      {showWalletModal && address && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3a302a]/40 backdrop-blur-sm p-4"
          onClick={() => setShowWalletModal(false)}
        >
          <div
            className="w-full max-w-md sahara-card p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d8d0c8] pb-4">
              <div className="flex items-center gap-2 font-bold text-base text-[#3a302a] font-headline">
                <Wallet className="h-5 w-5 text-[#c2652a]" /> Connected Wallet
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-xs text-[#9a9088] hover:text-[#3a302a] px-2 py-1 rounded bg-[#f6f0e8] border border-[#d8d0c8]"
              >
                ✕ ESC
              </button>
            </div>

            <div className="p-3.5 sahara-inset flex items-center justify-between text-xs font-mono">
              <div className="min-w-0">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold tracking-wider font-body">
                  Address {chainId ? `· ${chainId}` : ""}
                </div>
                <div className="text-[#3a302a] font-semibold mt-0.5 break-all">{address}</div>
              </div>
              <button
                onClick={() => handleCopy(address)}
                className="shrink-0 ml-3 p-2 rounded-lg bg-[#ffffff] border border-[#d8d0c8] text-[#605850] hover:text-[#c2652a] transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#c2652a]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <a
              href={`https://sepolia.voyager.online/account/${address}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#d8d0c8] bg-[#ffffff] text-xs font-semibold text-[#605850] hover:text-[#c2652a] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View on Voyager
            </a>

            <button
              onClick={async () => {
                await disconnectWallet();
                setShowWalletModal(false);
              }}
              className="w-full py-2.5 rounded-lg border border-[#8c3c3c]/30 bg-[#f6f0e8] text-xs font-semibold text-[#8c3c3c] hover:bg-[#ffffff] transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </>
  );
}
