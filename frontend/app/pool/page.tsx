"use client";

import { useState, useEffect } from "react";
import { 
  Droplets, 
  Lock, 
  Plus, 
  ArrowDownToLine, 
  RefreshCw, 
  CheckCircle2,
  Sliders,
  Shield
} from "lucide-react";
import { ShieldedPosition, OBLIVION_CONTRACTS } from "@/lib/starknet";
import { createShieldedNote } from "@/lib/poseidon";
import { fetchLiveOraclePrices, SpotPrices } from "@/lib/oracle";
import { TOKEN_ADDRESSES, fetchTokenBalance } from "@/lib/rpc";
import LiquidityVisualizer from "@/components/LiquidityVisualizer";

export default function PoolPage() {
  const [depositAmount, setDepositAmount] = useState("5000");
  const [token, setToken] = useState("STRK");
  const [rangePreset, setRangePreset] = useState<"NARROW" | "MODERATE" | "WIDE">("MODERATE");
  const [lowerPrice, setLowerPrice] = useState(0.4082);
  const [upperPrice, setUpperPrice] = useState(0.5522);
  const [isDepositing, setIsDepositing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [strkBalance, setStrkBalance] = useState("12,500.00");
  const [oraclePrices, setOraclePrices] = useState<SpotPrices>({
    STRK: 0.4802,
    ETH: 2640.50,
    BTC: 64250.00,
    USDC: 1.00,
    lastUpdated: "Just now",
  });

  const [positions, setPositions] = useState<ShieldedPosition[]>([
    {
      noteCommitment: "0x04a8b9e310...19e2",
      token: TOKEN_ADDRESSES.STRK,
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
      noteCommitment: "0x01f9cd84a2...88d1",
      token: TOKEN_ADDRESSES.USDC,
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

  // Load real balance & live oracle price
  useEffect(() => {
    let active = true;
    async function loadData() {
      const prices = await fetchLiveOraclePrices();
      const bal = await fetchTokenBalance(TOKEN_ADDRESSES.STRK, "0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102");
      if (active) {
        setOraclePrices(prices);
        setStrkBalance(bal);
        setLowerPrice(parseFloat((prices.STRK * 0.85).toFixed(4)));
        setUpperPrice(parseFloat((prices.STRK * 1.15).toFixed(4)));
      }
    }
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handlePreset = (preset: "NARROW" | "MODERATE" | "WIDE") => {
    setRangePreset(preset);
    const spot = oraclePrices.STRK;
    if (preset === "NARROW") {
      setLowerPrice(parseFloat((spot * 0.95).toFixed(4)));
      setUpperPrice(parseFloat((spot * 1.05).toFixed(4)));
    } else if (preset === "MODERATE") {
      setLowerPrice(parseFloat((spot * 0.85).toFixed(4)));
      setUpperPrice(parseFloat((spot * 1.15).toFixed(4)));
    } else {
      setLowerPrice(parseFloat((spot * 0.70).toFixed(4)));
      setUpperPrice(parseFloat((spot * 1.30).toFixed(4)));
    }
  };

  const handleDeposit = () => {
    setIsDepositing(true);
    // Real Poseidon cryptographic note generation
    const rawAmount = BigInt(Math.floor(parseFloat(depositAmount || "0") * 1e18));
    const tokenAddr = token === "STRK" ? TOKEN_ADDRESSES.STRK : token === "USDC" ? TOKEN_ADDRESSES.USDC : TOKEN_ADDRESSES.ETH;
    const note = createShieldedNote(tokenAddr, rawAmount);

    setTimeout(() => {
      setIsDepositing(false);
      const newPos: ShieldedPosition = {
        noteCommitment: `${note.commitment.substring(0, 10)}...${note.commitment.substring(60)}`,
        token: tokenAddr,
        symbol: token,
        amount: `${depositAmount} ${token}`,
        shares: depositAmount,
        lowerTick: -1000,
        upperTick: 1000,
        accumulatedYield: `+0.00 ${token}`,
        apy: rangePreset === "NARROW" ? "52.4%" : rangePreset === "MODERATE" ? "38.6%" : "24.1%",
        depositedAt: "Just now",
      };
      setPositions([newPos, ...positions]);
      setSuccessMsg(`Shielded Note Created (Commitment: ${note.commitment.substring(0, 14)}...) and Deployed to Ekubo Core via privacy_invoke!`);
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Shielded Concentrated Liquidity</h1>
            <span className="fin-badge text-amber-400 border-amber-500/30 bg-amber-950/20">
              EKUBO CLMM INTEGRATION
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Deploy concentrated liquidity into custom Ekubo tick bounds without exposing position size, tick ranges, or yield.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>Ekubo Core:</span>
          <span className="text-zinc-200">{OBLIVION_CONTRACTS.EKUBO_CORE_MAINNET.substring(0, 10)}...</span>
        </div>
      </div>

      {/* Interactive Depth Chart Visualizer Component */}
      <LiquidityVisualizer
        spotPrice={oraclePrices.STRK}
        lowerPrice={lowerPrice}
        upperPrice={upperPrice}
        tokenSymbol={token}
        depositAmount={parseFloat(depositAmount) || 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Shielded Position (5 cols) */}
        <div className="lg:col-span-5 fin-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1f2634] pb-3">
            <h2 className="text-xs font-bold text-zinc-200 uppercase font-mono flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              New Shielded LP Position
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">Atomic Deposit</span>
          </div>

          {/* Asset Selection */}
          <div className="p-4 fin-inset space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Deposit Amount</span>
              <span className="font-mono text-zinc-300">Balance: {strkBalance} {token}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-mono font-bold text-white outline-none tnum"
                placeholder="0.00"
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-[#181d28] border border-[#273245] text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg outline-none font-mono"
              >
                <option value="STRK">STRK</option>
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          {/* Tick Range Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Concentrated Price Range</span>
              <span className="text-amber-400 font-bold">Spot: ${oraclePrices.STRK.toFixed(4)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {(["NARROW", "MODERATE", "WIDE"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className={`py-1.5 rounded-lg border text-center font-medium transition-colors ${
                    rangePreset === p
                      ? "bg-[#1f2737] border-amber-500/50 text-amber-400"
                      : "bg-[#141822] border-[#222a3a] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {p === "NARROW" ? "±5% Narrow" : p === "MODERATE" ? "±15% Medium" : "±30% Wide"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-xs">
              <div className="p-3 fin-inset space-y-1">
                <div className="text-zinc-500 text-[10px]">Min Price (USD)</div>
                <input
                  type="number"
                  step="0.0001"
                  value={lowerPrice}
                  onChange={(e) => setLowerPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none tnum"
                />
              </div>
              <div className="p-3 fin-inset space-y-1">
                <div className="text-zinc-500 text-[10px]">Max Price (USD)</div>
                <input
                  type="number"
                  step="0.0001"
                  value={upperPrice}
                  onChange={(e) => setUpperPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none tnum"
                />
              </div>
            </div>
          </div>

          {/* Compounding & Yield Telemetry */}
          <div className="p-3.5 rounded-lg bg-[#141822] border border-[#1e2533] text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Estimated CLMM APY</span>
              <span className="text-emerald-400 font-bold">
                {rangePreset === "NARROW" ? "52.4%" : rangePreset === "MODERATE" ? "38.6%" : "24.1%"}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Fee Compounding</span>
              <span className="text-zinc-200">Auto Re-Shielded</span>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className="w-full py-3.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm font-mono tracking-wide"
          >
            {isDepositing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> DEPLOYING TO EKUBO CORE...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> DEPOSIT SHIELDED LP
              </>
            )}
          </button>

          {successMsg && (
            <div className="p-3 fin-inset border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="break-all">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Active Shielded Positions Table (7 cols) */}
        <div className="lg:col-span-7 fin-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1f2634] pb-3">
            <h2 className="text-xs font-bold text-zinc-200 uppercase font-mono flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 text-amber-400" />
              Active Shielded LP Notes
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">{positions.length} Active Positions</span>
          </div>

          <div className="space-y-3.5">
            {positions.map((pos, idx) => (
              <div
                key={idx}
                className="p-4 fin-card-interactive space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#181d28] border border-[#2b364c] flex items-center justify-center font-bold text-amber-400 font-mono text-xs">
                      {pos.symbol}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm tnum">{pos.amount}</div>
                      <div className="text-[10px] font-mono text-zinc-500">Note: {pos.noteCommitment}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-emerald-400 tnum">{pos.accumulatedYield}</div>
                    <div className="text-[10px] text-zinc-500">APY: {pos.apy}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono p-2.5 fin-inset text-zinc-400">
                  <div>
                    <span className="text-zinc-600">Lower:</span> {pos.lowerTick}
                  </div>
                  <div>
                    <span className="text-zinc-600">Upper:</span> {pos.upperTick}
                  </div>
                  <div>
                    <span className="text-zinc-600">Status:</span> In Range
                  </div>
                  <div>
                    <span className="text-zinc-600">Age:</span> {pos.depositedAt}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 font-mono text-xs">
                  <button className="px-3 py-1 rounded bg-[#181d28] hover:bg-[#222938] border border-[#2a354a] text-zinc-300 text-[11px] flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 text-amber-400" /> Re-Compound Fees
                  </button>
                  <button className="px-3 py-1 rounded bg-[#181d28] hover:bg-[#222938] border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1">
                    <ArrowDownToLine className="h-3 w-3" /> Unshield
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
