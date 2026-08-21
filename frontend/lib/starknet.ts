import { Contract, RpcProvider, AccountInterface, type Abi } from "starknet";

import VaultAbi from "./abis/OblivionVault.json";
import CoWAbi from "./abis/CoWMatcher.json";
import AttestAbi from "./abis/AttestEngine.json";
import YieldRouterAbi from "./abis/YieldRouter.json";
import SessionKeysAbi from "./abis/SessionKeyManager.json";
import MockPoolAbi from "./abis/MockPool.json";

// Real mainnet reference addresses (read-only labels — never deploy against these from the frontend)
export const STRK20_MAINNET_POOL =
  "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
export const EKUBO_CORE_MAINNET =
  "0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2";
export const PRAGMA_ORACLE_MAINNET =
  "0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f";

// Legacy export names kept for existing page imports
export const OBLIVION_CONTRACTS = {
  STRK20_MAINNET_POOL,
  EKUBO_CORE_MAINNET,
  PRAGMA_ORACLE_MAINNET,
};
export const EXTERNAL_CONTRACTS = OBLIVION_CONTRACTS;

const env = (key: string) => process.env[`NEXT_PUBLIC_${key}`] ?? "";

// Deployed addresses are injected by contracts/scripts/deploy_sepolia.sh into .env.local
export const ADDRESSES = {
  mockPool: env("MOCKPOOL_ADDRESS"),
  vault: env("VAULT_ADDRESS"),
  cowMatcher: env("COW_ADDRESS"),
  attestEngine: env("ATTEST_ADDRESS"),
  yieldRouter: env("YIELDROUTER_ADDRESS"),
  sessionKeys: env("SESSIONKEYS_ADDRESS"),
};

export const isConfigured = Object.values(ADDRESSES).every((v) => v !== "");

export function getProvider(): RpcProvider {
  const url = env("RPC_URL");
  if (!url) throw new Error("NEXT_PUBLIC_RPC_URL is not set");
  return new RpcProvider({ nodeUrl: url });
}

type ProviderOrAccount = RpcProvider | AccountInterface;

const asAbi = (j: { abi: unknown }): Abi => j.abi as Abi;

export function getVault(p: ProviderOrAccount) {
  return new Contract(asAbi(VaultAbi), ADDRESSES.vault, p);
}
export function getCoWMatcher(p: ProviderOrAccount) {
  return new Contract(asAbi(CoWAbi), ADDRESSES.cowMatcher, p);
}
export function getAttestEngine(p: ProviderOrAccount) {
  return new Contract(asAbi(AttestAbi), ADDRESSES.attestEngine, p);
}
export function getYieldRouter(p: ProviderOrAccount) {
  return new Contract(asAbi(YieldRouterAbi), ADDRESSES.yieldRouter, p);
}
export function getSessionKeys(p: ProviderOrAccount) {
  return new Contract(asAbi(SessionKeysAbi), ADDRESSES.sessionKeys, p);
}
export function getMockPool(p: ProviderOrAccount) {
  return new Contract(asAbi(MockPoolAbi), ADDRESSES.mockPool, p);
}

// Wallet connection via get-starknet (Argent X / Braavos)
export async function connectWallet(): Promise<AccountInterface | null> {
  const { connect } = await import("get-starknet");
  const wallet = await connect({ modalMode: "alwaysAsk", modalTheme: "dark" });
  if (!wallet) return null;
  await wallet.enable();
  if (!wallet.isConnected) return null;
  return wallet.account as AccountInterface;
}

export function shortAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export interface ShieldedPosition {
  noteCommitment: string;
  token: string;
  symbol: string;
  amount: string;
  shares: string;
  lowerTick: number;
  upperTick: number;
  accumulatedYield: string;
  apy: string;
  depositedAt: string;
}

export interface CoWBatch {
  id: number;
  tokenPair: string;
  volumeA: string;
  volumeB: string;
  clearingPrice: string;
  secondsRemaining: number;
  totalOrders: number;
  status: "OPEN" | "SETTLING" | "CLEARED";
}

export interface ComplianceAttestation {
  id: string;
  subjectHash: string;
  factType: string;
  description: string;
  issuedAt: string;
  expiresAt: string;
  isValid: boolean;
  proofRoot: string;
}
