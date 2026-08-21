#!/usr/bin/env bash
# Copies ABI JSONs from scarb build output into the frontend.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/contracts/target/dev"
DST="$ROOT/frontend/lib/abis"
mkdir -p "$DST"
for name in OblivionVault CoWMatcher AttestEngine YieldRouter SessionKeyManager MockPool; do
  jq '{abi: .abi}' "$SRC/oblivion_protocol_${name}.compiled_contract_class.json" > "$DST/${name}.json"
  echo "copied ${name}.json"
done
