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
    <div className="sahara-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e6e0d6] pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#c2652a]" />
          <h3 className="text-xs font-bold text-[#3a302a] uppercase font-body">
            Execution Value Matrix: Public AMM vs. Dark CoW
          </h3>
        </div>
        <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 text-[10px] font-body">
          +${calculations.totalMevSaved.toFixed(2)} NET VALUE SAVED
        </span>
      </div>

      {/* Side by Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body">
        {/* Public AMM Card */}
        <div className="p-4 sahara-inset border-[#8c3c3c]/20 space-y-2.5">
          <div className="flex items-center justify-between text-[#8c3c3c] font-bold">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="h-3.5 w-3.5" /> Public AMM Swap
            </span>
            <span className="text-[10px] text-[#9a9088]">Mempool Exposed</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-[#605850]">
            <div className="flex justify-between">
              <span>LP Swap Fee (0.30%):</span>
              <span className="text-[#3a302a] font-mono">-${calculations.publicAmmFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact / Slippage:</span>
              <span className="text-[#3a302a] font-mono">-${calculations.publicSlippage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sandwich / MEV Exposure:</span>
              <span className="text-[#8c3c3c] font-mono">-${calculations.mevSandwichExposure.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-[#d8d0c8] pt-2 flex justify-between font-bold text-[#3a302a]">
            <span>Estimated Payout:</span>
            <span className="text-[#3a302a] tnum font-mono">${calculations.publicNetReceived.toFixed(2)}</span>
          </div>
        </div>

        {/* Oblivion Dark CoW Card */}
        <div className="p-4 sahara-inset border-[#c2652a]/30 bg-[#fbe8d8]/20 space-y-2.5">
          <div className="flex items-center justify-between text-[#c2652a] font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Oblivion Dark CoW
            </span>
            <span className="text-[10px] text-[#c2652a] font-semibold">Poseidon Sealed</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-[#605850]">
            <div className="flex justify-between">
              <span>Protocol Fee (0.05%):</span>
              <span className="text-[#3a302a] font-mono">-${calculations.oblivionFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact / Slippage:</span>
              <span className="text-[#c2652a] font-bold font-mono">$0.00 (Uniform)</span>
            </div>
            <div className="flex justify-between">
              <span>MEV Protection:</span>
              <span className="text-[#c2652a] font-bold">100% Protected</span>
            </div>
          </div>

          <div className="border-t border-[#d8d0c8] pt-2 flex justify-between font-bold text-[#3a302a]">
            <span>Dark CoW Payout:</span>
            <span className="text-[#c2652a] font-bold tnum font-mono">
              ${calculations.oblivionNetReceived.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-3 rounded-lg bg-[#f6f0e8] border border-[#e6e0d6] flex items-center justify-between text-xs text-[#3a302a] font-body">
        <span className="flex items-center gap-1 text-[11px] text-[#605850]">
          <TrendingUp className="h-3.5 w-3.5 text-[#c2652a]" /> Net Economic Benefit:
        </span>
        <span className="text-[#c2652a] font-bold">
          +{( (calculations.totalMevSaved / Math.max(1, calculations.volumeUsd)) * 100 ).toFixed(2)}% Increased Execution Efficiency
        </span>
      </div>
    </div>
  );
}
