# Contract Reference

Six Cairo contracts compose Oblivion Protocol. Each section states the
**target semantics** (what mainnet must guarantee) followed by the current
**testnet status**. Interfaces live in `contracts/src/interfaces/`.

Status: 🟢 live & correct on Sepolia · 🟡 live with stand-in logic · 🔴 target-only.

---

## OblivionVault — Pillar I

Shielded concentrated-liquidity vault. The only contract that mints/burns
position shares, and only for callers it believes is the STRK20 pool executor.

### Storage
| Field | Type | Purpose |
|-------|------|---------|
| `strk20_pool` | ContractAddress | authorized executor (pool or testnet stand-in) |
| `ekubo_core` | ContractAddress | CLMM core the vault mirrors positions into |
| `attest_engine` | ContractAddress | compliance engine allowed to read aggregates |
| `total_token_shares` | `Map<ContractAddress, u256>` | per-token share supply (C1: no cross-token contamination) |
| `total_vault_assets` | `Map<ContractAddress, u256>` | per-token asset accounting |
| `accumulated_fees_per_token_share` | `Map<ContractAddress, u256>` | fee index for pro-rata compounding |
| `lp_positions` | `Map<felt252, LPPosition>` | positions keyed by note commitment |

`LPPosition { lower_tick: i128, upper_tick: i128, shares: u256, fee_debt: u256, deposited_at: u64 }`

### Entrypoints
| Function | Access | Semantics |
|----------|--------|-----------|
| `privacy_invoke_deposit(note_commitment, token, amount, lower_tick, upper_tick)` | pool only | mint shares at fair price; store position; emit blind event |
| `privacy_invoke_withdraw(note_commitment, shares_to_burn, token) → u256` | pool only | burn shares, return pro-rata payout |
| `privacy_invoke(...)` | pool only | composite action (deposit+withdraw batching) |
| `harvest_and_compound(token) → u256` | keeper | pull CLMM fees, re-shield, bump fee index |
| `get_position / get_token_shares / get_total_assets / ...` | view | aggregate reads only |

### Invariants (target)
1. **I1 Fair pricing:** `minted = amount × total_shares / total_assets`; first depositor 1:1.
2. **I2 Per-token isolation:** share price of token A is unaffected by flows in token B.
3. **I3 Blind events:** events carry `(action_hash, timestamp)` only — never amounts, ticks, or callers.
4. **I4 Pool-gated writes:** state-mutating entrypoints revert unless caller == `strk20_pool`.
5. **I5 Solvency:** `Σ total_vault_assets ≥ Σ total_token_shares × price` must hold after every op.

### Testnet status 🟢/🟡
🟢 I1–I4 implemented and deployed. 🟡 I5 partially enforced (`SolvencyProver`
compares raw units today). 🔴 real Ekubo position minting inside `harvest_…`;
current harvest credits fees from vault accounting rather than external CLMM
claims — see ROADMAP M3.

---

## MockPool — testnet executor

Stands in for the STRK20 pool's executor role so the full deposit→withdraw
loop is exercisable by any wallet on Sepolia.

| Function | Access | Semantics |
|----------|--------|-----------|
| `pool_deposit(commitment, token, amount, lower_tick, upper_tick)` | open | **takes ERC-20 custody** via `transferFrom`, forwards to vault |
| `pool_withdraw(commitment, shares, token) → u256` | open | burns via vault, pays out real tokens |
| `pool_harvest(token) → u256` | open | triggers vault harvest |
| `set_vault(vault)` | admin | re-wire target vault |

Events: `PoolDepositRouted { note_commitment (key), amount }`,
`PoolWithdrawRouted { note_commitment (key), payout }`.

**Production replacement:** the STRK20 pool itself calls the vault during
`privacy_invoke` execution; MockPool is deleted from the deployment graph.
🟢 live with real custody; verified end-to-end (approve → deposit → withdraw).

---

## CoWMatcher — Pillar II

Sealed-batch auction engine with commit/reveal discipline.

### Types
`BatchState { token_a, token_b, total_volume_a, total_volume_b, clearing_price: u256, deadline: u64, is_settled: bool }`

