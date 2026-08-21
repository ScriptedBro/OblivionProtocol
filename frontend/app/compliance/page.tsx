"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  ShieldCheck,
} from "lucide-react";
import { uint256 } from "starknet";
import { getProvider, getVault, getAttestEngine } from "@/lib/starknet";
import { useWallet } from "@/lib/wallet";

const ETH =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

const FACT_TYPES: Record<string, string> = {
  "1": "Solvency",
  "2": "Clean Provenance",
  "3": "PnL Audit",
};

interface RecordView {
  subjectHash: string;
  factType: string;
  isValid: boolean;
  issuedAt: number;
  expiresAt: number;
}

function fmtEth(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const frac = (raw % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

export default function CompliancePage() {
  const { account } = useWallet();
  const [busy, setBusy] = useState<"" | "issue" | "solvency">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string; tx?: string } | null>(null);

  // issue form
  const [attId, setAttId] = useState("");
  const [subjectHash, setSubjectHash] = useState("");
  const [factType, setFactType] = useState("1");
  const [durationDays, setDurationDays] = useState("30");

  // lookup
  const [lookupId, setLookupId] = useState("");
  const [record, setRecord] = useState<RecordView | null>(null);
  const [lookupErr, setLookupErr] = useState("");

  // live solvency
  const [vaultAssets, setVaultAssets] = useState<bigint | null>(null);
  const [vaultShares, setVaultShares] = useState<bigint | null>(null);
  const [solvencyResult, setSolvencyResult] = useState<boolean | null>(null);

  const refreshVault = useCallback(async () => {
    try {
      const vault = getVault(getProvider());
      const [assets, shares] = await Promise.all([
        vault.get_total_assets(ETH),
        vault.get_token_shares(ETH),
      ]);
      setVaultAssets(uint256.uint256ToBN(assets));
      setVaultShares(uint256.uint256ToBN(shares));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshVault();
    const t = setInterval(refreshVault, 20000);
    return () => clearInterval(t);
  }, [refreshVault]);

  const handleIssue = async () => {
    if (!account) return;
    if (!attId || !subjectHash.startsWith("0x")) {
      setStatus({ ok: false, msg: "Provide an attestation ID and a subject hash (0x…)." });
      return;
    }
    setBusy("issue");
    setStatus(null);
    try {
      const engine = getAttestEngine(account);
      const res = await engine.verify_and_issue_attestation(
        attId,
        subjectHash,
        factType,
        [], // proof payload — testnet engine validates structure only
        Math.max(1, parseInt(durationDays || "30", 10)) * 86400
      );
      await getProvider().waitForTransaction(res.transaction_hash);
      setStatus({
        ok: true,
        msg: `Attestation "${attId}" issued (${FACT_TYPES[factType]}).`,
        tx: res.transaction_hash,
      });
      setLookupId(attId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Issue failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const handleLookup = async () => {
    setLookupErr("");
    setRecord(null);
    if (!lookupId) return;
    try {
      const engine = getAttestEngine(getProvider());
      const r = await engine.get_attestation(lookupId);
      let valid = false;
      try {
        valid = await engine.is_attestation_valid(lookupId);
      } catch {
        valid = Boolean(r.is_valid);
      }
      setRecord({
        subjectHash: r.subject_hash,
        factType: String(r.fact_type),
        isValid: valid,
        issuedAt: Number(r.issued_at),
        expiresAt: Number(r.expires_at),
      });
    } catch {
      setLookupErr("No attestation found for that ID on this chain.");
    }
  };

  const handleSolvencyProof = async () => {
    if (!account || vaultAssets === null || vaultShares === null) return;
    setBusy("solvency");
    setStatus(null);
    try {
      const engine = getAttestEngine(account);
      const res = await engine.verify_solvency_proof(
        uint256.bnToUint256(vaultAssets),
        uint256.bnToUint256(vaultShares),
        []
      );
      setSolvencyResult(Boolean(res));
      setStatus({
        ok: true,
        msg: `Solvency check executed against live vault state: ${res ? "PROVEN solvent" : "NOT proven"}.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Solvency proof failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d8d0c8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[#3a302a] tracking-tight font-headline">
              ATTEST Engine
            </h1>
            <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 font-body">
              ZK COMPLIANCE
            </span>
          </div>
          <p className="text-xs text-[#605850] mt-1 font-body">
            On-chain attestations over hashed subjects: prove facts about
            shielded capital without revealing it.
          </p>
        </div>
        <div className="text-xs font-mono text-[#605850] sahara-card px-4 py-2.5">
          <span className="text-[#9a9088]">Engine:</span>{" "}
          <a
            href="https://sepolia.voyager.online/contract/0x0103746eaabf31b727865b9da91b978ee5ca3d43a5563580d119497fd77d73e8"
            target="_blank"
            rel="noreferrer"
            className="text-[#c2652a] font-semibold inline-flex items-center gap-1"
          >
            AttestEngine <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {!account && (
        <div className="p-4 sahara-inset border-[#c2652a]/40 text-xs font-body text-[#605850] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#c2652a] shrink-0" />
          Connect a wallet to issue attestations or run the solvency proof. Lookups are public.
        </div>
      )}

      {status && (
        <div
          className={`p-4 sahara-inset text-xs font-mono flex items-start gap-2 ${
            status.ok
              ? "border-[#c2652a]/40 text-[#c2652a] bg-[#fbe8d8]/30"
              : "border-[#8c3c3c]/40 text-[#8c3c3c] bg-[#8c3c3c]/5"
          }`}
        >
          {status.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span className="break-all">
            {status.msg}
            {status.tx && (
              <>
                {" "}
                <a href={`https://sepolia.voyager.online/tx/${status.tx}`} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                  tx <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Issue */}
        <div className="lg:col-span-5 sahara-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
            <FileCheck2 className="h-3.5 w-3.5 text-[#c2652a]" /> Issue Attestation
          </h2>
          <div className="p-3 sahara-inset space-y-1 text-xs font-body">
            <div className="text-[#9a9088] text-[10px] uppercase font-bold">Attestation ID</div>
            <input
              value={attId}
              onChange={(e) => setAttId(e.target.value)}
              placeholder="vault-solvency-aug21"
              className="w-full bg-transparent font-bold text-[#3a302a] outline-none"
            />
          </div>
          <div className="p-3 sahara-inset space-y-1 text-xs font-body">
            <div className="text-[#9a9088] text-[10px] uppercase font-bold">Subject Hash (0x…)</div>
            <input
              value={subjectHash}
              onChange={(e) => setSubjectHash(e.target.value)}
              placeholder="0x…"
              className="w-full bg-transparent font-mono font-semibold text-[#3a302a] outline-none break-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-body">
            <div className="p-3 sahara-inset space-y-1">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Fact Type</div>
              <select
                value={factType}
                onChange={(e) => setFactType(e.target.value)}
                className="w-full bg-white border border-[#d8d0c8] rounded-md px-2 py-1.5 font-bold text-[#3a302a] outline-none"
              >
                <option value="1">1 · Solvency</option>
                <option value="2">2 · Clean Provenance</option>
                <option value="3">3 · PnL Audit</option>
              </select>
            </div>
            <div className="p-3 sahara-inset space-y-1">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Validity (days)</div>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-transparent font-bold text-[#3a302a] outline-none tnum"
              />
            </div>
          </div>
          <button
            onClick={handleIssue}
            disabled={!account || busy !== ""}
            className="w-full py-3.5 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-body"
          >
            {busy === "issue" ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> ISSUING…</>
            ) : (
              <><FileCheck2 className="h-4 w-4" /> ISSUE ATTESTATION</>
            )}
          </button>

          {/* Live solvency */}
          <div className="border-t border-[#e6e0d6] pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-body">
              <span className="font-bold uppercase text-[#3a302a]">Live Vault Solvency</span>
              <span className="font-mono text-[11px] text-[#605850] tnum">
                {vaultAssets !== null ? `${fmtEth(vaultAssets)} ETH` : "…"} /{" "}
                {vaultShares !== null ? vaultShares.toLocaleString("en-US") : "…"} sh
              </span>
            </div>
            <button
              onClick={handleSolvencyProof}
              disabled={!account || busy !== "" || vaultAssets === null}
              className="w-full py-3 rounded-lg bg-[#ffffff] border border-[#d8d0c8] hover:border-[#c2652a] text-[#3a302a] font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-body"
            >
              {busy === "solvency" ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> PROVING…</>
              ) : (
                <><ShieldCheck className="h-4 w-4 text-[#c2652a]" /> RUN SOLVENCY PROOF VS LIVE STATE</>
              )}
            </button>
            {solvencyResult !== null && (
              <div
                className={`p-3 rounded-lg text-xs font-bold font-body ${
                  solvencyResult
                    ? "bg-[#fbe8d8]/50 text-[#c2652a] border border-[#c2652a]/30"
                    : "bg-[#8c3c3c]/5 text-[#8c3c3c] border border-[#8c3c3c]/30"
                }`}
              >
                {solvencyResult ? "PROVEN SOLVENT" : "NOT PROVEN"}
              </div>
            )}
          </div>
        </div>

        {/* Lookup */}
        <div className="lg:col-span-7 sahara-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
            <Search className="h-3.5 w-3.5 text-[#c2652a]" /> Verify Attestation
          </h2>
          <div className="flex gap-2">
            <input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="attestation ID"
              className="flex-1 p-3 sahara-inset bg-transparent font-mono text-sm font-semibold text-[#3a302a] outline-none"
            />
            <button
              onClick={handleLookup}
              className="px-5 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-bold text-xs transition-colors font-body"
            >
              LOOKUP
            </button>
          </div>
          {lookupErr && (
            <p className="text-xs font-mono text-[#8c3c3c]">{lookupErr}</p>
          )}
          {record && (
            <div className="p-5 sahara-inset space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-headline text-lg font-bold text-[#3a302a]">
                  {FACT_TYPES[record.factType] ?? `Type ${record.factType}`}
                </span>
                <span
                  className={`sahara-badge ${
                    record.isValid
                      ? "text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60"
                      : "text-[#8c3c3c]"
                  }`}
                >
                  {record.isValid ? "VALID" : "EXPIRED / REVOKED"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-[#605850]">
                <div>
                  <span className="text-[#9a9088]">Subject:</span>{" "}
                  <span className="text-[#3a302a] break-all">{record.subjectHash.slice(0, 18)}…</span>
                </div>
                <div>
                  <span className="text-[#9a9088]">Issued:</span>{" "}
                  <span className="text-[#3a302a]">{new Date(record.issuedAt * 1000).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#9a9088]">Expires:</span>{" "}
                  <span className="text-[#3a302a]">{new Date(record.expiresAt * 1000).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <p className="text-[11px] font-mono text-[#9a9088] leading-relaxed">
            Testnet note: the deployed engine validates proof structure only.
            Production swaps in Garaga-verified STWO proofs via class-hash
            gating — see OblivionProtocol.md §7.
          </p>
        </div>
      </div>
    </div>
  );
}
