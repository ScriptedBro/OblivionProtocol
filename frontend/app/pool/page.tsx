"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Droplets,
  Lock,
  Plus,
  ArrowDownToLine,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Contract, uint256 } from "starknet";
import { ADDRESSES, getProvider, getVault, getMockPool } from "@/lib/starknet";
import { createShieldedNote } from "@/lib/poseidon";
import { useWallet } from "@/lib/wallet";

const TOKENS = {
  ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
} as const;
const NOTES_KEY = "oblivion.notes.v1";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "balance_of",
    type: "function",
    inputs: [
      { name: "account", type: "core::starknet::contract_address::ContractAddress" },
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
];

interface StoredNote {
  token: string;
  commitment: string;
  secret: string;
  nullifier: string;
  amountRaw: string;
  lowerTick: number;
  upperTick: number;
  txHash: string;
  createdAt: number;
}

interface OnChainPosition {
  shares: bigint;
  lowerTick: number;
  upperTick: number;
  depositedAt: number;
}

function loadNotes(): StoredNote[] {
  try {
    return JSON.parse(window.localStorage.getItem(NOTES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: StoredNote[]) {
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function fmtEth(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const frac = (raw % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

function priceToTick(price: number): number {
  // Ekubo-style geometric ticks: price = 1.0001^tick
  return Math.max(1, Math.round(Math.log(price) / Math.log(1.0001)));
}

export default function PoolPage() {
  const { address, account } = useWallet();
  const [amount, setAmount] = useState("");
  const [symbol, setSymbol] = useState<keyof typeof TOKENS>("STRK");
  const [lowerPrice, setLowerPrice] = useState("");
  const [upperPrice, setUpperPrice] = useState("");
  const [busy, setBusy] = useState<"" | "approve" | "deposit" | "withdraw">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string; tx?: string } | null>(null);
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [vaultTvl, setVaultTvl] = useState<bigint | null>(null);
  const [vaultShares, setVaultShares] = useState<bigint | null>(null);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [positions, setPositions] = useState<Record<string, OnChainPosition | null>>({});

  const refreshChain = useCallback(async () => {
    try {
      const p = getProvider();
      const vault = getVault(p);
      const [assets, shares] = await Promise.all([
        vault.get_total_assets(TOKENS[symbol]),
        vault.get_token_shares(TOKENS[symbol]),
      ]);
      setVaultTvl(uint256.uint256ToBN(assets));
      setVaultShares(uint256.uint256ToBN(shares));
    } catch {
      /* RPC hiccup — leave previous values */
    }
  }, [symbol]);

  const refreshPositions = useCallback(async () => {
    const stored = loadNotes();
    setNotes(stored);
    if (stored.length === 0) return;
    try {
      const vault = getVault(getProvider());
      const entries = await Promise.all(
        stored.map(async (n) => {
          try {
            const pos = await vault.get_position(n.commitment);
            const shares = uint256.uint256ToBN(pos.shares);
            return [
              n.commitment,
              shares > 0n
                ? {
                    shares,
                    lowerTick: Number(pos.lower_tick),
                    upperTick: Number(pos.upper_tick),
                    depositedAt: Number(pos.deposited_at),
                  }
                : null,
            ] as const;
          } catch {
            return [n.commitment, null] as const;
          }
        })
      );
      setPositions(Object.fromEntries(entries));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshChain();
    refreshPositions();
    const t = setInterval(refreshChain, 20000);
    return () => clearInterval(t);
  }, [refreshChain, refreshPositions]);

  useEffect(() => {
    if (!address) {
      setEthBalance(null);
      return;
    }
    (async () => {
      try {
        const erc20 = new Contract(ERC20_ABI, TOKENS[symbol], getProvider());
        const res = await erc20.balance_of(address);
        setEthBalance(uint256.uint256ToBN(res));
      } catch {
        setEthBalance(null);
      }
    })();
  }, [address, notes.length]);

  const handleDeposit = async () => {
    if (!account || !address) return;
    setStatus(null);
    const amt = parseFloat(amount);
    const lo = parseFloat(lowerPrice);
    const hi = parseFloat(upperPrice);
    if (!(amt > 0) || !(lo > 0) || !(hi > lo)) {
      setStatus({ ok: false, msg: "Enter an amount and a valid price range (max > min)." });
      return;
    }
    const rawAmount = BigInt(Math.floor(amt * 1e18));
    const tickL = priceToTick(lo);
    const tickR = priceToTick(hi);

    try {
      setBusy("approve");
      const eth = new Contract(ERC20_ABI, TOKENS[symbol], account);
      await eth.approve(ADDRESSES.mockPool, uint256.bnToUint256(rawAmount));

      setBusy("deposit");
      const note = createShieldedNote(TOKENS[symbol], rawAmount);
      const pool = getMockPool(account);
      const res = await pool.pool_deposit(
        note.commitment,
        TOKENS[symbol],
        uint256.bnToUint256(rawAmount),
        tickL,
        tickR
      );
      const txHash = res.transaction_hash;
      await getProvider().waitForTransaction(txHash);

      const stored = loadNotes();
      stored.unshift({
        token: symbol,
        commitment: note.commitment,
        secret: note.secret.toString(),
        nullifier: note.nullifier.toString(),
        amountRaw: rawAmount.toString(),
        lowerTick: tickL,
        upperTick: tickR,
        txHash,
        createdAt: Date.now(),
      });
      saveNotes(stored);
      setNotes(stored);
      refreshPositions();
      refreshChain();
      setStatus({
        ok: true,
        msg: `Shielded LP note minted. Commitment ${note.commitment.slice(0, 14)}… saved locally — keep it, it is the only key to this position.`,
        tx: txHash,
      });
      setAmount("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Transaction failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const handleWithdraw = async (note: StoredNote) => {
    if (!account) return;
    setStatus(null);
    const pos = positions[note.commitment];
    if (!pos || pos.shares === 0n) return;
    try {
      setBusy("withdraw");
      const pool = getMockPool(account);
      const res = await pool.pool_withdraw(
        note.commitment,
        uint256.bnToUint256(pos.shares),
        TOKENS[note.token as keyof typeof TOKENS] ?? note.token
      );
      await getProvider().waitForTransaction(res.transaction_hash);
      refreshPositions();
      refreshChain();
      setStatus({
        ok: true,
        msg: `Unshielded ${fmtEth(pos.shares)} shares back to your wallet.`,
        tx: res.transaction_hash,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ ok: false, msg: `Withdraw failed: ${msg}` });
    } finally {
      setBusy("");
    }
  };

  const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d8d0c8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[#3a302a] tracking-tight font-headline">
              Shielded Concentrated Liquidity
            </h1>
            <span className="sahara-badge text-[#c2652a] border-[#c2652a]/30 bg-[#fbe8d8]/60 font-body">
              SEPOLIA TESTNET
            </span>
          </div>
          <p className="text-xs text-[#605850] mt-1 font-body">
            Tick-bounded LP positions hidden behind Poseidon note commitments.
            The chain records a commitment hash — not your size, range or identity.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#605850] sahara-card px-4 py-2.5">
          <div>
            <span className="text-[#9a9088]">TVL:</span>{" "}
            <span className="text-[#3a302a] font-semibold tnum">
              {vaultTvl !== null ? `${fmtEth(vaultTvl)} ETH` : "…"}
            </span>
          </div>
          <div>
            <span className="text-[#9a9088]">Shares:</span>{" "}
            <span className="text-[#3a302a] font-semibold tnum">
              {vaultShares !== null ? vaultShares.toLocaleString("en-US") : "…"}
            </span>
          </div>
        </div>
      </div>

      {!address && (
        <div className="p-4 sahara-inset border-[#c2652a]/40 text-xs font-body text-[#605850] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#c2652a] shrink-0" />
          Connect a wallet (top right) to open or unshield positions. Reads work without one.
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
                <a
                  href={`https://sepolia.voyager.online/tx/${status.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  tx <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Deposit */}
        <div className="lg:col-span-5 sahara-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-[#e6e0d6] pb-3">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-[#c2652a]" /> New Shielded LP Position
            </h2>
            <span className="text-[10px] font-body text-[#c2652a] font-bold">ETH · 18 dec</span>
          </div>

          <div className="p-4 sahara-inset space-y-2">
            <div className="flex items-center justify-between text-xs text-[#605850] font-body">
              <span className="font-semibold">Deposit Amount</span>
              <span className="font-mono text-[11px] font-semibold">
                Avail: {ethBalance !== null ? fmtEth(ethBalance) : "—"} {symbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-3xl font-bold text-[#3a302a] outline-none tnum font-headline"
              />
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as keyof typeof TOKENS)}
                className="bg-[#ffffff] border border-[#d8d0c8] text-[#3a302a] font-bold text-xs px-3.5 py-2 rounded-lg outline-none font-body shadow-sm"
              >
                <option value="STRK">STRK</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 font-body">
            <div className="text-xs text-[#605850] font-semibold">
              Concentrated Range (price = 1.0001<sup>tick</sup>)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Min Price (USD)</div>
                <input
                  type="number"
                  step="any"
                  value={lowerPrice}
                  onChange={(e) => setLowerPrice(e.target.value)}
                  placeholder="2400"
                  className="w-full bg-transparent font-bold text-[#3a302a] text-base outline-none tnum font-headline"
                />
              </div>
              <div className="p-3.5 sahara-inset space-y-1">
                <div className="text-[#9a9088] text-[10px] uppercase font-bold">Max Price (USD)</div>
                <input
                  type="number"
                  step="any"
                  value={upperPrice}
                  onChange={(e) => setUpperPrice(e.target.value)}
                  placeholder="3600"
                  className="w-full bg-transparent font-bold text-[#3a302a] text-base outline-none tnum font-headline"
                />
              </div>
            </div>
            {lowerPrice && upperPrice && parseFloat(upperPrice) > parseFloat(lowerPrice) && (
              <div className="text-[11px] font-mono text-[#9a9088]">
                Ticks: [{priceToTick(parseFloat(lowerPrice))}, {priceToTick(parseFloat(upperPrice))}]
              </div>
            )}
          </div>

          <button
            onClick={handleDeposit}
            disabled={!account || busy !== ""}
            className="w-full py-4 rounded-lg bg-[#c2652a] hover:bg-[#a85320] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(194,101,42,0.2)] tracking-wider disabled:opacity-50 font-body"
          >
            {busy === "approve" ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> APPROVING ETH…</>
            ) : busy === "deposit" ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> MINTING SHIELDED NOTE…</>
            ) : (
              <><Lock className="h-4 w-4" /> DEPOSIT SHIELDED LP</>
            )}
          </button>

          <p className="text-[11px] font-mono text-[#9a9088] leading-relaxed">
            Flow: approve → MockPool pulls ETH into custody → vault credits a
            Poseidon-committed position. Only your local note can withdraw it.
          </p>
        </div>

        {/* Positions */}
        <div className="lg:col-span-7 sahara-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-[#e6e0d6] pb-3">
            <h2 className="text-xs font-bold text-[#3a302a] uppercase font-body flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 text-[#c2652a]" /> Your Shielded LP Notes
            </h2>
            <span className="text-[10px] font-body text-[#9a9088] font-bold">
              {notes.length} stored locally
            </span>
          </div>

          {notes.length === 0 && (
            <p className="text-xs text-[#605850] font-body leading-relaxed py-6 text-center">
              No shielded notes yet. Notes are generated in your browser and
              stored only in this browser&apos;s local storage — there is no server copy.
            </p>
          )}

          <div className="space-y-4">
            {notes.map((note) => {
              const pos = positions[note.commitment];
              return (
                <div key={note.commitment} className="p-5 sahara-card space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-[#fbe8d8] flex items-center justify-center font-bold text-[#c2652a] font-body text-xs shadow-sm shrink-0">
                        {note.token === TOKENS.STRK ? "STRK" : "ETH"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#3a302a] text-base tnum font-headline">
                          {fmtEth(BigInt(note.amountRaw))} {note.token === TOKENS.STRK ? "STRK" : "ETH"}
                        </div>
                        <div className="text-[10px] font-mono text-[#9a9088] truncate">
                          Note: {short(note.commitment)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-body shrink-0 ml-3">
                      {pos ? (
                        <>
                          <div className="text-sm font-bold text-[#c2652a] tnum font-mono">
                            {fmtEth(pos.shares)} sh
                          </div>
                          <div className="text-[10px] text-[#9a9088]">active shares</div>
                        </>
                      ) : (
                        <span className="sahara-badge">CLOSED / UNRECOGNIZED</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[10px] font-body p-3 sahara-inset text-[#605850]">
                    <div>
                      <span className="text-[#9a9088]">Lower:</span>{" "}
                      <span className="text-[#3a302a] font-bold font-mono">{pos?.lowerTick ?? note.lowerTick}</span>
                    </div>
                    <div>
                      <span className="text-[#9a9088]">Upper:</span>{" "}
                      <span className="text-[#3a302a] font-bold font-mono">{pos?.upperTick ?? note.upperTick}</span>
                    </div>
                    <div>
                      <span className="text-[#9a9088]">Status:</span>{" "}
                      <span className="text-[#c2652a] font-bold">{pos ? "ACTIVE" : "—"}</span>
                    </div>
                    <div>
                      <span className="text-[#9a9088]">Age:</span>{" "}
                      <span className="text-[#3a302a]">
                        {pos ? `${Math.floor((Date.now() / 1000 - pos.depositedAt) / 3600)}h` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 font-body text-xs">
                    <a
                      href={`https://sepolia.voyager.online/tx/${note.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-[#f6f0e8] hover:bg-[#ffffff] border border-[#d8d0c8] text-[#3a302a] text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 text-[#c2652a]" /> Deposit Tx
                    </a>
                    <button
                      onClick={() => handleWithdraw(note)}
                      disabled={!account || !pos || busy !== ""}
                      className="px-3.5 py-1.5 rounded-lg bg-[#f6f0e8] hover:bg-[#ffffff] border border-[#8c3c3c]/30 text-[#8c3c3c] text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      {busy === "withdraw" ? "Unshielding…" : "Unshield"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
