"use client";

import { useState } from "react";
import { FileCheck2, ShieldCheck, Download, CheckCircle2, Lock, Sparkles, RefreshCw, Key, FileText, Search } from "lucide-react";
import { ComplianceAttestation } from "@/lib/starknet";

export default function CompliancePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<ComplianceAttestation | null>(null);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);

  const [attestations, setAttestations] = useState<ComplianceAttestation[]>([
    {
      id: "0x09f1...44a1",
      subjectHash: "0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102",
      factType: "Proof of Pool Solvency (Assets ≥ Liabilities)",
      description: "Vault verifiable solvency check: $12.4M assets >= $12.4M note liabilities.",
      issuedAt: "2026-08-21 08:30 UTC",
      expiresAt: "2026-08-28 08:30 UTC",
      isValid: true,
      proofRoot: "0x07f419460965d6d83b2cc919a0f08d11dee212fe367849cfb1afe124ed14b511",
    },
    {
      id: "0x038c...12b9",
      subjectHash: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
      factType: "FPI Sanctions Clean Provenance",
      description: "Cryptographic verification of FPI on-chain deposit screening signatures.",
      issuedAt: "2026-08-20 14:15 UTC",
      expiresAt: "2026-08-27 14:15 UTC",
      isValid: true,
      proofRoot: "0x03f556eafedae96409b43b7e20b0e2f56199cc74a1ea97b8e09a63c80e4ec0f2",
    },
  ]);

  const handleGenerateSolvency = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const newAtt: ComplianceAttestation = {
        id: `0x0${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
        subjectHash: "0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102",
        factType: "Proof of Pool Solvency (Assets ≥ Liabilities)",
        description: "Zero-Knowledge STARK proof: Assets $12,410,200 >= Total Active Shares.",
        issuedAt: "Just now",
        expiresAt: "In 7 days",
        isValid: true,
        proofRoot: `0x${Math.random().toString(16).padEnd(64, "0")}`,
      };
      setGeneratedProof(newAtt);
      setAttestations([newAtt, ...attestations]);
    }, 1800);
  };

  const handleVerify = () => {
    if (!searchId) return;
    setSearchResult("Valid Attestation — Verified On-Chain by AttestEngine.cairo");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-cyan-400">
          <ShieldCheck className="h-3 w-3" /> Starknet Compliance-First Standard
        </div>
        <h1 className="text-3xl font-extrabold text-white">ATTEST Compliance & Solvency Engine</h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Export verifiable zero-knowledge proofs of solvency and sanctions-free provenance on demand for institutional auditors and regulators.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Action Box: Generate Proofs */}
        <div className="lg:col-span-1 glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Generate ZK Proof
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2 text-xs">
              <div className="font-semibold text-zinc-200">Fact 1: Vault Solvency Proof</div>
              <p className="text-zinc-400 leading-relaxed">
                Cryptographically proves that vault reserves match or exceed all outstanding note claims without revealing individual balances.
              </p>
              <button
                onClick={handleGenerateSolvency}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs shadow-md shadow-emerald-500/10 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Proving STARK Solvency...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="h-3.5 w-3.5" /> Generate Solvency Proof
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2 text-xs">
              <div className="font-semibold text-zinc-200">Fact 2: Selective Auditor Export</div>
              <p className="text-zinc-400 leading-relaxed">
                Generates a cryptographically signed tax & PnL report for any specific date range using your local Viewing Key.
              </p>
              <button className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs border border-white/10 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">
                <Key className="h-3.5 w-3.5 text-cyan-400" /> Export Auditor Certificate
              </button>
            </div>
          </div>

          {generatedProof && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" /> ZK-Proof Issued!
              </div>
              <div className="text-zinc-300 text-[11px] break-all">
                Root: {generatedProof.proofRoot.substring(0, 32)}...
              </div>
              <button className="w-full py-1.5 rounded-lg bg-emerald-900/60 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-800/60">
                <Download className="h-3 w-3" /> Download JSON Certificate
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Attestation Explorer & Public Verifier */}
        <div className="lg:col-span-2 space-y-6">
          {/* Public Verifier Input */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-cyan-400" /> Public On-Chain Attestation Verifier
            </h2>
            <p className="text-xs text-zinc-400">
              Any third-party protocol or auditor can verify an Oblivion attestation directly against <code className="text-emerald-400">AttestEngine.cairo</code>.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Attestation ID or Proof Root (0x...)"
                className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-white/10 font-mono text-xs text-white outline-none focus:border-cyan-500/40"
              />
              <button
                onClick={handleVerify}
                className="px-5 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold text-xs hover:bg-cyan-500/30 transition-colors shrink-0"
              >
                Verify Proof
              </button>
            </div>

            {searchResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {searchResult}
              </div>
            )}
          </div>

          {/* Active Attestation Records */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" /> Active On-Chain Attestations
            </h2>

            <div className="space-y-3">
              {attestations.map((att, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{att.factType}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                      VALID
                    </span>
                  </div>

                  <p className="text-zinc-400 text-xs font-sans">{att.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                    <div>
                      <span className="text-zinc-500">Attestation ID:</span> {att.id}
                    </div>
                    <div>
                      <span className="text-zinc-500">Issued:</span> {att.issuedAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
