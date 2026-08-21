"use client";

import { useState } from "react";
import { Droplets, Lock, TrendingUp, RefreshCw, Plus, ArrowDownToLine, Sparkles, CheckCircle2, Sliders, Shield } from "lucide-react";
import { ShieldedPosition } from "@/lib/starknet";

export default function PoolPage() {
  const [depositAmount, setDepositAmount] = useState("5000");
  const [token, setToken] = useState("STRK");
  const [lowerPrice, setLowerPrice] = useState("0.42");
  const [upperPrice, setUpperPrice] = useState("0.56");
  const [isDepositing, setIsDepositing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [positions, setPositions] = useState<ShieldedPosition[]>([
    {
      noteCommitment: "0x04a8b...19e2",
      token: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      symbol: "STRK",
      amount: "10,000 STRK",
      shares: "10,000.00",
      lowerTick: -1200,
      upperTick: 850,
      accumulatedYield: "+184.50 STRK",
      apy: "41.2%",
      depositedAt: "2 days ago",
    },
    {
      noteCommitment: "0x01f9c...88d1",
      token: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
      symbol: "USDC",
      amount: "2,500 USDC",
      shares: "2,500.00",
      lowerTick: -800,
      upperTick: 1200,
      accumulatedYield: "+42.10 USDC",
      apy: "29.8%",
      depositedAt: "5 hours ago",
    },
  ]);

  const handleDeposit = () => {
    setIsDepositing(true);
    setTimeout(() => {
      setIsDepositing(false);
      const newPos: ShieldedPosition = {
        noteCommitment: `0x0${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
        token: "STRK",
        symbol: token,
        amount: `${depositAmount} ${token}`,
        shares: depositAmount,
        lowerTick: -1000,
        upperTick: 1000,
        accumulatedYield: `+0.00 ${token}`,
        apy: "38.6%",
        depositedAt: "Just now",
      };
      setPositions([newPos, ...positions]);
      setSuccessMsg("Shielded Liquidity Position Deployed to Ekubo Core via privacy_invoke!");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-xs font-mono text-emerald-400">
          <Shield className="h-3 w-3" /> Shielded CLMM Engine
        </div>
        <h1 className="text-3xl font-extrabold text-white">Shielded Concentrated Liquidity</h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Deploy capital into custom Ekubo CLMM tick bounds. Your position size, range limits, and compounding yields are 100% hidden.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Deposit Card */}
        <div className="lg:col-span-1 glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" /> New Shielded LP Position
          </h2>

          {/* Asset Selection */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Deposit Asset</span>
              <span className="font-mono text-emerald-400">Shielded Note</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-mono font-bold text-white outline-none"
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-zinc-800 border border-white/10 text-white font-semibold text-xs px-2.5 py-1.5 rounded-xl outline-none"
              >
                <option value="STRK">STRK</option>
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          {/* Tick Range Boundaries */}
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Concentrated Price Range
              </span>
              <span className="font-mono text-emerald-400">Spot: $0.480</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-xs space-y-1">
                <div className="text-zinc-400 text-[10px]">Min Price (USD)</div>
                <input
                  type="text"
                  value={lowerPrice}
                  onChange={(e) => setLowerPrice(e.target.value)}
                  className="w-full bg-transparent font-mono font-bold text-white text-sm outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-xs space-y-1">
                <div className="text-zinc-400 text-[10px]">Max Price (USD)</div>
                <input
                  type="text"
                  value={upperPrice}
                  onChange={(e) => setUpperPrice(e.target.value)}
                  className="w-full bg-transparent font-mono font-bold text-white text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* APY & Yield Compounding Estimation */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Estimated CLMM APY</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">38.6%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Fee Re-Shielding</span>
              <span className="font-mono text-cyan-400">Automatic (Zero Gas)</span>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-sm shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            {isDepositing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Deploying to Ekubo...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Deposit Shielded LP
              </>
            )}
          </button>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Active Positions Table */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Droplets className="h-4 w-4 text-emerald-400" /> Your Active Shielded Positions
            </h2>
            <div className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
              2 Active Vaults
            </div>
          </div>

          <div className="space-y-4">
            {positions.map((pos, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-zinc-950/70 border border-white/5 hover:border-emerald-500/30 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 font-mono text-sm">
                      {pos.symbol}
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">{pos.amount}</div>
                      <div className="text-xs font-mono text-zinc-400">Note: {pos.noteCommitment}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">{pos.accumulatedYield}</div>
                    <div className="text-[11px] text-zinc-400">APY: {pos.apy}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-zinc-900/60 p-3 rounded-xl border border-white/5 text-zinc-300">
                  <div>
                    <span className="text-zinc-500">Lower Tick:</span> {pos.lowerTick}
                  </div>
                  <div>
                    <span className="text-zinc-500">Upper Tick:</span> {pos.upperTick}
                  </div>
                  <div>
                    <span className="text-zinc-500">Status:</span> In Range
                  </div>
                  <div>
                    <span className="text-zinc-500">Age:</span> {pos.depositedAt}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 text-emerald-400" /> Re-Compound Fees
                  </button>
                  <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5">
                    <ArrowDownToLine className="h-3 w-3" /> Unshield Position
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
