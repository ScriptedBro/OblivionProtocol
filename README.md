# Oblivion Protocol 🌑

> **The Sovereign Dark Liquidity & Confidential Financial Engine of Starknet**
> Shielded concentrated liquidity · sealed-batch dark swaps · ZK compliance attestations
>
> **Status: Sepolia testnet** — the docs describe the mainnet target; we are
> catching the code up to them milestone by milestone ([ROADMAP](docs/ROADMAP.md)).

---

## ⚡ What it is

Oblivion Protocol turns capital held in the [STRK20 privacy pool](https://github.com/starkware-libs/strk20) into a
confidential, institutional-grade liquidity engine:

1. **Shielded Concentrated Liquidity (Pillar I)** — LPs deposit via ZK note
   commitments into tick-bounded vault positions on Ekubo. Position sizes,
   tick bounds and fee yields are never public; only aggregate per-token TVL is.
2. **Dark Batch Swaps (Pillar II)** — orders are hash-committed before a batch
   deadline and cleared at one uniform price. Nothing to sandwich, nothing to
   front-run.
3. **Multi-Stream Yield (Pillar III)** — idle shielded collateral routes to
   Nostra/zkLend; harvested yield re-shields automatically back into notes.
4. **ATTEST Compliance (Pillar IV)** — zero-knowledge proofs of solvency,
   clean provenance and PnL that auditors can verify without ever seeing a
   balance.

**Privacy stance:** StarkWare's compliance-first model — hide the *data*,
prove the *facts*.

| Dimension | Publicly visible | Cryptographically hidden |
|---|---|---|
| LP identity & size | aggregate vault TVL | wallets ↔ positions, note balances, ownership % |
| Tick ranges | blended active range | who chose which band |
| Batch orders | batch id, deadline, clearing price | trader identity, size, limit price, side |
| Yield | aggregate harvest events | per-note fee streams |
| Audit | attestation facts + expiry | underlying balances & counterparties |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENTS        Next.js terminal · STRK20 wallets · keepers · auditors│
└───────────────┬──────────────────────────────────────────────────────┘
                │ shield / unshield / privacy_invoke / commits
┌───────────────▼──────────────────────────────────────────────────────┐
│  STRK20 PRIVACY POOL     ZK notes · nullifiers · FPI screening       │
└───────────────┬──────────────────────────────────────────────────────┘
                │ privacy_invoke(note_commitment, payload)
┌───────────────▼──────────────────────────────────────────────────────┐
│  OBLIVION CORE                                                       │
│   OblivionVault ◄──► CoWMatcher          SessionKeyManager           │
│   shielded CLMM      sealed batches      delegated spend policies    │
│        │                 │                                           │
│   YieldRouter        AttestEngine                                       │
│   Nostra/zkLend      ZK fact registry                                 │
└───────────────┬──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│  EXTERNAL       Ekubo Core · Pragma Feeds · Nostra/zkLend · Garaga    │
└──────────────────────────────────────────────────────────────────────┘
```

Deep dives: [Architecture](docs/ARCHITECTURE.md) ·
[Contract reference](docs/CONTRACTS.md) ·
[Integrations](docs/INTEGRATIONS.md) ·
[Deployments](docs/DEPLOYMENTS.md) ·
[Roadmap](docs/ROADMAP.md)

---

## 📊 Implementation status

Honest ledger of what runs today vs. what the docs specify.

| Component | Live on Sepolia | Mainnet target |
|---|---|---|
| Vault share math, per-token ledgers, blind events | ✅ | ✅ |
| Real ERC-20 custody through executor | ✅ (MockPool) | ✅ (STRK20 pool) |
| Sealed commit/reveal batch auctions | ✅ mechanism | ✅ + escrow & refunds |
| Oracle-bounded clearing price | ❌ solver-supplied | Pragma median ± tolerance |
| Ekubo position custody & real fee claims | ❌ internal accounting | ✅ |
| Money-market routing (Nostra/zkLend) | ❌ simulated | ✅ |
| Session keys with signature verification | ❌ storage only | ✅ |
| ZK-gated attestations (Garaga verifier) | ❌ structural checks | ✅ STWO circuits |

---

## 🚀 Quickstart

### Toolchain
- Scarb `v2.20.0` (Cairo `v2.20.0`) · snforge `v0.63.0` · Next.js `14.2.35`

### Contracts
```bash
cd contracts
scarb build
snforge test
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in RPC + contract addresses
npm run dev                        # http://localhost:3000
```

Addresses for `.env.local`: see [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).

### Try it on Sepolia
1. Connect any Starknet wallet (get-starknet compatible).
2. **Pool** — approve STRK or ETH, pick tick bounds, deposit. You receive
   shares against a Poseidon note commitment stored locally; withdraw burns
   shares and pays out real tokens.
3. **Swap** — open a batch, commit a hashed order, settle at one price.
4. **Compliance** — issue and verify solvency attestations against live vault state.

---

## 📂 Repository structure

```
.
├── contracts/
│   ├── src/core/
│   │   ├── OblivionVault.cairo        # Pillar I — shielded CLMM vault
│   │   ├── CoWMatcher.cairo           # Pillar II — sealed batch auctions
│   │   ├── AttestEngine.cairo         # Pillar IV — ZK fact registry
│   │   ├── YieldRouter.cairo          # Pillar III — money-market routing
│   │   ├── MockPool.cairo             # testnet executor stand-in (real custody)
│   │   └── SessionKeyManager.cairo    # delegated automation policies
│   ├── src/interfaces/                # ISTRK20Pool, IEkuboCore, IPragmaOracle, ...
│   ├── tests/                         # snforge suites incl. end-to-end flow
│   └── deployments/sepolia.json       # machine-readable deployment record
├── frontend/
│   ├── app/                           # home · pool · swap · compliance
│   ├── components/                    # Navbar, wallet modal
│   └── lib/                           # starknet.ts factories, wallet.tsx,
│                                      # poseidon.ts notes, strk20Wallet.ts
├── docs/                              # architecture, contracts, integrations,
│                                      # deployments, roadmap
└── strk20.json                        # hackathon crawler manifest
```

---

## 📜 License

MIT. Built for the Starknet ecosystem.
