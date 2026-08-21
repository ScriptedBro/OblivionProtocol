"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Droplets,
  ArrowLeftRight,
  FileCheck2,
  EyeOff,
  Copy,
  Scale,
  Activity,
} from "lucide-react";
import {
  getProvider,
  getVault,
  getCoWMatcher,
  getYieldRouter,
} from "@/lib/starknet";
import { uint256 } from "starknet";

const ETH =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

interface LiveStats {
  tvlEth: string | null;
  totalShares: string | null;
  batchesOpened: string | null;
  yieldRouted: string | null;
}

function fmtEth(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const frac = (raw % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

export default function HomePage() {
  const [stats, setStats] = useState<LiveStats>({
    tvlEth: null,
    totalShares: null,
    batchesOpened: null,
    yieldRouted: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = getProvider();
        const vault = getVault(p);
        const cow = getCoWMatcher(p);
        const router = getYieldRouter(p);
        const [assets, shares, batchId, routed] = await Promise.all([
          vault.get_total_assets(ETH),
          vault.get_token_shares(ETH),
          cow.get_current_batch_id(),
          router.get_total_harvested_yield(ETH),
        ]);
        if (!active) return;
        setStats({
          tvlEth: fmtEth(uint256.uint256ToBN(assets)),
          totalShares: uint256.uint256ToBN(shares).toLocaleString("en-US"),
          batchesOpened: uint256.uint256ToBN(batchId).toString(),
          yieldRouted: fmtEth(uint256.uint256ToBN(routed)),
        });
      } catch {
        /* leave nulls — UI renders honest placeholders */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { label: "Shielded TVL (ETH)", value: stats.tvlEth ?? "—", sub: "OblivionVault · live" },
    { label: "LP Shares Outstanding", value: stats.totalShares ?? "—", sub: "per-token ledger" },
    { label: "Batches Opened", value: stats.batchesOpened ?? "—", sub: "CoWMatcher · live" },
    { label: "Yield Routed (ETH)", value: stats.yieldRouted ?? "—", sub: "YieldRouter · live" },
  ];

  const pillars = [
    {
      icon: Droplets,
      title: "Shielded Concentrated Liquidity",
      body: "Deposit into tick-bounded CLMM positions where size, range and compounding fees are hidden behind ZK note commitments. The chain sees a pool action; nobody sees your position.",
      href: "/pool",
      cta: "Open a shielded position",
    },
    {
      icon: ArrowLeftRight,
      title: "Dark Batch Auctions",
      body: "Orders are committed as hashes first, revealed and cleared in sealed batches at one uniform clearing price. No order-flow leakage, no sandwich attacks, no priority games.",
      href: "/swap",
      cta: "Enter a dark batch",
    },
    {
      icon: FileCheck2,
      title: "ZK Solvency Compliance",
      body: "Prove a vault is solvent, or a book is clean, without revealing balances or counterparties. Regulators get answers; the market keeps its secrets.",
      href: "/compliance",
      cta: "Verify an attestation",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Shield",
      body: "Public tokens enter the STRK20 privacy pool and come back as ZK note commitments that only you can spend or view.",
    },
    {
      n: "02",
      title: "Route",
      body: "The pool executes your intent privately — concentrated LP positions, batch-committed orders — via privacy_invoke payloads.",
    },
    {
      n: "03",
      title: "Compound",
      body: "Fees and lending yield are harvested and re-shielded automatically. Growth happens off the public ledger.",
    },
    {
      n: "04",
      title: "Prove",
      body: "When compliance demands answers, zero-knowledge attestations prove solvency and provenance without opening the books.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="pt-16 pb-14 text-center max-w-3xl mx-auto">
        <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 font-body mb-6">
          <Activity className="h-3 w-3" /> LIVE ON STARKNET SEPOLIA
        </span>
        <h1 className="font-headline text-5xl sm:text-6xl font-bold text-[#3a302a] tracking-tight leading-[1.05]">
          The confidential
          <br />
          liquidity layer for{" "}
          <span className="text-[#c2652a]">Starknet</span>.
        </h1>
        <p className="mt-6 text-base text-[#605850] font-body leading-relaxed max-w-2xl mx-auto">
          Public blockchains expose every position, every order, every
          counterparty. Oblivion Protocol routes STRK20 shielded capital
          through concentrated liquidity and sealed batch auctions — with
          zero-knowledge proofs answering regulators instead of leaked data.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/pool"
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-bold text-sm transition-all shadow-[0_4px_16px_rgba(194,101,42,0.25)]"
          >
            Launch App <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/ScriptedBro/OblivionProtocol"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#ffffff] border border-[#d8d0c8] hover:border-[#c2652a] text-[#3a302a] font-semibold text-sm transition-all"
          >
            View Contracts <ArrowRight className="h-4 w-4 rotate-[-45deg]" />
          </a>
        </div>
      </section>

      {/* Live Protocol Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-16">
        {statCards.map((s) => (
          <div key={s.label} className="sahara-card p-5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#9a9088] font-body">
              {s.label}
            </div>
            <div className="mt-1.5 font-headline text-2xl font-bold text-[#3a302a] tnum">
              {s.value}
            </div>
            <div className="mt-1 text-[10px] font-mono text-[#c2652a]">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Problem */}
      <section className="pb-16">
        <div className="max-w-2xl">
          <h2 className="font-headline text-3xl font-bold text-[#3a302a] tracking-tight">
            On today&apos;s DeFi, transparency is a tax.
          </h2>
          <p className="mt-3 text-sm text-[#605850] font-body leading-relaxed">
            Every LP position and limit order is broadcast to the world before
            it executes. That visibility is monetized against you.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: EyeOff,
              title: "Position front-running",
              body: "Large visible positions get targeted: liquidity ranges are gamed and exits are front-run by bots reading the mempool.",
            },
            {
              icon: Copy,
              title: "Strategy copy-trading",
              body: "Wallet analytics firms sell your entire strategy. Your edge becomes someone else's signal the moment you act.",
            },
            {
              icon: Scale,
              title: "Compliance vs. privacy",
              body: "Institutions need to prove solvency and clean provenance — but full transparency exposes counterparties and proprietary books.",
            },
          ].map((p) => (
            <div key={p.title} className="sahara-card p-6 space-y-2.5">
              <div className="h-9 w-9 rounded-lg bg-[#fbe8d8] flex items-center justify-center">
                <p.icon className="h-4.5 w-4.5 text-[#c2652a]" />
              </div>
              <h3 className="font-headline text-lg font-bold text-[#3a302a]">{p.title}</h3>
              <p className="text-xs text-[#605850] font-body leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="pb-16">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-[#c2652a]" />
          <h2 className="font-headline text-3xl font-bold text-[#3a302a] tracking-tight">
            Three primitives, one privacy layer.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="sahara-card p-6 space-y-3 group hover:border-[#c2652a]/50 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-[#fbe8d8] flex items-center justify-center group-hover:scale-105 transition-transform">
                <p.icon className="h-5 w-5 text-[#c2652a]" />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#3a302a]">{p.title}</h3>
              <p className="text-xs text-[#605850] font-body leading-relaxed min-h-[72px]">
                {p.body}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c2652a] font-body">
                {p.cta} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="pb-20">
        <h2 className="font-headline text-3xl font-bold text-[#3a302a] tracking-tight mb-6">
          How it works.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="sahara-card p-6 space-y-2 relative overflow-hidden">
              <span className="absolute top-3 right-4 font-headline text-4xl font-bold text-[#f2ece4] select-none">
                {s.n}
              </span>
              <h3 className="font-headline text-lg font-bold text-[#c2652a]">{s.title}</h3>
              <p className="text-xs text-[#605850] font-body leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-mono text-[#9a9088] leading-relaxed">
          Testnet build: the STRK20 pool executor runs as a permissionless
          stand-in contract with real ERC-20 custody; production swaps in the
          audited STRK20 pool via the same privacy_invoke interface.
        </p>
      </section>
    </div>
  );
}
