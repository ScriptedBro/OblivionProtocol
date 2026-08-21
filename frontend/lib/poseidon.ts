import { hash } from "starknet";

export interface ShieldedNote {
  asset: string;
  amount: bigint;
  secret: bigint;
  nullifier: bigint;
  commitment: string;
  nullifierHash: string;
}

/**
 * Generate a cryptographically secure random 250-bit felt for secret/nullifier
 */
export function generateRandomFelt(): bigint {
  const array = new Uint8Array(31);
  crypto.getRandomValues(array);
  let hex = "0x";
  for (let i = 0; i < array.length; i++) {
    hex += array[i].toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}

/**
 * Derives a real Starknet Poseidon note commitment:
 * Commitment = Poseidon(asset, amount, secret, nullifier)
 */
export function createShieldedNote(assetAddress: string, amountFelt: bigint): ShieldedNote {
  const secret = generateRandomFelt();
  const nullifier = generateRandomFelt();

  const assetBigInt = BigInt(assetAddress);
  const elements = [assetBigInt, amountFelt, secret, nullifier];
  const commitment = hash.computePoseidonHashOnElements(elements);
  const nullifierHash = hash.computePoseidonHash(nullifier, secret);

  return {
    asset: assetAddress,
    amount: amountFelt,
    secret,
    nullifier,
    commitment,
    nullifierHash,
  };
}

/**
 * Computes a Merkle Root from an array of Poseidon leaf hashes
 */
export function computePoseidonMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return "0x0";
  const bigIntLeaves = leaves.map((l) => BigInt(l));
  return hash.computePoseidonHashOnElements(bigIntLeaves);
}

/**
 * Verifies mathematical pool solvency: Total Assets >= Total Share Liabilities
 */
export function verifySolvencyMath(totalReserves: bigint, totalLiabilities: bigint): boolean {
  return totalReserves >= totalLiabilities;
}
