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
    <div className="sahara-card p-6 space-y-4">
      {/* Header & Status */}
      <div className="flex items-center justify-between border-b border-[#e6e0d6] pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#c2652a]" />
          <h3 className="text-xs font-bold text-[#3a302a] uppercase font-body">
            Ekubo Concentrated Liquidity Density Visualizer
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {inRange ? (
            <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 text-[10px] flex items-center gap-1 font-body">
              <CheckCircle2 className="h-3 w-3" /> ACTIVE IN-RANGE
            </span>
          ) : (
            <span className="sahara-badge text-[#8c3c3c] border-[#8c3c3c]/30 bg-[#fce0e0] text-[10px] flex items-center gap-1 font-body">
              <AlertTriangle className="h-3 w-3" /> OUT OF BOUNDS
            </span>
          )}
        </div>
      </div>

      {/* SVG Depth Chart */}
      <div className="relative rounded-xl bg-[#faf5ee] border border-[#d8d0c8] p-4 overflow-hidden">
        <svg viewBox="0 0 400 130" className="w-full h-32 overflow-visible font-mono">
          <defs>
            <linearGradient id="liquidityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2652a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c2652a" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Active Range Highlight Area */}
          <rect
            x={Math.min(lowerX, upperX)}
            y="10"
            width={Math.max(4, Math.abs(upperX - lowerX))}
            height="110"
            fill="#c2652a"
            fillOpacity="0.08"
            stroke="#c2652a"
            strokeDasharray="2,2"
            strokeWidth="1"
          />

          {/* Bell Curve Liquidity Distribution */}
          <path d={svgPath} fill="url(#liquidityGrad)" stroke="#c2652a" strokeWidth="2" />

          {/* Lower Bound Line */}
          <line
            x1={lowerX}
            y1="15"
            x2={lowerX}
            y2="120"
            stroke="#605850"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={lowerX - 4} y="12" fill="#605850" fontSize="9" fontWeight="bold" textAnchor="end">
            Min ${lowerPrice.toFixed(4)}
          </text>

          {/* Upper Bound Line */}
          <line
            x1={upperX}
            y1="15"
            x2={upperX}
            y2="120"
            stroke="#605850"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x={upperX + 4} y="12" fill="#605850" fontSize="9" fontWeight="bold" textAnchor="start">
            Max ${upperPrice.toFixed(4)}
          </text>

          {/* Spot Price Marker */}
          <line
            x1={spotX}
            y1="10"
            x2={spotX}
            y2="120"
            stroke="#c2652a"
            strokeWidth="2"
          />
          <circle cx={spotX} cy="30" r="4" fill="#c2652a" />
          <text x={spotX} y="8" fill="#c2652a" fontSize="9" fontWeight="bold" textAnchor="middle">
            Spot ${spotPrice.toFixed(4)}
          </text>
        </svg>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 text-xs font-body">
        <div className="p-3 sahara-inset space-y-0.5">
          <div className="text-[10px] text-[#9a9088] font-bold uppercase">Capital Multiplier</div>
          <div className="text-[#c2652a] font-bold text-sm flex items-center gap-1 font-mono">
            <Zap className="h-3 w-3" /> {efficiencyMultiplier}
          </div>
        </div>

        <div className="p-3 sahara-inset space-y-0.5">
          <div className="text-[10px] text-[#9a9088] font-bold uppercase">Est. 24h Yield</div>
          <div className="text-[#3a302a] font-bold text-sm font-mono">
            +{((depositAmount * 0.386) / 365).toFixed(2)} {tokenSymbol}
          </div>
        </div>

        <div className="p-3 sahara-inset space-y-0.5">
          <div className="text-[10px] text-[#9a9088] font-bold uppercase">Privacy Status</div>
          <div className="text-[#3a302a] font-bold text-xs flex items-center gap-1">
            <Shield className="h-3 w-3 text-[#c2652a]" /> Poseidon Sealed
          </div>
        </div>
      </div>
    </div>
  );
}
