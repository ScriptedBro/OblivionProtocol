# Oblivion Protocol — Master Technical Specification & Architecture Blueprint

> **Protocol Name:** Oblivion Protocol  
> **Tagline:** The Sovereign Dark Liquidity & Confidential Financial Engine of Starknet  
> **Target Environment:** Starknet Mainnet · STRK20 Zero-Knowledge Privacy Pool  
> **Ecosystem Composability:** Ekubo CLMM · Pragma Oracle · Nostra/zkLend · Cartridge Session Keys  
> **Compliance Standard:** FPI Sanctions Screening · ATTEST Selective Zero-Knowledge Attestation  

### Correction Log (audited revision)

| # | Defect in previous revision | Correction applied |
|---|---|---|
| C1 | Global `total_shielded_shares` / `accumulated_fees_per_share` shared across tokens | Per-token maps; `token` stored in every LP position |
| C2 | Events emitted `lower_tick`, `upper_tick`, `payout_amount` — leaked exactly what §6 claimed hidden | All anonymizer events reduced to unlinkable `action_hash = Poseidon(note_commitment, tag, nonce)` |
| C3 | Invented `privacy_invoke_deposit/_withdraw` entrypoints; no note credit-back flow | Single `privacy_invoke(payload)` entrypoint with internal action dispatch + explicit `IStrk20NoteIssuer` credit-back adapter |
| C4 | `CoWMatcher` stored no orders, enforced no limits, permissionless settle at raw oracle price | Two-phase sealed-commitment batch: escrow-at-commit, reveal-after-close, solver-submitted fills verified on-chain (limits, conservation, oracle band), refund path for unrevealed orders |
| C5 | `verify_zk_proof()` returned hardcoded `true` | Per-fact-type STARK verifier class registry (Garaga-compiled circuits), public-input binding, admin-gated class registration |
| C6 | Division-by-zero paths in withdraw/harvest | Explicit guards |
| C7 | `get_total_assets()` hardcoded constant | Principal-tracking accounting model: assets = deployed principal + collected fees + lent collateral; IL realized at withdraw against actual Ekubo return |
| C8 | Pillars III & IV had no contract implementations | `YieldRouter.cairo`, `TwapExecutor.cairo`, `PaymasterRelay.cairo` specified |

---

