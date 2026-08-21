"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Lock, Clock, ShieldCheck, Zap, AlertCircle, RefreshCw, CheckCircle2, ChevronDown } from "lucide-react";

export default function SwapPage() {
  const [sellToken, setSellToken] = useState("STRK");
  const [buyToken, setBuyToken] = useState("USDC");
  const [sellAmount, setSellAmount] = useState("1000");
  const [buyAmount, setBuyAmount] = useState("480.00");
  const [limitPrice, setLimitPrice] = useState("0.4800");
  const [countdown, setCountdown] = useState(18);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  // Live Batch Countdown simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSwap = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTxSuccess(true);
      setTxHash("0x07f419460965d6d83b2cc919a0f08d11dee212fe367849cfb1afe124ed14b511");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-cyan-400">
          <Lock className="h-3 w-3" /> Sealed Batch Auction Mode
        </div>
        <h1 className="text-3xl font-extrabold text-white">Dark CoW Batch Swap</h1>
        <p className="text-sm text-zinc-400 max-w-lg mx-auto">
          Orders are matched internally at uniform clearing prices verified by Pragma Oracles. Zero MEV, zero frontrunning.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Swap Card */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
          {/* Epoch Status Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span>Batch #1042 Closes In:</span>
            </div>
            <div className="text-emerald-400 font-bold text-sm">{countdown}s</div>
          </div>

          {/* Sell Input */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>You Pay (Shielded Note)</span>
              <span className="font-mono text-emerald-400">Balance: 5,420.00 STRK</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => {
                  setSellAmount(e.target.value);
                  setBuyAmount((parseFloat(e.target.value || "0") * 0.48).toFixed(2));
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white outline-none"
                placeholder="0.0"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 border border-white/10 text-white font-semibold text-sm">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">S</span>
                STRK
              </div>
            </div>
          </div>

          {/* Swap Direction Toggle */}
          <div className="flex justify-center -my-2">
            <div className="h-9 w-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer transition-colors shadow-md">
              <ArrowLeftRight className="h-4 w-4 rotate-90" />
            </div>
          </div>

          {/* Buy Input */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>You Receive (Encrypted Note)</span>
              <span className="font-mono text-cyan-400">Pragma Median: $0.4802</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                readOnly
                value={buyAmount}
                className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-white outline-none"
                placeholder="0.0"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 border border-white/10 text-white font-semibold text-sm">
                <span className="h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">$</span>
                USDC
              </div>
            </div>
          </div>

          {/* Execution Strategy */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-zinc-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Execution Mechanism</span>
              <span className="font-mono text-emerald-400 font-medium">Internal CoW Matching (100% Zero MEV)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Clearing Price Protection</span>
              <span className="font-mono text-zinc-200">Uniform Batch Price ± 0.1%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Gas Routing</span>
              <span className="font-mono text-cyan-400">Sponsored by Paymaster Relay</span>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            onClick={handleSwap}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-base shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" /> Committing Encrypted Order...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" /> Commit Dark Batch Swap
              </>
            )}
          </button>

          {/* Success Receipt */}
          {txSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" /> Order Committed to Batch #1042!
              </div>
              <div className="text-zinc-400 break-all">
                Tx Hash: <a href={`https://starkscan.co/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{txHash}</a>
              </div>
              <div className="text-zinc-300">
                Your buy notes will be minted automatically into the STRK20 pool upon epoch settlement.
              </div>
            </div>
          )}
        </div>

        {/* Live Batch Telemetry Sidebar */}
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Live Batch Telemetry
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="text-zinc-400">Total Pooled CoW Volume</div>
                <div className="text-base font-bold text-white">$142,850.00</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="text-zinc-400">Internal Matched Ratio</div>
                <div className="text-base font-bold text-emerald-400">92.4% (Zero AMM Slippage)</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="text-zinc-400">Pragma Oracle Feed</div>
                <div className="text-base font-bold text-cyan-400">$0.4802 / STRK</div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 border border-white/5 text-xs text-zinc-400 space-y-2">
            <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              How Dark CoW Works
            </div>
            <p className="leading-relaxed">
              Unlike public AMMs, trades inside the Oblivion CoW batch are not broadcast. If Alice wants USDC for STRK and Bob wants STRK for USDC, they swap directly inside the shielded pool at the oracle uniform price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
