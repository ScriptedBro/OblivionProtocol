/**
 * STRK20 Wallet API Integration for Oblivion Protocol
 * 
 * Standard: Starknet Wallet API v0.10.3 / starknet.js WalletAccountV6
 * Specs: https://strk20-by-example.org/starknet-wallet-api/private-defi
 */

export interface Strk20ActionTransfer {
  type: "transfer";
  token: string;
  amount: string | bigint; // "OPEN" for open note or bigint
  recipient: string;
}

export interface Strk20ActionInvoke {
  type: "invoke";
  contract: string;
  calldata: string[];
}

export type STRK20_ACTION = Strk20ActionTransfer | Strk20ActionInvoke;

export interface Strk20BalanceResult {
  token: string;
  balance: string;
}

/**
 * Builds an atomic private DeFi deposit invocation into Oblivion Vault:
 * 1. Opens an open note slot with amount "OPEN"
 * 2. Invokes OblivionVault.cairo privacy_invoke passing `${openNoteIds[0]}`
 */
export function buildShieldedLPDepositActions(
  vaultAddress: string,
  tokenAddress: string,
  userAddress: string,
  amountIn: string,
  lowerTick: number,
  upperTick: number
): STRK20_ACTION[] {
  return [
    // 1. Open the note that the shielded LP position will be credited into
    {
      type: "transfer",
      token: tokenAddress,
      amount: "OPEN",
      recipient: userAddress,
    },
    // 2. Invoke Oblivion Vault with the placeholder ${openNoteIds[0]}
    {
      type: "invoke",
      contract: vaultAddress,
      calldata: [
        "${openNoteIds[0]}",
        tokenAddress,
        amountIn,
        lowerTick.toString(),
        upperTick.toString(),
      ],
    },
  ];
}

/**
 * Executes a STRK20 transaction via the connected browser wallet (Argent X / Braavos)
 */
export async function executeStrk20Transaction(
  account: any,
  actions: STRK20_ACTION[]
): Promise<{ transaction_hash: string }> {
  if (!account) {
    throw new Error("No connected Starknet wallet account");
  }

  // STRK20 private invokes require a privacy-enabled wallet
  // (starknet.js WalletAccountV6 / STRK20 Wallet API). There is no honest
  // fallback: a standard account cannot produce ZK notes.
  if (typeof account.strk20InvokeTransaction !== "function") {
    throw new Error(
      "Connected wallet does not support strk20InvokeTransaction — install a STRK20-enabled wallet build"
    );
  }
  return await account.strk20InvokeTransaction(actions);
}

/**
 * Queries private shielded balances from wallet without exposing viewing keys.
 * Returns empty results when the wallet has no STRK20 API — never fake data.
 */
export async function queryShieldedBalances(
  account: any,
  tokens: string[]
): Promise<Strk20BalanceResult[]> {
  if (account && typeof account.strk20Balances === "function") {
    try {
      return await account.strk20Balances(tokens);
    } catch {
      return [];
    }
  }
  return [];
}
