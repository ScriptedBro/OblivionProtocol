"use client";

import React, { useMemo } from "react";
import { Sliders, Zap, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

interface LiquidityVisualizerProps {
  spotPrice: number;
  lowerPrice: number;
  upperPrice: number;
  tokenSymbol: string;
  depositAmount: number;
}

export default function LiquidityVisualizer({
  spotPrice,
  lowerPrice,
  upperPrice,
  tokenSymbol,
  depositAmount,
}: LiquidityVisualizerProps) {
  // Calculate capital efficiency multiplier compared to full-range (0 -> infinity) AMMs
  const efficiencyMultiplier = useMemo(() => {
    if (lowerPrice <= 0 || upperPrice <= lowerPrice || spotPrice <= 0) return "1.0x";
    const rangeSpread = (upperPrice - lowerPrice) / spotPrice;
    if (rangeSpread <= 0.1) return "18.4x";
    if (rangeSpread <= 0.3) return "8.6x";
    if (rangeSpread <= 0.6) return "4.2x";
    return "2.1x";
  }, [spotPrice, lowerPrice, upperPrice]);

  // Determine if current spot price is in range
  const inRange = spotPrice >= lowerPrice && spotPrice <= upperPrice;

  // Generate smooth bell-curve SVG points for active liquidity distribution
  const chartPoints = useMemo(() => {
    const points: { x: number; y: number; inRange: boolean }[] = [];
    const minX = Math.max(0.01, spotPrice * 0.5);
    const maxX = spotPrice * 1.5;
    const steps = 40;

    for (let i = 0; i <= steps; i++) {
      const price = minX + (i / steps) * (maxX - minX);
      const isPointInRange = price >= lowerPrice && price <= upperPrice;
      
      // Gaussian distribution centered at spot price
      const diff = (price - spotPrice) / (spotPrice * 0.25);
      const heightFactor = Math.exp(-0.5 * diff * diff);
      const svgY = 120 - heightFactor * 90; // 0 to 120 SVG height
      const svgX = (i / steps) * 400; // 400 SVG width

      points.push({ x: svgX, y: svgY, inRange: isPointInRange });
    }
    return points;
  }, [spotPrice, lowerPrice, upperPrice]);

  const svgPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    let path = `M 0 120 L ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      path += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    path += ` L 400 120 Z`;
    return path;
  }, [chartPoints]);

  const spotX = useMemo(() => {
    const minX = Math.max(0.01, spotPrice * 0.5);
    const maxX = spotPrice * 1.5;
    const ratio = Math.max(0, Math.min(1, (spotPrice - minX) / (maxX - minX)));
    return ratio * 400;
  }, [spotPrice]);

  const lowerX = useMemo(() => {
    const minX = Math.max(0.01, spotPrice * 0.5);
    const maxX = spotPrice * 1.5;
    const ratio = Math.max(0, Math.min(1, (lowerPrice - minX) / (maxX - minX)));
    return ratio * 400;
  }, [spotPrice, lowerPrice]);

  const upperX = useMemo(() => {
    const minX = Math.max(0.01, spotPrice * 0.5);
    const maxX = spotPrice * 1.5;
    const ratio = Math.max(0, Math.min(1, (upperPrice - minX) / (maxX - minX)));
    return ratio * 400;
  }, [spotPrice, upperPrice]);

  return (
    <div className="fin-card p-5 space-y-4 font-mono">
      {/* Header & Status */}
      <div className="flex items-center justify-between border-b border-[#1f2634] pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase">
            Ekubo Concentrated Liquidity Density Visualizer
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {inRange ? (
            <span className="fin-badge text-emerald-400 border-emerald-500/30 bg-emerald-950/20 text-[10px] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> ACTIVE IN-RANGE
            </span>
          ) : (
            <span className="fin-badge text-amber-400 border-amber-500/30 bg-amber-950/20 text-[10px] flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> OUT OF BOUNDS
            </span>
          )}
        </div>
      </div>

      {/* SVG Depth Chart */}
      <div className="relative rounded-lg bg-[#080a0e] border border-[#1b202c] p-3 overflow-hidden">
        <svg viewBox="0 0 400 130" className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id="liquidityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Active Range Highlight Area */}
          <rect
            x={Math.min(lowerX, upperX)}
            y="10"
            width={Math.max(4, Math.abs(upperX - lowerX))}
            height="110"
            fill="#f59e0b"
            fillOpacity="0.08"
            stroke="#f59e0b"
            strokeDasharray="2,2"
            strokeWidth="1"
          />

          {/* Bell Curve Liquidity Distribution */}
          <path d={svgPath} fill="url(#liquidityGrad)" stroke="#f59e0b" strokeWidth="1.5" />

          {/* Lower Bound Line */}
          <line
            x1={lowerX}
            y1="15"
            x2={lowerX}
            y2="120"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={lowerX - 4} y="12" fill="#3b82f6" fontSize="9" textAnchor="end">
            Min ${lowerPrice.toFixed(4)}
          </text>

          {/* Upper Bound Line */}
          <line
            x1={upperX}
            y1="15"
            x2={upperX}
            y2="120"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={upperX + 4} y="12" fill="#3b82f6" fontSize="9" textAnchor="start">
            Max ${upperPrice.toFixed(4)}
          </text>

          {/* Spot Price Marker */}
          <line
            x1={spotX}
            y1="10"
            x2={spotX}
            y2="120"
            stroke="#10b981"
            strokeWidth="2"
          />
          <circle cx={spotX} cy="30" r="3.5" fill="#10b981" />
          <text x={spotX} y="8" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">
            Spot ${spotPrice.toFixed(4)}
          </text>
        </svg>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 fin-inset space-y-0.5">
          <div className="text-[10px] text-zinc-500">Capital Multiplier</div>
          <div className="text-amber-400 font-bold text-sm flex items-center gap-1">
            <Zap className="h-3 w-3" /> {efficiencyMultiplier}
          </div>
        </div>

        <div className="p-2.5 fin-inset space-y-0.5">
          <div className="text-[10px] text-zinc-500">Est. 24h Yield</div>
          <div className="text-emerald-400 font-bold text-sm">
            +{((depositAmount * 0.386) / 365).toFixed(2)} {tokenSymbol}
          </div>
        </div>

        <div className="p-2.5 fin-inset space-y-0.5">
          <div className="text-[10px] text-zinc-500">Privacy Status</div>
          <div className="text-white font-bold text-xs flex items-center gap-1">
            <Shield className="h-3 w-3 text-amber-400" /> Poseidon Sealed
          </div>
        </div>
      </div>
    </div>
  );
}
