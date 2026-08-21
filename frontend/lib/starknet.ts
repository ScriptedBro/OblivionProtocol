// Oblivion Protocol Starknet & STRK20 Contract Addresses
export const OBLIVION_CONTRACTS = {
  STRK20_MAINNET_POOL: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  EKUBO_CORE_MAINNET: "0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2",
  PRAGMA_ORACLE_MAINNET: "0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f",
  OBLIVION_VAULT: "0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102",
  COW_MATCHER: "0x0428b1092a83e028b182a938e10219a4e321a48be389812a74c1092a748c12a8",
  ATTEST_ENGINE: "0x0437c8912a74c1092a748c12a84b01e92a83e028b182a938e10219a4e321a48b",
  
  // CamelCase aliases
  strk20Pool: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  ekuboCore: "0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2",
  pragmaOracle: "0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f",
  oblivionVault: "0x0419a4e321a48be389812a74c1092a748c12a84b01e92a83e028b182a938e102",
  cowMatcher: "0x0428b1092a83e028b182a938e10219a4e321a48be389812a74c1092a748c12a8",
  attestEngine: "0x0437c8912a74c1092a748c12a84b01e92a83e028b182a938e10219a4e321a48b",
};

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
