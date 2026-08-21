"use client";

import React, { useMemo } from "react";
import { Zap, ShieldCheck, AlertOctagon, TrendingUp, Check, ArrowRight } from "lucide-react";

interface MevComparisonGaugeProps {
  sellAmount: number;
  spotPrice: number;
  tokenSymbol: string;
}

export default function MevComparisonGauge({
  sellAmount,
  spotPrice,
  tokenSymbol,
}: MevComparisonGaugeProps) {
  const calculations = useMemo(() => {
    const volumeUsd = sellAmount * spotPrice;

    // Public AMM Estimates (0.30% fee + 0.45% slippage/price impact + MEV risk on orders > $1,000)
    const publicAmmFee = volumeUsd * 0.003;
    const publicSlippage = volumeUsd * 0.0045;
    const mevSandwichExposure = volumeUsd > 1000 ? volumeUsd * 0.008 : volumeUsd * 0.002;
    const totalPublicLoss = publicAmmFee + publicSlippage + mevSandwichExposure;
    const publicNetReceived = Math.max(0, volumeUsd - totalPublicLoss);

    // Oblivion Dark CoW Batch Estimates (0.05% protocol fee, 0 slippage on crossed volume, 0 MEV)
    const oblivionFee = volumeUsd * 0.0005;
    const oblivionNetReceived = volumeUsd - oblivionFee;
    const totalMevSaved = Math.max(0, oblivionNetReceived - publicNetReceived);

    return {
      volumeUsd,
      publicAmmFee,
      publicSlippage,
      mevSandwichExposure,
      totalPublicLoss,
      publicNetReceived,
      oblivionFee,
      oblivionNetReceived,
      totalMevSaved,
    };
  }, [sellAmount, spotPrice]);

  return (
    <div className="fin-card p-5 space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2634] pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase">
            Execution Value Matrix: Public AMM vs. Dark CoW
          </h3>
        </div>
        <span className="fin-badge text-emerald-400 border-emerald-500/30 bg-emerald-950/20 text-[10px]">
          +${calculations.totalMevSaved.toFixed(2)} NET VALUE SAVED
        </span>
      </div>

      {/* Side by Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Public AMM Card */}
        <div className="p-3.5 fin-inset border-rose-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-rose-400 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="h-3.5 w-3.5" /> Public AMM Swap
            </span>
            <span className="text-[10px] text-zinc-500">Mempool Exposed</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex justify-between">
              <span>LP Swap Fee (0.30%):</span>
              <span className="text-zinc-300">-${calculations.publicAmmFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact / Slippage:</span>
              <span className="text-zinc-300">-${calculations.publicSlippage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sandwich / MEV Exposure:</span>
              <span className="text-rose-400">-${calculations.mevSandwichExposure.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-[#1d222e] pt-2 flex justify-between font-bold text-zinc-200">
            <span>Estimated Payout:</span>
            <span className="text-white tnum">${calculations.publicNetReceived.toFixed(2)}</span>
          </div>
        </div>

        {/* Oblivion Dark CoW Card */}
        <div className="p-3.5 fin-inset border-emerald-500/30 bg-emerald-950/5 space-y-2.5">
          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Oblivion Dark CoW
            </span>
            <span className="text-[10px] text-emerald-500">Poseidon Sealed</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex justify-between">
              <span>Protocol Fee (0.05%):</span>
              <span className="text-zinc-300">-${calculations.oblivionFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact / Slippage:</span>
              <span className="text-emerald-400 font-bold">$0.00 (Uniform)</span>
            </div>
            <div className="flex justify-between">
              <span>MEV Protection:</span>
              <span className="text-emerald-400 font-bold">100% Protected</span>
            </div>
          </div>

          <div className="border-t border-[#1d222e] pt-2 flex justify-between font-bold text-zinc-200">
            <span>Dark CoW Payout:</span>
            <span className="text-emerald-400 font-bold tnum">
              ${calculations.oblivionNetReceived.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-2.5 rounded bg-[#10141d] border border-[#1e2533] flex items-center justify-between text-xs text-zinc-300">
        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Net Economic Benefit:
        </span>
        <span className="text-amber-400 font-bold">
          +{( (calculations.totalMevSaved / Math.max(1, calculations.volumeUsd)) * 100 ).toFixed(2)}% Increased Execution Efficiency
        </span>
      </div>
    </div>
  );
}
