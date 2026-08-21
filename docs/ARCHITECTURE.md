# Architecture

> Oblivion Protocol is a **confidential liquidity layer** on Starknet. It routes
> capital held in the STRK20 privacy pool through concentrated-liquidity market
> making, sealed-batch auctions and lending markets — while keeping individual
> positions, orders and identities cryptographically hidden — and produces
> zero-knowledge compliance attestations on demand.
>
> **Status legend used across all docs:** 🟢 live on Sepolia today · 🟡 partially
> implemented (stand-in logic) · 🔴 specified, not yet implemented.

---

## 1. Design goals

| # | Goal | Consequence |
|---|------|-------------|
| G1 | **Privacy by default** | No individual position, order, or identity is ever written to public state in plaintext. |
| G2 | **Compliance without surveillance** | Any third party can verify *facts* (solvency, provenance) via ZK attestation without seeing *data*. |
| G3 | **Real yield, really compounded** | Fees and lending yield flow back into shielded notes automatically; no manual unshield steps. |
| G4 | **MEV resistance** | Orders are committed as hashes and cleared at one uniform price per batch; nothing to sandwich. |
| G5 | **Institutional custody safety** | User funds are never trusted to an EOA or off-chain operator; every movement is a contract-enforced atomic step. |

## 2. Actors

| Actor | Role |
|-------|------|
| **Shielded LP** | Deposits into tick-bounded vault positions via STRK20 note commitments. |
| **Dark trader** | Commits hashed orders to batch auctions; reveals nothing until settlement. |
| **STRK20 pool** | The privacy layer. Executes `privacy_invoke` payloads atomically against Oblivion contracts on behalf of note holders. |
| **Solver / settler** | Permissionless role: submits the uniform clearing price once a batch deadline passes. Bounded by oracle sanity checks. |
| **Auditor / regulator** | Reads attestations from the ATTEST engine; learns facts, never balances. |
| **Keeper** | Harvests CLMM fees and lending yield, re-shielding them into the vault. |

## 3. Layer diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                 │
│  Next.js terminal · wallets (STRK20-enabled) · keeper bots · auditors    │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ shield / unshield / privacy_invoke / commits
┌───────────────▼──────────────────────────────────────────────────────────┐
│  STRK20 PRIVACY POOL  (mainnet contract, external)                       │
│  ZK notes · nullifiers · viewing keys · FPI sanctions screening          │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ privacy_invoke(note_commitment, payload)
┌───────────────▼──────────────────────────────────────────────────────────┐
│  OBLIVION CORE                                                           │
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────┐ │
│  │ OblivionVault      │   │ CoWMatcher         │   │ SessionKeyManager│ │
│  │ shielded CLMM      │◄─►│ sealed batch       │   │ delegated keys   │ │
│  │ positions & fees   │   │ auctions           │   │ spend limits     │ │
│  └─────────┬──────────┘   └─────────┬──────────┘   └──────────────────┘ │
│            │ idle capital           │ clearing price                    │
│  ┌─────────▼──────────┐   ┌─────────▼──────────┐                        │
│  │ YieldRouter        │   │ AttestEngine       │                        │
│  │ Nostra/zkLend      │   │ ZK fact registry   │                        │
│  └────────────────────┘   └────────────────────┘                        │
└───────────────┬──────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────────┐
│  EXTERNAL PROTOCOLS                                                      │
│  Ekubo Core (CLMM) · Pragma Feeds (oracles) · Nostra / zkLend (lending)  │
│  Garaga verifier (STWO proof gate)                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Core flows

### 4.1 Shielded LP deposit (Pillar I)

**Target (mainnet):**

1. User shields tokens into the STRK20 pool, receiving a private note.
2. The wallet builds a `privacy_invoke` payload: open-note placeholder +
   `(note_commitment, token, amount, lower_tick, upper_tick)`.
3. The pool verifies the ZK note spend, moves custody of the assets to the
   vault executor, and calls `OblivionVault::privacy_invoke_deposit`.
4. The vault mints shares at `amount × total_shares / total_assets`
   (first depositor: 1:1), stores the `LPPosition` under the commitment, and
   emits a **blind event** `{action_hash, timestamp}` — no amounts, no ticks,
   no caller.

**On-chain truth:** aggregate per-token ledgers only. Position detail exists
solely inside the user's local note (secret, nullifier, ticks).

### 4.2 Dark batch swap (Pillar II)

1. Anyone opens a batch `(token_a, token_b, duration)` — 🟢.
2. Traders submit `commit_order(batch_id, H(secret ‖ side ‖ amount ‖ limit),
   side, amount, min_limit_price)` during the window. Only hashes are public — 🟢.
3. At deadline, a solver submits the uniform clearing price derived from the
   committed demand curves; the contract settles all revealed orders at that
   single price — 🟢 mechanism, 🟡 price derivation currently caller-supplied.
4. Target: reveal phase with per-order escrow, internal coincidence-of-wants
   netting before any external AMM residual routing — 🔴 (see ROADMAP M2).

### 4.3 Yield compounding (Pillar III)

Idle vault capital is routed to Nostra/zkLend via `YieldRouter`; harvested
yield is re-shielded into the STRK20 pool and credited pro-rata to note
holders through `accumulated_fees_per_token_share`. 🟡 accounting exists;
external money-market calls are stand-ins on testnet.

### 4.4 Compliance attestation (Pillar IV)

The ATTEST engine records attestations over hashed subjects:
`solvency`, `clean provenance`, `PnL audit`. Target: proofs are Groth16/STWO
circuits verified on-chain via a Garaga-generated verifier class; validity is
time-boxed and revocable. 🟢 registry + lifecycle live; 🔴 circuit-gated
verification pending.

## 5. Privacy model

| Data | Public | Hidden |
|------|--------|--------|
| LP identity & size | aggregate per-token TVL | wallet ↔ position linkage, note balances, ownership % |
| Tick ranges | blended active range on Ekubo | who chose which band |
| Batch orders | batch id, deadline, clearing price | trader identity, size, limit price, side |
| Yield | aggregate harvest events | per-note fee streams |
| Compliance | attestation facts + expiry | underlying balances & counterparties |

**Trust assumptions:** users trust (a) the STRK20 pool's ZK correctness,
(b) Poseidon collision-resistance for commitments, (c) at least one honest
solver submitting an oracle-bounded clearing price. No custodian ever holds
user keys; the vault never touches plaintext ownership.

## 6. Failure & containment

- **Reentrancy:** all external calls follow checks-effects-interactions; share
  math updates state before token transfers.
- **First-depositor inflation:** per-token ledgers isolate share prices; a
  donation attack on one token cannot dilute others (C1).
- **Oracle failure:** settlement reverts if the submitted price deviates beyond
  configured bounds from the Pragma median (target); batches simply stay open.
- **Key loss:** losing the local note = losing the position (by design).
  Viewing keys allow read-only recovery of *what* you hold, not spending.

See [CONTRACTS.md](CONTRACTS.md) for entrypoint-level reference,
[INTEGRATIONS.md](INTEGRATIONS.md) for external protocol contracts,
[ROADMAP.md](ROADMAP.md) for the testnet→mainnet catch-up plan.
