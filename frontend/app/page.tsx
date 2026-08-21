"use client";

import Link from "next/link";
import { Shield, ArrowRight, Droplets, ArrowLeftRight, FileCheck2, Lock, Zap, Award, Layers, TrendingUp, CheckCircle } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      title: "Shielded Concentrated Liquidity",
      description: "Deploy capital into custom Ekubo CLMM tick bounds without leaking position size, tick ranges, or compounding yield.",
      href: "/pool",
      icon: Droplets,
      badge: "Ekubo CLMM",
    },
    {
      title: "Dark CoW Batch Auctions",
      description: "Match internal buy & sell notes at uniform clearing prices verified by Pragma Oracles before routing residual imbalance. Zero MEV.",
      href: "/swap",
      icon: ArrowLeftRight,
      badge: "Zero-Slippage",
    },
    {
      title: "ATTEST Compliance Engine",
      description: "Export on-demand Zero-Knowledge Proofs of Pool Solvency and FPI Clean Provenance certificates for institutional auditors.",
      href: "/compliance",
      icon: FileCheck2,
      badge: "Compliance-First",
    },
  ];

  const metrics = [
    { label: "Shielded TVL Capacity", value: "$12.4M", change: "+24.8%" },
    { label: "Internal CoW Netting Ratio", value: "84.2%", change: "Zero MEV" },
    { label: "Avg Shielded LP Fee APY", value: "38.6%", change: "Auto-Compounded" },
    { label: "Solvency Proof Verifications", value: "100%", change: "Cryptographically Sound" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-mono text-emerald-400 backdrop-blur-md">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          Live on Starknet Mainnet & STRK20 Privacy Pool
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          The Sovereign <span className="emerald-gradient-text">Dark Liquidity</span> & Confidential Engine
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
          Oblivion Protocol enables institutional concentrated liquidity and zero-MEV batch execution on Starknet without exposing balances, tick bounds, or trading alpha.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/swap"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all"
          >
            Launch Dark AMM <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pool"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-6 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-all"
          >
            <Droplets className="h-4 w-4 text-emerald-400" /> Provide Shielded LP
          </Link>
          <Link
            href="/compliance"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-6 py-3.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-950/50 transition-all"
          >
            <FileCheck2 className="h-4 w-4" /> ATTEST Portal
          </Link>
        </div>
      </div>

      {/* Live Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
        {metrics.map((m, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">{m.label}</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{m.value}</div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 pt-1">
              <TrendingUp className="h-3 w-3" /> {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* Core Protocol Pillars */}
      <div className="mt-20 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Three Pillars of Confidential Finance</h2>
          <p className="text-sm text-zinc-400">Architected natively with Cairo 2.8+ smart contracts using atomic STRK20 privacy_invoke</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div key={idx} className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-white/5">{f.badge}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
                </div>

                <div className="pt-6">
                  <Link href={f.href} className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                    Explore Module <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Threat Model & Architectural Superiority */}
      <div className="mt-20 glass-panel-glow rounded-3xl p-8 border border-emerald-500/20 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Cryptographic Boundary: Hidden vs. Verifiable
            </h3>
            <p className="text-xs text-zinc-400 mt-1">StarkWare Compliance-First Architecture Standard</p>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            FPI Sanctions Screened
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="rounded-xl bg-zinc-950/60 p-4 border border-emerald-500/10 space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> 100% Cryptographically Hidden
            </div>
            <ul className="space-y-1.5 text-zinc-300">
              <li>• Individual LP balances, wallet addresses & pool share %</li>
              <li>• Custom price tick ranges and rebalancing thresholds</li>
              <li>• Trader identity, order size, and limit price parameters</li>
              <li>• Auto-compounded fee distribution across private notes</li>
            </ul>
          </div>

          <div className="rounded-xl bg-zinc-950/60 p-4 border border-cyan-500/10 space-y-2">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Publicly Verifiable on Starknet
            </div>
            <ul className="space-y-1.5 text-zinc-300">
              <li>• Aggregate pooled liquidity deployed in Ekubo Core</li>
              <li>• Uniform clearing price verified against Pragma Oracle</li>
              <li>• FPI on-chain deposit sanctions clearance signatures</li>
              <li>• Zero-Knowledge Proofs of Vault Solvency (Assets ≥ Shares)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