### Entrypoints
| Function | Semantics |
|----------|-----------|
| `open_batch(token_a, token_b, duration_seconds) → u64` | permissionless batch creation |
| `commit_order(batch_id, order_commitment, is_token_a, amount, min_limit_price)` | hash-committed order; plaintext fields are commitments only |
| `settle_batch(batch_id, oracle_price)` | one uniform clearing price for the whole batch |
| `get_batch(id)` / `get_current_batch_id()` | views |

Events: `BatchOpened`, `OrderSealed { batch_id, order_commitment (keys) }`,
`BatchSettled`.

### Invariants (target)
1. **B1 Commit sealing:** settlement may only consume orders whose commitment was recorded pre-deadline.
2. **B2 Uniform price:** every filled order clears at the same price; limit prices bound fills.
3. **B3 Oracle bounds:** submitted clearing price must sit within tolerance of the Pragma median, else revert.
4. **B4 Escrowed reveal:** reveal phase moves funds atomically; unfilled orders refund automatically.

### Testnet status 🟢/🟡
🟢 B1-style commit ledger + single-price settlement live. 🟡 clearing price is
caller-supplied without oracle bound (B3), and orders are not escrowed at
commit time (B4) — ROADMAP M2. Order *amounts* are stored plaintext alongside
hashes pending the escrow redesign; treat current volumes as non-private.

---

## AttestEngine — Pillar IV

On-chain registry of zero-knowledge fact attestations over hashed subjects.

```text
AttestationRecord {
  subject_hash: felt252,   // hashed subject — never a raw address/balance
  fact_type: felt252,      // 1 = Solvency · 2 = Clean Provenance · 3 = PnL Audit
  is_valid: bool,
  issued_at: u64,
  expires_at: u64,
}
```

| Function | Semantics |
|----------|-----------|
| `verify_and_issue_attestation(id, subject_hash, fact_type, proof_data, validity_duration) → bool` | verify proof, then record attestation |
| `is_attestation_valid(id) → bool` | validity incl. expiry |
| `get_attestation(id) → AttestationRecord` | public record read |
| `verify_solvency_proof(vault_assets, total_shares, proof) → bool` | ad-hoc solvency check against supplied aggregates |

**Target:** `proof_data` is a STWO/Groth16 proof checked by an immutable
Garaga verifier class embedded at construction; facts reference circuit
statement hashes so third parties know exactly what was proven. 🔴 verifier
gating pending — 🟢 registry, lifecycle, expiry and lookups live today
(structural proof validation only).

---

## YieldRouter — Pillar III

Moves idle vault capital into Starknet money markets and back.

| Function | Semantics |
|----------|-----------|
| `route_idle_capital(token, amount) → u256` | deploy idle assets to lending market |
| `recall_capital(token, amount) → u256` | pull capital back before withdrawals |
| `harvest_lending_yield(token) → u256` | claim accrued yield, return to vault |
| `get_routed_balance(token)` / `get_total_harvested_yield(token)` | views |

Events: `AssetsRoutedToLending`, `AssetsWithdrawnFromLending`, `YieldHarvested`.

**Target:** real Nostra/zkLend `deposit/withdraw` calls with a liquidity-ratio
guard so withdrawals never strand capital. 🟡 accounting + event flow live;
external market calls are simulated on Sepolia — ROADMAP M4.

---

## SessionKeyManager — delegated automation

Enables keepers/agents to act within signed, bounded policies (gasless UX).

```text
SessionKeyConfig { owner, daily_limit, spent_today, expires_at, is_active }
```

| Function | Semantics |
|----------|-----------|
| `register_session_key(session_public_key, daily_limit, duration)` | owner binds a bounded key |
| `revoke_session_key(key)` | immediate kill-switch |
| `validate_and_record_spend(key, amount)` | CoWMatcher calls this before executing delegated actions |
| `get_session_config(key)` | view |

**Target:** Starknet signature verification of session policies (C7),
per-contract selector allowlists, replay-safe spend recording. 🟢 storage +
lifecycle live; 🔴 cryptographic verification pending — ROADMAP M4.

---

## Deployment addresses

See [DEPLOYMENTS.md](DEPLOYMENTS.md) for the authoritative address table,
class hashes and the redeploy runbook.
