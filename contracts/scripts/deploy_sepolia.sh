#!/usr/bin/env bash
# One-command Sepolia deployment pipeline.
# Usage: ALCHEMY_KEY=<key> ./scripts/deploy_sepolia.sh
set -euo pipefail

: "${ALCHEMY_KEY:?Set ALCHEMY_KEY env var (full RPC URL or key from https://www.alchemy.com)}"
if [[ "$ALCHEMY_KEY" == https://* ]]; then
  RPC="$ALCHEMY_KEY"
else
  RPC="https://starknet-sepolia.g.alchemy.com/v2/$ALCHEMY_KEY"
fi
ACCOUNT="${ACCOUNT:-oblivion-deployer}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ACCTS="$HOME/.starknet_accounts/starknet_open_zeppelin_accounts.json"

cd "$ROOT/contracts"

# --- 1) Ensure local account exists ---
if [ "$(jq -r --arg n "$ACCOUNT" '[.[] | select(has($n))] | length' "$ACCTS")" = "0" ]; then
  echo "[*] Creating account '$ACCOUNT'..."
  sncast account create --url "$RPC" --name "$ACCOUNT"
fi
ADDR=$(jq -r --arg n "$ACCOUNT" '[.[] | select(has($n)) | .[$n].address][0]' "$ACCTS")
DEPLOYED=$(jq -r --arg n "$ACCOUNT" '[.[] | select(has($n)) | .[$n].deployed // false][0]' "$ACCTS")
if [ "$DEPLOYED" != "true" ]; then
  echo "[!] Account exists but is NOT deployed/funded:"
  echo "    $ADDR"
  echo "    1. Fund it with STRK: https://sepolia.starknet.io"
  echo "    2. Deploy it:         sncast --url \"$RPC\" account deploy --name $ACCOUNT"
  echo "    3. Re-run this script."
  exit 1
fi
echo "[+] Deployer: $ADDR"

declare_c() {
  echo "[*] Declaring $1..."
  local out ch
  out=$(sncast --account "$ACCOUNT" --wait --json declare --url "$RPC" --contract-name "$1" 2>&1 || true)
  ch=$(grep -o '"class_hash":"0x[0-9a-fA-F]*"' <<<"$out" | tail -1 | cut -d'"' -f4)
  if [ -z "$ch" ]; then
    ch=$(grep -oP '(Class|Contract) with (class )?hash \K0x[0-9a-fA-F]+' <<<"$out" | tail -1)
  fi
  if [ -z "$ch" ]; then
    echo "$out" >&2
    exit 1
  fi
  echo "$ch"
}

deploy_c() {
  local label="$1" class="$2"; shift 2
  echo "[*] Deploying $label..."
  sncast --account "$ACCOUNT" --wait --json deploy --url "$RPC" \
    --class-hash "$class" --constructor-calldata "$@" 2>/dev/null \
    | grep -o '"contract_address":"0x[0-9a-fA-F]*"' | tail -1 | cut -d'"' -f4
}

# --- 2) Declare all contracts ---
MOCK_CLASS=$(declare_c MockPool)
ATTEST_CLASS=$(declare_c AttestEngine)
VAULT_CLASS=$(declare_c OblivionVault)
COW_CLASS=$(declare_c CoWMatcher)
YIELD_CLASS=$(declare_c YieldRouter)
SESSION_CLASS=$(declare_c SessionKeyManager)

# --- 3) Deploy in dependency order ---
# Unused external slots (ekubo/nostra/oracle) point at the deployer as an inert placeholder.
MOCK=$(deploy_c MockPool "$MOCK_CLASS" "$ADDR" "0x1")
ATTEST=$(deploy_c AttestEngine "$ATTEST_CLASS" "$ADDR" "$MOCK")
VAULT=$(deploy_c OblivionVault "$VAULT_CLASS" "$ADDR" "$MOCK" "$ADDR" "$ATTEST")
COW=$(deploy_c CoWMatcher "$COW_CLASS" "$ADDR" "$MOCK" "$ADDR")
YIELD=$(deploy_c YieldRouter "$YIELD_CLASS" "$ADDR" "$VAULT" "$ADDR")
SESSION=$(deploy_c SessionKeyManager "$SESSION_CLASS" "$ADDR" "$COW")

# --- 4) Link MockPool -> Vault ---
echo "[*] Wiring MockPool.set_vault..."
sncast --account "$ACCOUNT" --wait invoke --url "$RPC" \
  --contract-address "$MOCK" --function set_vault --calldata "$VAULT" >/dev/null

# --- 5) Write frontend env + deployment record ---
cat > "$ROOT/frontend/.env.local" <<EOF
NEXT_PUBLIC_RPC_URL=$RPC
NEXT_PUBLIC_MOCKPOOL_ADDRESS=$MOCK
NEXT_PUBLIC_VAULT_ADDRESS=$VAULT
NEXT_PUBLIC_COW_ADDRESS=$COW
NEXT_PUBLIC_ATTEST_ADDRESS=$ATTEST
NEXT_PUBLIC_YIELDROUTER_ADDRESS=$YIELD
NEXT_PUBLIC_SESSIONKEYS_ADDRESS=$SESSION
EOF

mkdir -p "$ROOT/contracts/deployments"
cat > "$ROOT/contracts/deployments/sepolia.json" <<EOF
{
  "network": "sepolia",
  "deployed_at": "$(date -u +%FT%TZ)",
  "deployer": "$ADDR",
  "contracts": {
    "MockPool": "$MOCK",
    "AttestEngine": "$ATTEST",
    "OblivionVault": "$VAULT",
    "CoWMatcher": "$COW",
    "YieldRouter": "$YIELD",
    "SessionKeyManager": "$SESSION"
  }
}
EOF

echo ""
echo "=== Deployment complete (Sepolia) ==="
echo "MockPool          $MOCK"
echo "OblivionVault     $VAULT"
echo "CoWMatcher        $COW"
echo "AttestEngine      $ATTEST"
echo "YieldRouter       $YIELD"
echo "SessionKeyManager $SESSION"
echo "frontend/.env.local written."