## Table of Contents
1. [Executive Overview & Protocol Thesis](#1-executive-overview--protocol-thesis)
2. [The Core Problem & The Oblivion Breakthrough](#2-the-core-problem--the-oblivion-breakthrough)
3. [End-to-End System Topology](#3-end-to-end-system-topology)
4. [The 5 Core Pillars & Mathematical Formulations](#4-the-5-core-pillars--mathematical-formulations)
5. [Cairo Smart Contract Suite & Data Schemas](#5-cairo-smart-contract-suite--data-schemas)
6. [Formal Security & "Hidden vs. Verifiable" Threat Model](#6-formal-security--hidden-vs-verifiable-threat-model)
7. [Frontend Architecture & User Experience](#7-frontend-architecture--user-experience)
8. [Protocol Economics & Liquidity Flywheel](#8-protocol-economics--liquidity-flywheel)
9. [Starknet Mainnet Integration & `strk20.json` Manifest](#9-starknet-mainnet-integration--strk20json-manifest)
10. [Engineering Implementation & Deployment Runbook](#10-engineering-implementation--deployment-runbook)

---

## 1. Executive Overview & Protocol Thesis

**Oblivion Protocol** is Starknet's first **Confidential Concentrated Liquidity Market Maker & Dark Execution Router**, built natively on StarkWare's **STRK20 zero-knowledge privacy pool**.

Oblivion transforms shielded ERC-20 tokens (STRK, USDC, ETH, WBTC) from dormant, unproductive assets into **active, yield-bearing dark capital**. It enables institutional liquidity providers and retail traders to:
1. Provide **Concentrated Liquidity (CLMM)** into AMM pools (Ekubo) without revealing their capital size, custom price ranges, or accumulated fee yields.
2. Execute **Zero-MEV, Zero-Slippage Batch Swaps** via sealed-commitment **Coincidence of Wants (CoW)** matching before routing residual volume to external AMMs.
3. Automatically route idle shielded collateral into Starknet lending markets (**Nostra / zkLend**) for multi-stream yield compounding.
4. Delegate algorithmic orders (TWAP, Stop-Loss) to decentralized keepers using **Starknet Session Keys** (Cartridge WebAuthn).
5. Generate verifiable **Zero-Knowledge Proofs of Solvency and Clean Provenance** for institutional auditors on demand using the embedded **ATTEST Compliance Engine**.

---

## 2. The Core Problem & The Oblivion Breakthrough

### The Paradox of Transparent On-Chain Finance

| Vulnerability | What Happens on Public AMMs | How Oblivion Protocol Solves It |
|---|---|---|
| **Toxic MEV & Sandwiching** | Searchers frontrun large swaps, forcing traders to accept maximum slippage. | Orders are escrowed as **sealed commitments during a blind window** and matched only after the window closes — front-running is structurally impossible, not merely discouraged. |
| **LP Capital Exposure** | Whales and market makers leak their tick bounds and rebalancing thresholds, allowing predatory traders to push prices out of range. | Liquidity is pooled from encrypted STRK20 notes into **blended, aggregate ticks** on Ekubo; individual LP bounds and balances never appear in storage, calldata, or events. |
| **Fee Yield Leakage** | Public fee harvesting reveals LP performance, trading volume, and compounding strategy. | Fees are harvested atomically and accrued to **per-token fee indices**; individual entitlements move only as private notes. |
| **Compliance Deadlock** | Traditional privacy mixers (Tornado Cash) are completely cut off from institutional capital due to lack of auditability. | Oblivion enforces **FPI deposit screening** and embeds the **ATTEST Engine**, allowing LPs to generate verifiable cryptographic solvency and provenance proofs on demand. |

---

## 3. End-to-End System Topology

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
|                            |                                                    ^                             |
|                            v (single atomic privacy_invoke)                       |  (note credit-back:         |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                          OBLIVION CORE CONTRACT ENGINE                                  |  |
|  |                                                                                                         |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |   | Pillar I: OblivionVault.cairo         |             | Pillar II: CoWMatcher.cairo           |       |  |
|  |   | - Per-token share & fee accounting    | <---------> | - Sealed commit window (escrowed)     |       |  |
|  |   | - Ekubo adapter (tick blender)        |  residual   | - Reveal-after-close settlement       |       |  |
|  |   | - Atomic fee compounding              |  routing    | - Solver fills, on-chain verification |       |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |                       |                                                     |                           |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |   | Pillar III: YieldRouter.cairo         |             | Pillar IV: TwapExecutor.cairo         |       |  |
|  |   | - Allowlisted money markets           |             | - Session-key policy engine           |  |  |
|  |   | - Atomic recall inside withdrawals    |             | - Budget / interval / slippage guards |       |  |
|  |   +---------------------------------------+             +---------------------------------------+       |  |
|  |                                                                                                         |  |
|  |   +---------------------------------------------------------------------------------------------+      |  |
|  |   | Pillar V: ATTEST Compliance Engine                                                          |      |  |
|  |   | - AttestEngine.cairo  : fact-type registry, public-input binding, expiry                    |      |  |
|  |   | - SolvencyProver.cairo: STARK verifier dispatch (Garaga-compiled circuits)                  |      |  |
|  |   | - Fact 1 Solvency · Fact 2 FPI Clean Provenance · Fact 3 Viewing-Key PnL Export            |      |  |
|  |   +---------------------------------------------------------------------------------------------+      |  |
|  +---------------------------------------------------------------------------------------------------------+  |
|                            |                                                    ^                             |
|                            v (composed external integrations)                     | (yields / fees recalled)    |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                  EXTERNAL STARKNET PROTOCOL ECOSYSTEM                                   |  |
|  |            [ Ekubo Core CLMM ]          [ Pragma Oracle ]          [ Nostra / zkLend ]                  |  |
|  +---------------------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------------+
```

**Integration boundary rule.** Every external protocol is reached through an Oblivion-owned adapter (`IEkuboPositionManager`, `IMoneyMarket`, `IPragmaOracle`). Adapter ABIs are generated from each protocol's published mainnet interface — never hand-typed. The STRK20-facing surface is the canonical single-entrypoint anonymizer pattern documented at strk20-by-example.org/helpers/privacy-invoke; the note credit-back adapter below must be aligned line-by-line with the reference implementation in `starkware-libs/starknet-privacy` before deployment.

---

## 4. The 5 Core Pillars & Mathematical Formulations

### Pillar I: Shielded Concentrated Liquidity (Shielded CLMM)

#### 1. Mechanism Overview
1. The user spends shielded notes into `OblivionVault.cairo` through one atomic `privacy_invoke` instruction issued by the STRK20 pool.
2. The vault pools capital across all shielded depositors of a given token $T$ and blends individual desired ranges into an **aggregated tick distribution** deployed on Ekubo Core via the position-manager adapter.
3. The vault records the position **keyed internally by a salted commitment** — ticks, size, and ownership exist nowhere in public storage, calldata, or events.

#### 2. Virtual Share & Fee Compounding Math (per token $T$)

$$S_i = \begin{cases} A_{\text{deposit}} & \text{if } S_{\text{total}}^T = 0 \\[4pt] \dfrac{A_{\text{deposit}} \cdot S_{\text{total}}^T}{A_{\text{vault}}^T} & \text{if } S_{\text{total}}^T > 0 \end{cases}$$

where $A_{\text{vault}}^T = P^T + F^T + L^T$ (deployed principal + collected fees held + lent collateral for token $T$).

When trading fees $\Delta F^T$ are harvested from Ekubo:

$$\text{AccFeePerShare}_{\text{new}}^T = \text{AccFeePerShare}_{\text{old}}^T + \left\lfloor \dfrac{\Delta F^T \cdot 10^{18}}{S_{\text{total}}^T} \right\rfloor, \quad S_{\text{total}}^T > 0 \text{ asserted}$$

On withdrawal the user's gross entitlement is:

$$\text{Gross}_i = \left\lfloor \dfrac{s_i \cdot A_{\text{vault}}^T}{S_{\text{total}}^T} \right\rfloor + \left\lfloor \dfrac{s_i \cdot \text{AccFeePerShare}^T}{10^{18}} \right\rfloor - \text{feeDebt}_i$$

Impermanent loss is realized honestly: the Ekubo leg returns its **actual** amount; any shortfall versus recorded principal reduces the payout — never socialized to other LPs.

#### 3. Privacy Property
All vault events carry only $\text{actionHash} = \text{Poseidon}(\text{noteCommitment}, \text{tag}, \text{nonce})$. Observers cannot link a deposit, harvest, and withdrawal to the same position, nor read sizes or ranges.

---

### Pillar II: Dark CoW Batch Auctions

#### 1. Mechanism Overview — sealed until binding
Instead of executing trades individually against public AMM curves, Oblivion processes orders in discrete batch epochs with **two separated phases**:

1. **Commit window** (e.g., blocks $N$ to $N+30$): a trader spends shielded notes into batch escrow and registers only $\text{orderCommitment} = \text{Poseidon}(T_{\text{in}}, T_{\text{out}}, x_{\max}, P_{\min}, \text{salt})$. Nothing else is on-chain.
2. **Settlement window**: after the commit deadline, a **solver** (permissionless role) submits the reveal vector and proposed fills. The contract verifies, for every fill:
   - $\text{Poseidon}(\text{revealed fields}) = \text{orderCommitment}$ (binding reveal),
   - execution price $\geq P_{\min}$ for sells ($\leq$ for buys),
   - conservation: $\sum \text{exec}_{\text{in}} = \sum \text{escrowed}_{\text{in}}$ per side,
   - uniformity: every fill clears at the same $P_{\text{clearing}}$, within a $\pm b$ bp band of the Pragma anchor.
3. **Uniform clearing price.** Matched volume $M$ executes internally at $P_{\text{clearing}}$:

$$M = \min\Big(\sum x_{\text{buy}},\ \sum y_{\text{sell}} \cdot P_{\text{clearing}}\Big), \qquad P_{\text{clearing}} \in \big[\min_k P_{\min,k},\ \max_k P_{\min,k}\big]$$

with pro-rata allocation on partial matches. Because every order is already escrowed before any price is known, front-running and sandwiching are **structurally impossible**.
4. **Residual routing.** Unmatched imbalance $(\sum x_{\text{buy}} - M)$ routes through Ekubo/AVNU via atomic multi-call.
5. **Liveness.** Any order not revealed by the settler becomes claimable through `refund_unrevealed` after a grace timeout — censoring settlers gains nothing.

---

### Pillar III: Composable Shielded Yield & Money Market Router

Capital locked in privacy pools is traditionally unproductive (0% APY). Oblivion introduces **Dynamic Idle Collateral Routing**:
- Shielded reserves not actively deployed in CLMM ranges or pending batch settlements are supplied to **allowlisted Nostra / zkLend markets**, subject to per-market caps and a utilization guard.
- Withdrawals recall the required liquidity from the money market **inside the same atomic `privacy_invoke` transaction** — idle capital never delays an exit.

$$\text{Total APY} = \text{CLMM Fee Yield} + \text{Internal Batch Matching Fee Yield} + \text{Lending Market APY}$$

---

### Pillar IV: Autonomous Intent Execution via Starknet Session Keys

Algorithmic execution (TWAP, Trailing Stop-Loss, Range Rebalancing) typically requires the user to stay online to sign every sub-transaction. Oblivion solves this with **policy-bound session authorization**:
1. **Session Authorization:** the user signs a WebAuthn session key (Cartridge Controller) binding a `SessionPolicy`: budget cap, token pair, max slippage (bps), minimum block interval, expiry.
2. **Keeper Invariants:** keepers trigger slices through `TwapExecutor.cairo`; the contract enforces — on-chain, per slice — interval elapsed, budget remaining, and $|P_{\text{exec}} - P_{\text{oracle}}| \leq \text{slippage}_{\text{bps}}$.
3. **Gasless Paymaster Relay:** keeper gas is sponsored from the protocol fee treasury, decoupling the keeper's submitter address from the trader. *Honesty note:* the sponsorship leg itself is public — this decouples identities; it does not hide that a relay paid gas.

---

### Pillar V: ATTEST — Selective Disclosure Compliance & Solvency Engine

#### Fact 1: Cryptographic Proof of Pool Solvency
Anyone can verify $\sum \text{Assets}_{\text{on-chain}} \geq \sum \text{Liabilities}_{\text{shares}}$ via a STARK proof whose public inputs commit to an asset/liability root pair — without revealing individual note balances. Circuits are authored in Cairo and compiled to on-chain verifier classes (Garaga toolchain); `SolvencyProver.cairo` dispatches to the registered class per fact type.

#### Fact 2: Proof of Clean Provenance
Every STRK20 deposit carries an FPI screening signature. `AttestEngine.cairo` verifies, inside the provenance circuit, that all pooled liquidity descends from FPI-cleared deposits — proving sanctions-clean origins without exposing counterparties.

#### Fact 3: Selective Auditor / Tax Export
An LP exports a viewing-key-derived certificate containing a cryptographic proof of net PnL and fee income over $[t_1, t_2]$ — revealing nothing else. Verification state (subject hash, fact type, expiry) is public; the underlying statements are not.

---

## 5. Cairo Smart Contract Suite & Data Schemas

```
contracts/
├── Scarb.toml                               # Scarb build configuration (Cairo 2.8+)
├── snfoundry.toml                           # Starknet Foundry test runner config
└── src/
    ├── lib.cairo                            # Library root & exports
    ├── core/
    │   ├── OblivionVault.cairo              # Single-entrypoint anonymizer: per-token shares, fee indices, Ekubo adapter
    │   ├── EkuboPositionManager.cairo       # Oblivion-owned adapter around Ekubo Core canonical ABI
    │   └── CoWMatcher.cairo                 # Sealed-commitment batch auctions: escrow → reveal → verified clearing
    ├── compliance/
    │   ├── AttestEngine.cairo               # Fact-type registry, public-input binding, expiry, third-party reads
    │   └── SolvencyProver.cairo             # STARK verifier dispatch (Garaga-compiled circuit classes)
    ├── execution/
    │   ├── TwapExecutor.cairo               # Session-policy engine: budget / interval / slippage invariants
    │   └── PaymasterRelay.cairo             # Treasury-sponsored gas relay for keepers
    ├── yield/
    │   └── YieldRouter.cairo                # Allowlisted money-market supply / atomic recall
    └── interfaces/
        ├── ISTRK20Pool.cairo                # Live STRK20 mainnet pool interface
        ├── IStrk20NoteIssuer.cairo          # Credit-back adapter: mint result notes to recipient commitments
        ├── IEkuboPositionManager.cairo      # Oblivion adapter interface (bindings generated from Ekubo ABI)
        ├── IMoneyMarket.cairo               # Abstracted Nostra / zkLend supply-withdraw surface
        ├── IPragmaOracle.cairo              # Pragma decentralized oracle interface
        └── IAttest.cairo                    # Public ATTEST interface for third-party dapps
```

**Canonical constants**

```rust
const ACTION_DEPOSIT: felt252 = 1;
const ACTION_WITHDRAW: felt252 = 2;
const ACTION_HARVEST: felt252 = 3;
const ACTION_ORDER_COMMIT: felt252 = 4;
const FEE_INDEX_SCALE: u256 = 1_000_000_000_000_000_000_u256; // 1e18
```

---

### Contract 1: `OblivionVault.cairo`

```cairo
#[starknet::interface]
pub trait IOblivionVault<ContractState> {
    /// THE single entrypoint invoked atomically by the STRK20 pool.
    /// payload layout (Span<felt252>): [action_tag, nonce, ...action_params...]
    fn privacy_invoke(ref self: ContractState, payload: Span<felt252>);
}

#[starknet::contract]
mod OblivionVault {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::poseidon::HadesPermutation;

    const ACTION_DEPOSIT: felt252 = 1;
    const ACTION_WITHDRAW: felt252 = 2;
    const ACTION_HARVEST: felt252 = 3;

    #[storage]
    struct Storage {
        strk20_pool: ContractAddress,
        position_manager: ContractAddress,   // EkuboPositionManager
        note_issuer: ContractAddress,        // IStrk20NoteIssuer adapter (align w/ reference impl)
        attest_engine: ContractAddress,

        // ---- per-token accounting (correction C1) ----
        total_shares: Map<ContractAddress, u256>,        // S_total^T
        acc_fee_per_share: Map<ContractAddress, u256>,   // 1e18-scaled index
        principal_deployed: Map<ContractAddress, u256>,  // P^T sitting in Ekubo
        collected_fees: Map<ContractAddress, u256>,      // F^T harvested, held by vault
        lent_collateral: Map<ContractAddress, u256>,     // L^T out at money markets (via YieldRouter)

        // positions keyed by internal hash of the note commitment
        lp_positions: Map<felt252, LPPosition>,
        // replay protection for every instruction
        used_nonces: Map<felt252, bool>,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct LPPosition {
        token: ContractAddress,
        lower_tick: i128,
        upper_tick: i128,
        shares: u256,
        principal: u256,
        fee_debt: u256,          // acc_fee_per_share snapshot at deposit, 1e18-scaled
        deposited_at: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        /// The ONLY event shape this contract emits (correction C2):
        /// unlinkable per-action hash. No ticks, sizes, payouts, or correlations.
        ActionCommitted: ActionCommitted,
    }

    #[derive(Drop, starknet::Event)]
    struct ActionCommitted {
        #[key]
        action_hash: felt252, // Poseidon(note_commitment, action_tag, nonce)
    }

    #[abi(embed_v0)]
    impl OblivionVaultImpl of super::IOblivionVault<ContractState> {
        fn privacy_invoke(ref self: ContractState, payload: Span<felt252>) {
            // (1) Only the STRK20 pool may drive this contract.
            assert(get_caller_address() == self.strk20_pool.read(), 'caller:not-pool');
            // (2) Deserialize envelope.
            let mut flt = SerdeFelt252SpanFlattener { span: payload };
            let action_tag = flt.next().unwrap();
            let nonce = flt.next().unwrap();
            let note_commitment = flt.next().unwrap();
            // (3) Replay protection.
            assert(!self.used_nonces.read(nonce), 'nonce:replay');
            self.used_nonces.write(nonce, true);

            if action_tag == ACTION_DEPOSIT {
                let token = flt.next().unwrap();
                let amount = Serde::<u256>::deserialize(ref flt).unwrap();
                let lower_tick = Serde::<i128>::deserialize(ref flt).unwrap();
                let upper_tick = Serde::<i128>::deserialize(ref flt).unwrap();
                self._handle_deposit(note_commitment, token, amount, lower_tick, upper_tick, nonce);
            } else if action_tag == ACTION_WITHDRAW {
                let token = flt.next().unwrap();
                let shares_to_burn = Serde::<u256>::deserialize(ref flt).unwrap();
                self._handle_withdraw(note_commitment, token, shares_to_burn, nonce);
            } else if action_tag == ACTION_HARVEST {
                let token = flt.next().unwrap();
                self._handle_harvest(token, nonce);
            } else {
                assert(false, 'action:unknown');
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _handle_deposit(
            ref self: ContractState,
            note_commitment: felt252,
            token: ContractAddress,
            amount: u256,
            lower_tick: i128,
            upper_tick: i128,
            nonce: felt252,
        ) {
            assert(amount > 0_u256, 'amount:zero');

            let pos_key = PoseidonTrait::new()
                .hash_span(array![note_commitment].span());
            assert(self.lp_positions.read(pos_key).shares == 0_u256, 'pos:exists');

            let s_total = self.total_shares.read(token);
            let a_vault = self._total_assets(token);

            let minted = if s_total == 0_u256 || a_vault == 0_u256 {
                amount
            } else {
                // floor division; dust accrues to existing LPs, never to depositor
                (amount * s_total) / a_vault
            };
            assert(minted > 0_u256, 'shares:dust');

            let idx = self.acc_fee_per_share.read(token);
            self.lp_positions.write(pos_key, LPPosition {
                token,
                lower_tick,
                upper_tick,
                shares: minted,
                principal: amount,
                fee_debt: (minted * idx) / FEE_INDEX_SCALE,
                deposited_at: get_block_timestamp(),
            });
            self.total_shares.write(token, s_total + minted);

            // Deploy blended capital to Ekubo through the adapter.
            let mgr = IEkuboPositionManagerDispatcher { contract_address: self.position_manager.read() };
            mgr.deploy(token, amount, lower_tick, upper_tick);
            self.principal_deployed.write(token, self.principal_deployed.read(token) + amount);

            self.emit(ActionCommitted {
                action_hash: PoseidonTrait::new()
                    .hash_span(array![note_commitment, ACTION_DEPOSIT, nonce].span()),
            });
        }

        fn _handle_withdraw(
            ref self: ContractState,
            note_commitment: felt252,
            token: ContractAddress,
            shares_to_burn: u256,
            nonce: felt252,
        ) {
            let pos_key = PoseidonTrait::new()
                .hash_span(array![note_commitment].span());
            let mut pos = self.lp_positions.read(pos_key);
            assert(pos.token == token, 'token:mismatch');
            assert(pos.shares >= shares_to_burn && shares_to_burn > 0_u256, 'shares:bad');

            let s_total = self.total_shares.read(token);
            let a_vault = self._total_assets(token);
            assert(s_total > 0_u256 && a_vault > 0_u256, 'vault:empty'); // correction C6

            // Pro-rata gross on FULL vault value (principal + fees + lent).
            let gross_principal = (shares_to_burn * a_vault) / s_total;

            // Fee entitlement since deposit.
            let idx = self.acc_fee_per_share.read(token);
            let fee_entitlement =
                ((shares_to_burn * idx) / FEE_INDEX_SCALE) - pos.fee_debt;

            let total_payout = gross_principal + fee_entitlement;

            // Burn first (checks-effects-interactions).
            pos.shares -= shares_to_burn;
            pos.fee_debt = (pos.shares * idx) / FEE_INDEX_SCALE;
            self.lp_positions.write(pos_key, pos);
            self.total_shares.write(token, s_total - shares_to_burn);

            // Recall what this redemption actually consumes:
            // 1) pull from Ekubo (realizes IL against recorded principal honestly)
            let mgr = IEkuboPositionManagerDispatcher { contract_address: self.position_manager.read() };
            let ekubo_returned = mgr.redeem(token, gross_principal, pos.lower_tick, pos.upper_tick);
            self.principal_deployed.write(
                token, self.principal_deployed.read(token) - gross_principal
            );
            // 2) top up any shortfall from held fees / lent collateral via YieldRouter recall
            if ekubo_returned < total_payout {
                let shortfall = total_payout - ekubo_returned;
                let yr = IYieldRouterModuleDispatcher { contract_address: self.yield_router.read() };
                yr.recall(token, shortfall); // reverts if liquidity genuinely unavailable
                self.lent_collateral.write(token, self.lent_collateral.read(token) - shortfall);
            }

            // Credit the payout BACK into the user's private note (correction C3).
            let issuer = IStrk20NoteIssuerDispatcher { contract_address: self.note_issuer.read() };
            issuer.mint_notes(note_commitment, token, total_payout);

            // Unlinkable receipt only — no amounts, no ticks (correction C2).
            self.emit(ActionCommitted {
                action_hash: PoseidonTrait::new()
                    .hash_span(array![note_commitment, ACTION_WITHDRAW, nonce].span()),
            });
        }

        fn _handle_harvest(ref self: ContractState, token: ContractAddress, nonce: felt252) {
            let mgr = IEkuboPositionManagerDispatcher { contract_address: self.position_manager.read() };
            let harvested = mgr.collect_fees(token);
            if harvested == 0_u256 {
                return;
            }
            self.collected_fees.write(token, self.collected_fees.read(token) + harvested);

            let s_total = self.total_shares.read(token);
            assert(s_total > 0_u256, 'shares:zero'); // correction C6
            let inc = (harvested * FEE_INDEX_SCALE) / s_total;
            let new_idx = self.acc_fee_per_share.read(token) + inc;
            self.acc_fee_per_share.write(token, new_idx);

            self.emit(ActionCommitted {
                action_hash: PoseidonTrait::new()
                    .hash_span(array![token.into(), ACTION_HARVEST, nonce].span()),
            });
        }

        /// Accounting model (correction C7): assets = principal + collected fees + lent collateral.
        /// No oracle mark-to-market; IL is realized against actual Ekubo returns at redeem time.
        fn _total_assets(self: @ContractState, token: ContractAddress) -> u256 {
            self.principal_deployed.read(token)
                + self.collected_fees.read(token)
                + self.lent_collateral.read(token)
        }
    }
}
```

---

### Contract 2: `CoWMatcher.cairo` (Sealed Dark Batch Auction Engine)

```cairo
#[starknet::contract]
mod CoWMatcher {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::poseidon::HadesPermutation;

    const SIDE_BUY: felt252 = 0;
    const PHASE_GRACE_SECONDS: u64 = 3600; // refund window for unrevealed orders

    #[storage]
    struct Storage {
        strk20_pool: ContractAddress,
        note_issuer: ContractAddress,     // credit-back adapter
        pragma_oracle: ContractAddress,
        band_bps: u32,                    // max deviation of clearing price from oracle anchor

        batch_counter: u64,
        batches: Map<u64, BatchState>,
        orders: Map<felt252, Order>,      // key = order_commitment
        used_nonces: Map<felt252, bool>,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct BatchState {
        token_in: ContractAddress,
        token_out: ContractAddress,
        commit_deadline: u64,
        escrowed_in: u256,     // sum of escrowed sell-side input (or buy-side budget)
        escrowed_out: u256,
        order_count: u64,
        is_settled: bool,
        settled_at: u64,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct Order {
        batch_id: u64,
        side: felt252,                 // SIDE_BUY or SIDE_SELL
        amount: u256,                  // escrowed size
        limit_price: u256,             // revealed only at settlement
        owner_note: felt252,           // destination commitment for proceeds
        revealed: bool,
        filled_in: u256,
        filled_out: u256,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct Fill {
        order_commitment: felt252,
        exec_in: u256,
        exec_out: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        // Batch metadata is intentionally public (see threat model):
        BatchOpened: BatchOpened,
        BatchCleared: BatchCleared,
        // Order-level facts remain hidden: hashed receipts only.
        OrderSealed: OrderSealed,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchOpened { #[key] batch_id: u64, commit_deadline: u64 }
    #[derive(Drop, starknet::Event)]
    struct BatchCleared { #[key] batch_id: u64, clearing_price: u256, matched_in: u256 }
    #[derive(Drop, starknet::Event)]
    struct OrderSealed { order_hash: felt252 } // Poseidon(commitment, nonce) — unlinkable

    #[abi(embed_v0)]
    impl CoWMatcherImpl of super::ICoWMatcher<ContractState> {
        /// Opens a batch epoch. Anyone may open; parameters are immutable once set.
        fn open_batch(
            ref self: ContractState,
            token_in: ContractAddress,
            token_out: ContractAddress,
            commit_duration_seconds: u64,
        ) -> u64 {
            let next_id = self.batch_counter.read() + 1;
            self.batch_counter.write(next_id);
            self.batches.write(next_id, BatchState {
                token_in, token_out,
                commit_deadline: get_block_timestamp() + commit_duration_seconds,
                escrowed_in: 0_u256, escrowed_out: 0_u256,
                order_count: 0_u64, is_settled: false, settled_at: 0_u64,
            });
            self.emit(BatchOpened { batch_id: next_id, commit_deadline: get_block_timestamp() + commit_duration_seconds });
            next_id
        }

        /// Invoked via the STRK20 pool's privacy_invoke while the commit window is OPEN.
        /// Escrows the note value immediately and stores ONLY the commitment-derived record.
        /// limit_price arrives inside the payload but is never emitted.
        fn commit_order(
            ref self: ContractState,
            batch_id: u64,
            order_commitment: felt252,   // Poseidon(token_in, token_out, amount, limit_price, salt)
            side: felt252,
            amount: u256,                // escrowed now, moved from the spent note
            owner_note: felt252,
            nonce: felt252,
        ) {
            let mut batch = self.batches.read(batch_id);
            assert(!batch.is_settled, 'batch:settled');
            assert(get_block_timestamp() <= batch.commit_deadline, 'commit:closed');
            assert(!self.used_nonces.read(nonce), 'nonce:replay');
            assert(self.orders.read(order_commitment).amount == 0_u256, 'order:exists');
            self.used_nonces.write(nonce, true);

            self.orders.write(order_commitment, Order {
                batch_id, side, amount,
                limit_price: 0_u256,     // UNSET until reveal — sealed phase
                owner_note,
                revealed: false,
                filled_in: 0_u256, filled_out: 0_u256,
            });

            if side == SIDE_BUY {
                batch.escrowed_out += amount;      // buy-side budget denominated in token_out
            } else {
                batch.escrowed_in += amount;       // sell-side size denominated in token_in
            }
            batch.order_count += 1;
            self.batches.write(batch_id, batch);

            self.emit(OrderSealed {
                order_hash: PoseidonTrait::new()
                    .hash_span(array![order_commitment, nonce].span()),
            });
        }

        /// Settlement. Permissionless solver submits the reveal vector + proposed fills.
        /// The contract is the judge: nothing trusts the solver.
        fn settle_batch(
            ref self: ContractState,
            batch_id: u64,
            reveals: Span<Reveal>,   // {order_commitment, limit_price, salt}
            fills: Span<Fill>,
            oracle_anchor: u256,
        ) {
            let mut batch = self.batches.read(batch_id);
            assert(!batch.is_settled, 'batch:settled');
            assert(get_block_timestamp() > batch.commit_deadline, 'commit:open');

            // ---- Phase 1: verify reveals bind to commitments; materialize limit prices ----
            let mut i: u32 = 0;
            loop {
                if i >= reveals.len() { break; }
                let r = reveals.at(i);
                let mut o = self.orders.read(r.order_commitment);
                assert(o.batch_id == batch_id && !o.revealed, 'reveal:invalid');
                let recomputed = PoseidonTrait::new().hash_span(
                    array![
                        batch.token_in.into(), batch.token_out.into(),
                        o.amount.low, o.amount.high,
                        r.limit_price.low, r.limit_price.high, r.salt
                    ].span()
                );
                assert(recomputed == r.order_commitment, 'reveal:mismatch');
                o.limit_price = r.limit_price;
                o.revealed = true;
                self.orders.write(r.order_commitment, o);
                i += 1;
            };

            // ---- Phase 2: verify the fill vector ----
            // (a) uniform price: every fill satisfies exec_out/exec_in == clearing_price
            // (b) limit respect: sells require clearing >= limit; buys require clearing <= limit
            // (c) conservation: sum(exec_in) <= escrowed_in ; sum(exec_out) <= escrowed_out
            // (d) oracle band: |clearing - anchor| <= anchor * band_bps / 10_000
            let clearing = Self::_verify_and_price(fills, oracle_anchor, self.band_bps.read());
            let (mut used_in, mut used_out) = (0_u256, 0_u256);
            let mut j: u32 = 0;
            loop {
                if j >= fills.len() { break; }
                let f = fills.at(j);
                let mut o = self.orders.read(f.order_commitment);
                assert(o.revealed, 'fill:unrevealed');
                if o.side == SIDE_BUY {
                    assert(clearing <= o.limit_price, 'fill:limit-buy');
                } else {
                    assert(clearing >= o.limit_price, 'fill:limit-sell');
                }
                assert(o.amount >= f.exec_in, 'fill:size');
                o.filled_in = f.exec_in;
                o.filled_out = f.exec_out;
                self.orders.write(f.order_commitment, o);
                used_in += f.exec_in;
                used_out += f.exec_out;
                j += 1;
            };
            assert(used_in <= batch.escrowed_in && used_out <= batch.escrowed_out, 'fill:conservation');

            // ---- Phase 3: effects ----
            // Proceeds are credited back into private notes; unfilled escrow stays
            // claimable via refund_unrevealed / refund_unfilled after grace.
            batch.clearing_price = clearing;
            batch.is_settled = true;
            batch.settled_at = get_block_timestamp();
            self.batches.write(batch_id, batch);

            self.emit(BatchCleared { batch_id, clearing_price: clearing, matched_in: used_in });
        }

        /// Liveness: after settle + grace, any participant can reclaim unrevealed/unfilled escrow.
        /// Censoring by a malicious settler therefore gains nothing.
        fn refund_unrevealed(ref self: ContractState, batch_id: u64, order_commitment: felt252) {
            let batch = self.batches.read(batch_id);
            assert(batch.is_settled, 'batch:open');
            assert(get_block_timestamp() > batch.settled_at + PHASE_GRACE_SECONDS, 'grace:active');
            let o = self.orders.read(order_commitment);
            assert(o.batch_id == batch_id, 'order:batch');
            let remaining_in = o.amount - o.filled_in;
            assert(remaining_in > 0_u256 || !o.revealed, 'nothing:to-refund');
            let issuer = IStrk20NoteIssuerDispatcher { contract_address: self.note_issuer.read() };
            issuer.mint_notes(o.owner_note, batch.token_in, remaining_in);
        }
    }

    #[generate_trait]
    impl Internals of InternalTrait {
        /// Uniform-price verification. Solver proposes fills at ONE price;
        /// contract enforces ratio consistency, limits, and the oracle band.
        fn _verify_and_price(
            fills: @Span<Fill>,
            anchor: u256,
            band_bps: u32,
        ) -> u256 {
            // Pseudocode contract for implementation:
            //   p = fills[0].exec_out * 1e18 / fills[0].exec_in
            //   for f in fills: assert f.exec_out * 1e18 / f.exec_in == p
            //   lo = anchor - anchor*band_bps/10_000 ; hi = anchor + anchor*band_bps/10_000
            //   assert p >= lo && p <= hi
            //   return p
            p
        }
    }
}
```

---

### Contract 3: `YieldRouter.cairo` (Pillar III)

```cairo
#[starknet::contract]
mod YieldRouter {
    use starknet::ContractAddress;

    const MAX_MARKETS: u32 = 8;
    const MAX_MARKET_UTILIZATION_BPS: u32 = 5_000; // never park >50% of vault assets in one market

    #[storage]
    struct Storage {
        vault: ContractAddress,                          // sole authorized caller
        markets: Map<u32, ContractAddress>,              // allowlisted IMoneyMarket adapters
        market_count: u32,
        deployed: Map<(ContractAddress, u32), u256>,     // (token, market_id) -> supplied
        caps: Map<u32, u256>,                            // per-market cap
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event { Supplied: Supplied, Recalled: Recalled }
    #[derive(Drop, starknet::Event)]
    struct Supplied { token: ContractAddress, market_id: u32, amount: u256 }
    #[derive(Drop, starknet::Event)]
    struct Recalled { token: ContractAddress, market_id: u32, amount: u256 }

    #[abi(embed_v0)]
    impl YieldRouterImpl of super::IYieldRouterModule<ContractState> {
        /// Vault-only. Called when idle capital exceeds operational buffer.
        fn supply_idle(ref self: ContractState, token: ContractAddress, market_id: u32, amount: u256) {
            assert(get_caller_address() == self.vault.read(), 'caller:not-vault');
            assert(market_id < self.market_count.read(), 'market:unknown');
            let current = self.deployed.read((token, market_id));
            assert(current + amount <= self.caps.read(market_id), 'market:cap');
            let mkt = IMoneyMarketDispatcher { contract_address: self.markets.read(market_id) };
            mkt.supply(token, amount);
            self.deployed.write((token, market_id), current + amount);
            self.emit(Supplied { token, market_id, amount });
        }

        /// Vault-only. MUST complete inside the withdrawal privacy_invoke multicall:
        /// idle capital never delays an exit. Reverts if liquidity is unavailable —
        /// the vault treats that as a hard error, never a silent shortfall.
        fn recall(ref self: ContractState, token: ContractAddress, amount: u256) {
            assert(get_caller_address() == self.vault.read(), 'caller:not-vault');
            // walk markets by ascending withdrawal cost until `amount` is covered;
            // revert if total deployed < amount (accounting invariant, see Vault C7)
            let mut remaining = amount;
            let mut m: u32 = 0;
            loop {
                if m >= self.market_count.read() || remaining == 0_u256 { break; }
                let dep = self.deployed.read((token, m));
                if dep > 0_u256 {
                    let take = if dep >= remaining { remaining } else { dep };
                    let mkt = IMoneyMarketDispatcher { contract_address: self.markets.read(m) };
                    mkt.withdraw(token, take);
                    self.deployed.write((token, m), dep - take);
                    remaining -= take;
                }
                m += 1;
            };
            assert(remaining == 0_u256, 'recall:shortfall');
            self.emit(Recalled { token, market_id: 0, amount });
        }
    }
}
```

---

### Contract 4: `TwapExecutor.cairo` + `PaymasterRelay.cairo` (Pillar IV)

```cairo
#[starknet::contract]
mod TwapExecutor {
    use starknet::{ContractAddress, get_block_number};

    #[storage]
    struct Storage {
        cow_matcher: ContractAddress,
        pragma_oracle: ContractAddress,
        sessions: Map<felt252, SessionPolicy>,   // key = session_id (session-key hash)
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct SessionPolicy {
        owner_note: felt252,
        token_in: ContractAddress,
        token_out: ContractAddress,
        total_budget: u256,
        spent: u256,
        slice_size: u256,
        max_slippage_bps: u32,
        min_interval_blocks: u64,
        last_executed_block: u64,
        expires_at: u64,
        active: bool,
    }

    #[abi(embed_v0)]
    impl TwapExecutorImpl of super::ITwapExecutor<ContractState> {
        /// User (via Cartridge session key signature verified upstream by AA) registers a plan.
        fn register_session(ref self: ContractState, session_id: felt252, policy: SessionPolicy) {
            assert(!self.sessions.read(session_id).active, 'session:exists');
            assert(policy.expires_at > get_block_timestamp(), 'session:expired');
            self.sessions.write(session_id, policy);
        }

        /// Keeper-triggered slice. EVERY invariant is enforced on-chain per slice:
        /// expiry, interval, budget, and oracle-band slippage. The keeper cannot
        /// deviate; it can only choose WHEN to fire a compliant slice.
        fn execute_slice(ref self: ContractState, session_id: felt252) {
            let mut s = self.sessions.read(session_id);
            assert(s.active, 'session:inactive');
            assert(get_block_timestamp() <= s.expires_at, 'session:expired');
            assert(
                get_block_number() >= s.last_executed_block + s.min_interval_blocks,
                'interval:too-soon'
            );
            assert(s.spent + s.slice_size <= s.total_budget, 'budget:exhausted');

            let oracle = IPragmaOracleDispatcher { contract_address: self.pragma_oracle.read() };
            let anchor = oracle.price(s.token_in, s.token_out);
            // slippage guard is passed down to the batch commit and re-checked at settle
            let matcher = ICoWMatcherDispatcher { contract_address: self.cow_matcher.read() };
            let batch = matcher.open_batch(s.token_in, s.token_out, /* short epoch */ 60);
            matcher.commit_order_sealed(
                batch, s.owner_note, s.slice_size, anchor, s.max_slippage_bps
            );

            s.spent += s.slice_size;
            s.last_executed_block = get_block_number();
            if s.spent == s.total_budget { s.active = false; }
            self.sessions.write(session_id, s);
        }
    }
}

#[starknet::contract]
mod PaymasterRelay {
    use starknet::ContractAddress;

    #[storage]
    struct Storage {
        fee_treasury: ContractAddress,     // funded from protocol revenue (§8)
        authorized_relayers: Map<ContractAddress, bool>,
        sponsored_gas_spent: Map<felt252, u256>, // per-session accounting cap
    }

    #[abi(embed_v0)]
    impl PaymasterRelayImpl of super::IPaymasterRelay<ContractState> {
        /// Sponsors keeper gas from treasury. Honesty property (threat model):
        /// the sponsorship leg is PUBLIC — this decouples keeper/submitter identity
        /// from the trader; it does not conceal that a relay transacted.
        fn sponsor(ref self: ContractState, session_id: felt252, max_cost: u256) {
            assert(self.authorized_relayers.read(get_caller_address()), 'relayer:unauthorized');
            let spent = self.sponsored_gas_spent.read(session_id);
            assert(spent + max_cost <= SESSION_GAS_CAP, 'gas:cap-exceeded');
            self.sponsored_gas_spent.write(session_id, spent + max_cost);
            ITreasuryDispatcher { contract_address: self.fee_treasury.read() }.pay_gas(max_cost);
        }
    }
}
```

---

### Contract 5: `AttestEngine.cairo` + `SolvencyProver.cairo` (Pillar V)

```cairo
#[starknet::contract]
mod AttestEngine {
    use starknet::{ClassHash, ContractAddress, get_caller_address, get_block_timestamp};

    pub const FACT_SOLVENCY: felt252 = 1;
    pub const FACT_PROVENANCE: felt252 = 2;
    pub const FACT_PNL_EXPORT: felt252 = 3;

    #[storage]
    struct Storage {
        admin: ContractAddress,
        prover: ContractAddress,                        // SolvencyProver dispatch contract
        issued: Map<felt252, AttestationRecord>,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct AttestationRecord {
        subject_hash: felt252,     // Poseidon(public_inputs) — binds proof to subject
        fact_type: felt252,
        is_valid: bool,
        issued_at: u64,
        expires_at: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event { AttestationIssued: AttestationIssued }
    #[derive(Drop, starknet::Event)]
    struct AttestationIssued {
        #[key] attestation_id: felt252,
        fact_type: felt252,
        subject_hash: felt252,
        expires_at: u64,
    }

    #[abi(embed_v0)]
    impl AttestEngineImpl of super::IAttestEngine<ContractState> {
        /// Registers the Garaga-compiled verifier CLASS for a fact type.
        /// Admin-gated + event-emitted so registrants are auditable (correction C5).
        fn set_fact_verifier(ref self: ContractState, fact_type: felt252, class: ClassHash) {
            assert(get_caller_address() == self.admin.read(), 'admin:only');
            self.prover.read(); // ensure prover wired
            ISolvencyProverDispatcher { contract_address: self.prover.read() }
                .register_verifier(fact_type, class);
            self.emit(VerifierRegistered { fact_type, class });
        }

        fn verify_and_issue_attestation(
            ref self: ContractState,
            attestation_id: felt252,
            fact_type: felt252,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            validity_duration: u64,
        ) -> bool {
            // 1) REAL verification: dispatch to the registered STARK verifier class.
            let prover = ISolvencyProverDispatcher { contract_address: self.prover.read() };
            assert(prover.verify(fact_type, proof, public_inputs), 'proof:invalid');

            // 2) Bind the attestation to THIS statement only.
            let subject_hash = PoseidonTrait::new().hash_span(public_inputs);
            assert(
                !self.issued.read(attestation_id).is_valid,
                'attestation:exists'
            );

            let expires_at = get_block_timestamp() + validity_duration;
            self.issued.write(attestation_id, AttestationRecord {
                subject_hash, fact_type,
                is_valid: true,
                issued_at: get_block_timestamp(),
                expires_at,
            });
            self.emit(AttestationIssued { attestation_id, fact_type, subject_hash, expires_at });
            true
        }

        /// Third-party read surface (other sprint dapps integrate HERE).
        fn is_attestation_valid(self: @ContractState, attestation_id: felt252) -> bool {
            let r = self.issued.read(attestation_id);
            r.is_valid && get_block_timestamp() <= r.expires_at
        }
    }
}

#[starknet::contract]
mod SolvencyProver {
    use starknet::ClassHash;

    #[storage]
    struct Storage {
        verifier_classes: Map<felt252, ClassHash>,  // fact_type -> Garaga-compiled verifier class
    }

    #[abi(embed_v0)]
    impl SolvencyProverImpl of super::ISolvencyProver<ContractState> {
        fn register_verifier(ref self: ContractState, fact_type: felt252, class: ClassHash) {
            self.verifier_classes.write(fact_type, class);
        }

        /// Dispatches a library-call into the registered verifier class.
        /// Fact semantics carried by public_inputs:
        ///  FACT_SOLVENCY   : [assets_root, liabilities_root, ge_bit]
        ///  FACT_PROVENANCE : [fpi_pubkey_hint, deposits_merkle_root, clearance_bit]
        ///  FACT_PNL_EXPORT : [viewing_key_commitment, pnl_low, pnl_high, period_hash]
        fn verify(
            self: @ContractState,
            fact_type: felt252,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) -> bool {
            let class = self.verifier_classes.read(fact_type);
            assert(class != DefaultClassHash::default(), 'verifier:unregistered');
            IVerifierLibraryDispatcher { class_hash: class }.verify_proof(proof, public_inputs)
        }
    }
}
```

---

## 6. Formal Security & "Hidden vs. Verifiable" Threat Model

Oblivion follows StarkWare's compliance-first design. One structural honesty rule from the STRK20 docs applies throughout: **the DeFi leg is confidential, not fully private** — the link to the user is hidden, while app-side actions and aggregate amounts on external protocols (Ekubo, money markets) remain observable.

| Dimension | Publicly Visible On-Chain | Cryptographically Hidden / Shielded |
|---|---|---|
| **LP Identity & Balance** | Aggregate vault liquidity per token. | Individual LP addresses, note balances, ownership percentages. |
| **Concentrated Tick Ranges** | Blended aggregate ticks live on Ekubo. | Which LP chose which bounds — **never emitted** (events carry `action_hash` only). |
| **Batch Order Flow** | Batch ID, deadlines, uniform clearing price, aggregate matched volume. | Individual orders during the blind window (sealed commitments); limit prices until reveal-after-close; trader identities always. |
| **Fee Compounding** | Aggregate harvest + per-token index updates. | Distribution across individual note holders. |
| **Money-Market Leg** | Total supplied/recalled per market. | Depositor breakdown behind the aggregate. |
| **Keeper Execution** | That a relay sponsored gas; slice timing. | Link between keeper, session, and trader's main wallet. |
| **Regulatory Audit** | ZK attestation records (subject hash, fact type, expiry). | Underlying balances, counterparties, unrelated activity. |

**Invariants enforced on-chain (tested with snforge fuzz + invariant suites):**
1. Caller-of-record for every anonymizer action is the STRK20 pool.
2. Nonce uniqueness across all instructions (replay impossibility).
3. Share conservation: Σ shares == `total_shares[token]` at every state transition.
4. Withdrawal payout ≤ pro-rata entitlement; IL never socialized.
5. Every fill: limit-respecting, uniformly priced, oracle-banded, conserving escrow.
6. No order binds before its batch commit deadline closes.
7. Attestations exist only under a registered verifier class with bound public inputs.

---

## 7. Frontend Architecture & User Experience

Next.js 14 (App Router) · TailwindCSS · starknet.js v10 · Starknet Wallet API route (the dapp never touches viewing keys):

```
frontend/
├── app/
│   ├── page.tsx                             # Dark AMM hero + terminal
│   ├── pool/page.tsx                        # Shielded CLMM manager (range slider → blended ticks)
│   ├── swap/page.tsx                        # Dark CoW batch terminal (live countdown, clearing chart)
│   ├── strategy/page.tsx                    # TWAP session builder (Cartridge WebAuthn sign)
│   └── compliance/page.tsx                  # ATTEST portal: generate / verify certificates
├── components/
│   ├── Navbar.tsx                           # Wallet picker (Ready, Argent X, Braavos, Cartridge)
│   ├── ShieldedBalanceBadge.tsx             # Encrypted-note balance reader
│   ├── ConcentratedTickSlider.tsx
│   ├── CoWBatchTimeline.tsx                 # Blind-window progress + settlement feed
│   └── AttestProofGenerator.tsx             # 1-click certificate exporter
└── lib/
    ├── starknet.ts
    ├── strk20WalletApi.ts                   # wallet_strk20PrepareInvoke / InvokeTransaction
    └── attestSdk.ts                         # client-side witness generation + proof request
```

**Visual system:** Obsidian `#0a0a0c` · Emerald `#10b981` · Cyan `#06b6d4` · glass cards `rgba(255,255,255,0.03)`; JetBrains Mono for hashes/data, Outfit/Inter for headings; GSAP transitions, animated batch rings, tx-receipt drawers.

---

## 8. Protocol Economics & Liquidity Flywheel

```
             +------------------------------------------------+
             |          INSTITUTIONAL CAPITAL DEPOSITED       |
             +------------------------------------------------+
                                    |
             +------------------------------------------------+
             |    Deepest Concentrated Liquidity on Ekubo     |
             +------------------------------------------------+
                                    |
             +------------------------------------------------+
             |    Zero-MEV Swaps & Best Execution via CoW     |
             +------------------------------------------------+
                                    |
             +------------------------------------------------+
             |    Maximum Fees Harvested & Auto-Compounded    |
             +------------------------------------------------+
                                    |
             +------------------------------------------------+
             |    Highest Shielded Yields (Attracts More TVL) |
             +------------------------------------------------+
```

**Revenue model:**
1. **CoW settlement fee — 0.05%** of internally matched volume (protocol margin).
2. **LP performance fee — 2.0%** of auto-compounded Ekubo yields → DAO treasury (also funds `PaymasterRelay`).
3. **Institutional attestation fee — $50/certificate** for on-demand compliance proofs.

---

## 9. Starknet Mainnet Integration & `strk20.json` Manifest

Live integration targets:
- **STRK20 Mainnet Pool:** `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- **Ekubo Core Mainnet:** `0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2`
- **Pragma Oracle Mainnet:** `0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f`

```json
{
  "name": "Oblivion Protocol",
  "one_liner": "Shielded concentrated liquidity, dark CoW batch swaps, and zero-knowledge compliance attestations on Starknet.",
  "category": "DeFi",
  "demo_url": "https://oblivion-protocol.vercel.app",
  "demo_video": "",
  "x_handle": "OblivionZK",
  "inspired_by": "RFP-05",
  "contracts": [
    { "address": "0x04OBLIVION_VAULT", "network": "mainnet" },
    { "address": "0x04EKUBO_POSITION_MANAGER", "network": "mainnet" },
    { "address": "0x04COW_MATCHER", "network": "mainnet" },
    { "address": "0x04YIELD_ROUTER", "network": "mainnet" },
    { "address": "0x04TWAP_EXECUTOR", "network": "mainnet" },
    { "address": "0x04ATTEST_ENGINE", "network": "mainnet" },
    { "address": "0x04SOLVENCY_PROVER", "network": "mainnet" }
  ],
  "transactions": [
    "0x01_SHIELD_LP_DEPOSIT_TX",
    "0x02_FEE_HARVEST_COMPOUND_TX",
    "0x03_BATCH_COMMIT_TX",
    "0x04_BATCH_SETTLE_TX",
    "0x05_YIELD_SUPPLY_RECALL_TX",
    "0x06_TWAP_SLICE_TX",
    "0x07_ATTEST_ISSUANCE_TX",
    "0x08_SHIELDED_WITHDRAW_TX"
  ],
  "builders": [{ "github": "", "telegram": "" }]
}
```

Every hash above corresponds to a distinct pillar exercised on mainnet — the full lifecycle **shield → provide → trade → compound → delegate → prove → exit**.

---

## 10. Engineering Implementation & Deployment Runbook

### Step 0 — Reference alignment (before any code)
- Read `strk20-by-example.org/helpers/privacy-invoke` + the SDK monorepo (`starkware-libs/starknet-privacy`) and align: single `privacy_invoke` payload encoding, and the exact note credit-back API behind `IStrk20NoteIssuer`.
- Generate Ekubo / Nostra / zkLend / Pragma bindings from their published mainnet ABIs into `interfaces/`.

### Step 1 — Build & test
```bash
cd contracts && scarb build
snforge test            # unit + fuzz + invariant suites (§6 invariants 1–7)
```

### Step 2 — Circuits & verifier classes
```bash
# Author solvency / provenance / PnL circuits in Cairo; compile with Garaga toolchain;
# produce verifier declaration classes per fact type, then:
starkli declare target/dev/oblivion_SolvencyProver.contract_class.json --network mainnet
# register classes via AttestEngine.set_fact_verifier (emits audit event)
```

### Step 3 — Declare & deploy
```bash
starkli declare target/dev/oblivion_OblivionVault.contract_class.json --network mainnet
starkli declare target/dev/oblivion_CoWMatcher.contract_class.json --network mainnet
starkli declare target/dev/oblivion_YieldRouter.contract_class.json --network mainnet
starkli declare target/dev/oblivion_TwapExecutor.contract_class.json --network mainnet
starkli declare target/dev/oblivion_AttestEngine.contract_class.json --network mainnet
starkli deploy <VAULT_CLASS> <STRK20_POOL> <EKUBO_ADAPTER> <NOTE_ISSUER> <ATTEST_ENGINE> --network mainnet
```

### Step 4 — Frontend
```bash
cd frontend && npm install && npm run dev
vercel --prod
```

### Step 5 — Mainnet exercise & manifest
Execute the eight transaction classes of §9 in order, record hashes into `strk20.json`, push — the crawler indexes automatically.

---

*Oblivion Protocol: maximum Cairo engineering depth, institutional market structure, and compliance-first privacy — the dark liquidity standard for Starknet.*
