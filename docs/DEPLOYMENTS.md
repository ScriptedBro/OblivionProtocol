# Deployments

## Sepolia (current testnet)

Chain: Starknet Sepolia · Deployer EOA:
`0x00c19104ba97ede49a3b85019f855899ab86e0c41859a2823cb2270721841b30`
(account name `oblivion-deployer` in `~/.starknet_accounts`).

| Contract | Address | Class hash |
|----------|---------|------------|
| MockPool (v2, permissionless custody) | `0x00ae61340348a20fe13f256d4f33203438563683a59117dfc7fe1d7cfd21396f` | `0x07102a4a9cff9fd1d51fff3b1c4e6b684dd38e38012481e493830c7489625a15` |
| OblivionVault (v2) | `0x05108e8659b0024fa93c809b4ff05761e70c68e0b9e0c456547d83bd68cc0396` | `0x069264a413db9c2423191680c7e9b758ada7908594aace2516a01a720eef1179` |
| CoWMatcher | `0x0128a4513e035cfbb68f7b781661068d81873c1c942f5fab32997259ab719dda` | — |
| AttestEngine | `0x0103746eaabf31b727865b9da91b978ee5ca3d43a5563580d119497fd77d73e8` | — |
| YieldRouter | `0x021f65519e1cc5506a37a47bf7c127fc76748aa03a684c25ade5a2eb959461b7` | — |
| SessionKeyManager | `0x0781512aa781a7c648fedf8dd0ea6dd146d4ba115dedd00aad654b7b1ce6ee39` | — |

Wiring: `MockPool.set_vault(OblivionVault)` executed; vault constructor binds
`strk20_pool = MockPool`, `attest_engine = AttestEngine`.

Token addresses (identical on mainnet & Sepolia):
- ETH `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`
- STRK `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

Machine-readable record: `contracts/deployments/sepolia.json`.

## Frontend environment

`frontend/.env.local` (gitignored; template):

```bash
NEXT_PUBLIC_RPC_URL=<sepolia json-rpc url>
NEXT_PUBLIC_MOCKPOOL_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_COW_ADDRESS=0x...
NEXT_PUBLIC_ATTEST_ADDRESS=0x...
NEXT_PUBLIC_YIELDROUTER_ADDRESS=0x...
NEXT_PUBLIC_SESSIONKEYS_ADDRESS=0x...
```

`frontend/lib/starknet.ts` reads these at build time and exposes typed
contract factories (`getVault(provider)`, `getMockPool(account)`, …).
ABIs are synced from the Cairo build via `contracts/scripts/copy_abis.sh`.

## Redeploy runbook

```bash
# 1. Build
cd contracts && scarb build

# 2. Sync ABIs into the frontend
./scripts/copy_abis.sh

# 3. Declare + deploy (sncast 0.63 syntax: global flags BEFORE subcommand)
U="--url <RPC_URL>"
CH=$(sncast --account oblivion-deployer --json declare $U \
      --contract-name OblivionVault | grep -oE '"class_hash":"[^"]*"' | head -1 | cut -d'"' -f4)
sncast --account oblivion-deployer --wait deploy $U \
  --class-hash $CH \
  --constructor-calldata <ADMIN> <STRK20_POOL_OR_MOCKPOOL> <EKUBO_CORE> <ATTEST_ENGINE>

# 4. Re-wire and update .env.local + deployments/sepolia.json
```

Notes learned the hard way:
- sncast emits multiple JSON lines (progress + result); grep the field you need.
- "already declared" is an error string, not a success — treat it as reuse.
- i128 calldata must be felt-encodable; keep ticks positive on the CLI path.

## Verification

```bash
# position + ledgers after a deposit
sncast call --url $URL --contract-address $VAULT --function get_position --calldata <commitment>
sncast call --url $URL --contract-address $VAULT --function get_token_shares --calldata <token>

# executor custody (should equal Σ deposits − Σ payouts)
sncast call --url $URL --contract-address <TOKEN> --function balance_of --calldata $MOCKPOOL
```

## Mainnet checklist (before first production deploy)

- [ ] Replace MockPool with the audited STRK20 pool address in the vault constructor
- [ ] Real Ekubo core + position-NFT custody wired into harvest path
- [ ] Pragma feeds bound settlement & solvency facts
- [ ] Garaga verifier class embedded in AttestEngine
- [ ] Session keys signature-gated
- [ ] Contracts verified on Starkscan; `strk20.json` manifest filled with real tx hashes
