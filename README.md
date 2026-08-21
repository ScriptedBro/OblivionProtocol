# Oblivion Protocol 🌑

> **The Sovereign Dark Liquidity & Confidential Financial Engine of Starknet**  
> Built for the **STRK20 Private Sprint** · Starknet Mainnet

---

## ⚡ Overview

**Oblivion Protocol** transforms Starknet’s STRK20 pool into a high-throughput, institutional-grade **Dark Financial Engine**. It enables institutional liquidity providers and retail traders to:
1. Provide **Shielded Concentrated Liquidity (CLMM)** into AMM pools (Ekubo) without revealing position sizes, tick bounds, or fee compounding yields.
2. Execute **Zero-MEV, Zero-Slippage Batch Swaps** via internal **Coincidence of Wants (CoW)** matching before routing residual volume to external AMMs.
3. Automatically route idle shielded collateral into Starknet money markets (**Nostra / zkLend**) for multi-stream yield compounding.
4. Export verifiable **Zero-Knowledge Proofs of Solvency and Clean Provenance** for institutional auditors on demand using the embedded **ATTEST Compliance Engine**.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------------------------------+
|                                          OBLIVION PROTOCOL ARCHITECTURE                                       |
|                                                                                                               |
|  [ Institutional Whales / LPs ]                           [ Algorithmic Traders / AI Agents / Users ]         |
|                |                                                                  |                           |
|                +-----------------------------------\                              |                           |
|                                                     v                             v                           |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                      STRK20 PRIVACY POOL (Starknet Mainnet)                             |  |
|  |   - Unified Shielded Note Pool (STRK, USDC, ETH, WBTC)                                                  |  |
|  |   - Mandatory FPI Deposit Sanctions Screening Verification                                              |  |
|  +---------------------------------------------------------------------------------------------------------+  |
|                                                        |                                                      |
|                                                        v (Atomic privacy_invoke)                              |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                          OBLIVION CORE CONTRACT ENGINE                                  |  |
|  |                                                                                                         |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |   |   Pillar I: OblivionVault.cairo       |             |   Pillar II: CoWMatcher.cairo         |       |  |
|  |   |   - Shielded Concentrated LP Vault    |             |   - Internal Dark Batch Auctions      |       |  |
|  |   |   - Ekubo CLMM Tick Blender           | <---------> |   - Uniform Clearing Price Math       |       |  |
|  |   |   - Atomic Fee Auto-Compounding       |             |   - Zero-MEV Internal Netting         |       |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |                                                                                                         |  |
|  |   +-------------------------------------------------------------------------------------------------+   |  |
|  |   |   Pillar V: ATTEST Compliance Engine (AttestEngine.cairo & SolvencyProver.cairo)                |   |  |
|  |   |   - Fact 1: Cryptographic Proof of Pool Solvency (Vault Assets >= Liabilities)                  |   |  |
|  |   |   - Fact 2: Clean Provenance Proof (Verifies FPI deposit screening signatures)                  |   |  |
|  |   |   - Fact 3: Selective Audit Export (ZKP tax, PnL & counterparty attestation for regulators)     |   |  |
|  |   +-------------------------------------------------------------------------------------------------+   |  |
|  +---------------------------------------------------------------------------------------------------------+  |
|                                                        |                                                      |
|                                                        v (Composed External Integrations)                     |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                  EXTERNAL STARKNET PROTOCOL ECOSYSTEM                                   |  |
|  |            [ Ekubo Core CLMM ]          [ Pragma Oracle ]          [ Nostra / zkLend ]                  |  |
|  +---------------------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------------+
```

---

## 🔒 Cryptographic Threat Boundary: Hidden vs. Verifiable

Oblivion Protocol adheres strictly to StarkWare's official **compliance-first privacy standard**:

| Dimension | Publicly Visible On-Chain | Cryptographically Hidden / Shielded |
|---|---|---|
| **LP Identity & Balance** | Aggregate vault liquidity balance in `OblivionVault`. | Individual LP wallet addresses, individual note balances, and percentage ownership of the pool. |
| **Concentrated Tick Ranges** | The blended, aggregated active ticks deployed on Ekubo Core. | Which specific LP selected which price boundary or custom risk band. |
| **Batch Order Flow** | The batch ID, expiration timestamp, and uniform clearing price. | Individual trader wallet addresses, order sizes, limit prices, and execution schedules. |
| **Fee Yield Compounding** | Aggregate fee re-shielding transaction into the STRK20 pool. | Individual fee distribution across private LP note holders. |
| **Regulatory & Tax Audit** | Cryptographic ZK-Attestation verifying pool solvency and sanctions-free origins. | Historical counterparty interactions, unshielded balances, or unrelated wallet activity. |

---

## 📂 Repository Structure

```
.
├── contracts/                                # Scarb / Starknet Foundry Suite
│   ├── Scarb.toml
│   ├── snfoundry.toml
│   ├── src/
│   │   ├── lib.cairo
│   │   ├── core/
│   │   │   ├── OblivionVault.cairo          # Shielded LP Vault (IAnonymizer for STRK20)
│   │   │   └── CoWMatcher.cairo             # Dark Batch Auction & CoW matching engine
│   │   ├── compliance/
│   │   │   └── AttestEngine.cairo           # Selective Fact-Proof generator & verifier
│   │   └── interfaces/
│   │       ├── ISTRK20Pool.cairo            # Live STRK20 Pool interface
│   │       ├── IEkuboCore.cairo             # Ekubo CLMM interface
│   │       ├── IAttest.cairo                # Public ATTEST interface for third-party dapps
│   │       └── IPragmaOracle.cairo          # Pragma price oracle interface
│   └── tests/
│       ├── test_vault.cairo                 # snforge tests for shielded LP deposits/claims
│       ├── test_cow_matcher.cairo           # snforge tests for batch clearing
│       └── test_attest.cairo                # snforge tests for selective fact proofs
│
├── frontend/                                 # Next.js 14 Web Application
│   ├── app/
│   │   ├── page.tsx                         # Dark AMM Terminal
│   │   ├── pool/page.tsx                    # Shielded Concentrated Liquidity Manager
│   │   ├── swap/page.tsx                    # Dark CoW Batch Swap Terminal
│   │   └── compliance/page.tsx              # ATTEST Compliance & Solvency Portal
│   ├── components/                          # Navbar & Starknetkit connection
│   └── lib/                                 # Contract dispatchers & types
│
├── strk20.json                               # Hackathon crawler manifest
└── OblivionProtocol.md                       # Master Architecture & Technical Specification
```

---

## 🛠️ Quickstart & Local Development

### Toolchain Versions
- **Scarb**: `v2.20.0` (Cairo `v2.20.0`, Sierra `v1.9.3`)
- **Starknet Foundry (`snforge`)**: `v0.63.0`
- **Next.js**: `v14.2.35`

### 1. Build and Test Cairo Smart Contracts
```bash
cd contracts
scarb build
snforge test
```

### 2. Run the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the local Oblivion Terminal.

---

## 📜 License
MIT License. Open source and built for the Starknet ecosystem.
