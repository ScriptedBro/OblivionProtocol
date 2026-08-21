"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Hash,
  Gavel,
} from "lucide-react";
import { hash, uint256 } from "starknet";
import { ADDRESSES, getProvider, getCoWMatcher } from "@/lib/starknet";
import { generateRandomFelt } from "@/lib/poseidon";
import { useWallet } from "@/lib/wallet";

const ETH =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const ORDERS_KEY = "oblivion.orders.v1";

interface StoredOrder {
  batchId: number;
  commitment: string;
  secret: string;
  isTokenA: boolean;
  amountRaw: string;
  minPriceRaw: string;
  txHash: string;
  createdAt: number;
}

interface BatchView {
  id: number;
  tokenA: string;
  tokenB: string;
  volumeA: bigint;
  volumeB: bigint;
  clearingPrice: bigint;
  deadline: number;
  settled: boolean;
}

function loadOrders(): StoredOrder[] {
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOrders(orders: StoredOrder[]) {
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function fmt18(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const frac = (raw % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

export default function SwapPage() {
  const { address, account } = useWallet();
  const [currentBatchId, setCurrentBatchId] = useState<bigint | null>(null);
  const [batches, setBatches] = useState<BatchView[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  // open batch form
  const [tokenB, setTokenB] = useState("");
  const [duration, setDuration] = useState("300");

  // commit form
  const [commitBatchId, setCommitBatchId] = useState("");
  const [sideA, setSideA] = useState(true);
  const [amount, setAmount] = useState("");
  const [minPrice, setMinPrice] = useState("");

  // settle form
  const [settleId, setSettleId] = useState("");
  const [clearingPrice, setClearingPrice] = useState("");

  const [busy, setBusy] = useState<"" | "open" | "commit" | "settle">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string; tx?: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const cow = getCoWMatcher(getProvider());
      const cur = uint256.uint256ToBN(await cow.get_current_batch_id());
      setCurrentBatchId(cur);
      const n = Number(cur);
      const views: BatchView[] = [];
      for (let id = n; id > 0 && id > n - 5; id--) {
        try {
          const b = await cow.get_batch(id);
          views.push({
            id,
            tokenA: b.token_a,
            tokenB: b.token_b,
            volumeA: uint256.uint256ToBN(b.total_volume_a),
            volumeB: uint256.uint256ToBN(b.total_volume_b),
            clearingPrice: uint256.uint256ToBN(b.clearing_price),
            deadline: Number(b.deadline),
            settled: b.is_settled,
          });
        } catch {
          /* skip missing */
        }
      }
      setBatches(views);
      setOrders(loadOrders());
    } catch {
      /* RPC hiccup */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleOpen = async () => {
    if (!account || !tokenB.startsWith("0x")) {
      setStatus({ ok: false, msg: "Connect a wallet and paste a valid token-B address." });
      return;
    }
    setBusy("open");
    setStatus(null);
    try {
      const cow = getCoWMatcher(account);
      const res = await cow.open_batch(
        ETH,
        tokenB,
        Math.max(30, parseInt(duration || "300", 10))
      );
      await getProvider().waitForTransaction(res.transaction_hash);
      refresh();
      setStatus({
        ok: true,
        msg: `Batch #${uint256.uint256ToBN(res).toString()} opened (ETH ↔ pasted token).`,
        tx: res.transaction_hash,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Open failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const handleCommit = async () => {
    if (!account) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      setStatus({ ok: false, msg: "Enter an order size." });
      return;
    }
    setBusy("commit");
    setStatus(null);
    try {
      const secret = generateRandomFelt();
      const amountRaw = BigInt(Math.floor(amt * 1e18));
      const minRaw = BigInt(Math.floor(parseFloat(minPrice || "0") * 1e18));
      const bid = BigInt(commitBatchId || (currentBatchId ? currentBatchId.toString() : "0"));
      const commitment = hash.computePoseidonHashOnElements([
        bid,
        sideA ? 1n : 0n,
        amountRaw,
        minRaw,
        secret,
      ]);
      const cow = getCoWMatcher(account);
      const res = await cow.commit_order(
        bid,
        commitment,
        sideA,
        uint256.bnToUint256(amountRaw),
        uint256.bnToUint256(minRaw)
      );
      await getProvider().waitForTransaction(res.transaction_hash);
      const stored = loadOrders();
      stored.unshift({
        batchId: Number(bid),
        commitment,
        secret: secret.toString(),
        isTokenA: sideA,
        amountRaw: amountRaw.toString(),
        minPriceRaw: minRaw.toString(),
        txHash: res.transaction_hash,
        createdAt: Date.now(),
      });
      saveOrders(stored);
      setOrders(stored);
      refresh();
      setStatus({
        ok: true,
        msg: `Order committed to batch #${bid}. Only the hash is public until settlement.`,
        tx: res.transaction_hash,
      });
      setAmount("");
      setMinPrice("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Commit failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const handleSettle = async () => {
    if (!account) return;
    setBusy("settle");
    setStatus(null);
    try {
      const priceRaw = BigInt(Math.floor(parseFloat(clearingPrice || "0") * 1e18));
      const cow = getCoWMatcher(account);
      const res = await cow.settle_batch(
        BigInt(settleId || (currentBatchId ? currentBatchId.toString() : "0")),
        uint256.bnToUint256(priceRaw)
      );
      await getProvider().waitForTransaction(res.transaction_hash);
      refresh();
      setStatus({ ok: true, msg: "Batch settled at the submitted clearing price.", tx: res.transaction_hash });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Settle failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-4)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d8d0c8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[#3a302a] tracking-tight font-headline">Dark Swap</h1>
            <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 font-body">
              SEALED BATCH AUCTION
            </span>
          </div>
          <p className="text-xs text-[#605850] mt-1 font-body">
            Commit hashed orders first, reveal at settlement. One uniform
            clearing price per batch — nothing to sandwich.
          </p>
        </div>
        <div className="text-xs font-mono text-[#605850] sahara-card px-4 py-2.5">
          <span className="text-[#9a9088]">Current batch:</span>{" "}
          <span className="text-[#3a302a] font-semibold tnum">
            {currentBatchId !== null ? `#${currentBatchId.toString()}` : "…"}
          </span>
        </div>
      </div>

      {!address && (
        <div className="p-4 sahara-inset border-[#c2652a]/40 text-xs font-body text-[#605850] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#c2652a] shrink-0" />
          Connect a wallet to open batches, commit orders or settle. Reads work without one.
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
        {/* Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Commit order */}
          <div className="sahara-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
              <Hash className="h-3.5 w-3.5 text-[#c2652a]" /> Commit Sealed Order
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs font-body">
              <div className="p-3 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Batch ID</div>
                <input
                  value={commitBatchId}
                  onChange={(e) => setCommitBatchId(e.target.value)}
                  placeholder={currentBatchId ? currentBatchId.toString() : "…"}
                  className="w-full bg-transparent font-bold text-[#3a302a] outline-none tnum"
                />
              </div>
              <div className="p-3 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Side</div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSideA(true)}
                    className={`flex-1 py-1.5 rounded-md border text-[11px] font-bold transition-all ${sideA ? "bg-white border-[#c2652a] text-[#c2652a]" : "bg-transparent border-[#d8d0c8] text-[#605850]"}`}
                  >
                    Sell A
                  </button>
                  <button
                    onClick={() => setSideA(false)}
                    className={`flex-1 py-1.5 rounded-md border text-[11px] font-bold transition-all ${!sideA ? "bg-white border-[#c2652a] text-[#c2652a]" : "bg-transparent border-[#d8d0c8] text-[#605850]"}`}
                  >
                    Sell B
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 sahara-inset space-y-1 text-xs font-body">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Amount</div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent font-bold text-[#3a302a] text-lg outline-none tnum"
              />
            </div>
            <div className="p-3 sahara-inset space-y-1 text-xs font-body">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Min Limit Price</div>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent font-bold text-[#3a302a] text-lg outline-none tnum"
              />
            </div>
            <button
              onClick={handleCommit}
              disabled={!account || busy !== ""}
              className="w-full py-3.5 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-body"
            >
              {busy === "commit" ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> COMMITTING HASH…</>
              ) : (
                <><Hash className="h-4 w-4" /> COMMIT ORDER</>
              )}
            </button>
          </div>

          {/* Open batch */}
          <div className="sahara-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#c2652a]" /> Open New Batch
            </h2>
            <div className="p-3 sahara-inset space-y-1 text-xs font-body">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Token B Address</div>
              <input
                value={tokenB}
                onChange={(e) => setTokenB(e.target.value)}
                placeholder="0x…"
                className="w-full bg-transparent font-mono font-semibold text-[#3a302a] outline-none break-all"
              />
            </div>
            <div className="p-3 sahara-inset space-y-1 text-xs font-body">
              <div className="text-[#9a9088] text-[10px] uppercase font-bold">Duration (seconds)</div>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-transparent font-bold text-[#3a302a] outline-none tnum"
              />
            </div>
            <button
              onClick={handleOpen}
              disabled={!account || busy !== ""}
              className="w-full py-3 rounded-lg bg-[#ffffff] border border-[#d8d0c8] hover:border-[#c2652a] text-[#3a302a] font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-body"
            >
              {busy === "open" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4 text-[#c2652a]" />}
              OPEN BATCH (ETH ↔ TOKEN B)
            </button>
          </div>

          {/* Settle */}
          <div className="sahara-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
              <Gavel className="h-3.5 w-3.5 text-[#c2652a]" /> Settle Batch
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs font-body">
              <div className="p-3 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Batch ID</div>
                <input
                  value={settleId}
                  onChange={(e) => setSettleId(e.target.value)}
                  placeholder={currentBatchId ? currentBatchId.toString() : "…"}
                  className="w-full bg-transparent font-bold text-[#3a302a] outline-none tnum"
                />
              </div>
              <div className="p-3 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Clearing Price</div>
                <input
                  type="number"
                  value={clearingPrice}
                  onChange={(e) => setClearingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent font-bold text-[#3a302a] outline-none tnum"
                />
              </div>
            </div>
            <button
              onClick={handleSettle}
              disabled={!account || busy !== ""}
              className="w-full py-3 rounded-lg bg-[#ffffff] border border-[#d8d0c8] hover:border-[#c2652a] text-[#3a302a] font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-body"
            >
              {busy === "settle" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4 text-[#c2652a]" />}
              SETTLE AT CLEARING PRICE
            </button>
          </div>
        </div>

        {/* Batch + order lists */}
        <div className="lg:col-span-7 space-y-6">
          <div className="sahara-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#c2652a]" /> Recent Batches (on-chain)
            </h2>
            {batches.length === 0 && (
              <p className="text-xs text-[#605850] font-body py-4 text-center">
                No batches yet. Open one to start an auction.
              </p>
            )}
            <div className="space-y-3">
              {batches.map((b) => (
                <div key={b.id} className="p-4 sahara-inset space-y-2">
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="font-bold text-[#3a302a] tnum">Batch #{b.id}</span>
                    <span className={`sahara-badge ${b.settled ? "" : "text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60"}`}>
                      {b.settled ? "SETTLED" : "OPEN"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-[#605850]">
                    <div>
                      <span className="text-[#9a9088]">Vol A:</span>{" "}
                      <span className="text-[#3a302a] font-semibold">{fmt18(b.volumeA)}</span>
                    </div>
                    <div>
                      <span className="text-[#9a9088]">Vol B:</span>{" "}
                      <span className="text-[#3a302a] font-semibold">{fmt18(b.volumeB)}</span>
                    </div>
                    <div>
                      <span className="text-[#9a9088]">Clear:</span>{" "}
                      <span className="text-[#3a302a] font-semibold">
                        {b.clearingPrice > 0n ? fmt18(b.clearingPrice) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#9a9088] truncate">
                    {short(b.tokenA)} ↔ {short(b.tokenB)} · deadline{" "}
                    {new Date(b.deadline * 1000).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sahara-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2 border-b border-[#e6e0d6] pb-3">
              <Hash className="h-3.5 w-3.5 text-[#c2652a]" /> Your Committed Orders (local secrets)
            </h2>
            {orders.length === 0 && (
              <p className="text-xs text-[#605850] font-body py-4 text-center">
                No committed orders in this browser.
              </p>
            )}
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={`${o.batchId}-${o.commitment}`} className="p-4 sahara-inset flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#3a302a] tnum font-body">
                      Batch #{o.batchId} · sell {o.isTokenA ? "A" : "B"} · {fmt18(BigInt(o.amountRaw))}
                    </div>
                    <div className="text-[10px] font-mono text-[#9a9088] truncate">
                      {short(o.commitment)}
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.voyager.online/tx/${o.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 p-2 rounded-lg bg-white border border-[#d8d0c8] text-[#605850] hover:text-[#c2652a]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ADDRESSES.cowMatcher === "" && (
        <p className="text-[11px] font-mono text-[#8c3c3c]">
          NEXT_PUBLIC_COW_ADDRESS is not configured — check frontend/.env.local.
        </p>
      )}
    </div>
  );
}
