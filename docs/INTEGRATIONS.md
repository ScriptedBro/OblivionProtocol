# External Integrations

Oblivion Protocol is deliberately thin over battle-tested Starknet
infrastructure. Each integration below lists the **production contract**,
the **interface contract** we code against, and the **current testnet
stand-in**.

---

## 1. STRK20 Privacy Pool — the custody root

- **Mainnet:** `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- **Interface:** `contracts/src/interfaces/ISTRK20Pool.cairo`

```cairo
fn shield(token, amount, recipient_note_commitment);
fn unshield(nullifier, token, amount, recipient);
fn privacy_invoke(proof, note_commitment_root, payload);   // atomic private DeFi
fn verify_fpi_deposit(depositor, fpi_signature) -> bool;   // sanctions screening
```

### How Oblivion uses it (target)
1. **Entry:** user `shield()`s tokens → receives ZK note. The note commitment
   doubles as the vault position key.
2. **Private DeFi:** the wallet composes a `privacy_invoke` payload containing
   an open-note placeholder (`${openNoteIds[0]}`) plus the Oblivion calldata.
   The pool verifies the proof and executes against OblivionVault atomically —
   the chain never learns which note paid.
3. **Exit:** `unshield()` burns a note against a nullifier; the vault payout is
   the unshielded amount.
4. **Compliance:** `verify_fpi_deposit` signatures feed the ATTEST engine's
   *Clean Provenance* fact.

### Testnet stand-in 🟢
`MockPool.cairo` replicates the executor role permissionlessly with real
ERC-20 custody (`transferFrom` on deposit, `transfer` on payout). The vault's
`assert_only_pool` gate points at it. Swapping in the real pool = one
constructor argument + redeploy of the vault.

---

## 2. Ekubo Core — concentrated liquidity engine

- **Mainnet core:** `0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2`
- **Interface:** `contracts/src/interfaces/IEkuboCore.cairo`
- **Tick math:** geometric ticks, `price = 1.0001^tick`; frontend converts USD
  price bounds ↔ ticks via `round(ln(p) / ln(1.0001))`.

### Target flow
1. Vault aggregates shielded deposits into blended tick ranges.
2. `deposit_liquidity(pool_key, lower_tick, upper_tick, ...)` mints an Ekubo
   position NFT held by the **vault contract**, never by users.
3. Keepers call `claim_fees(position_id, token)`; proceeds are re-shielded into
   STRK20 notes and credited via the fee index.

### Testnet stand-in 🟡
Tick accounting, share math and fee indices are live in OblivionVault; external
Ekubo calls are not yet wired (Sepolia deployment of Ekubo + position NFT
custody is ROADMAP M3). The UI shows real ticks derived from user price inputs.

---

## 3. Pragma Feeds — oracle layer

- **Mainnet oracle:** `0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f`
- **Interface:** `contracts/src/interfaces/IPragmaOracle.cairo`

```cairo
fn get_data_median(data_type: felt252) -> PragmaPrice;
fn get_spot_price(pair_id: felt252) -> u256;
```

### Target usage
| Consumer | Use | Guard |
|----------|-----|-------|
| CoWMatcher settlement | uniform clearing price reference | submitted price within ±tolerance of median, else revert |
| YieldRouter | health of lending positions | staleness bound (reject if `timestamp < now − max_age`) |
| AttestEngine | solvency fact valuation | same median feed as settlement |

### Testnet stand-in 🟡
Settlement accepts a solver-submitted price without on-chain oracle bounding;
the frontend displays market reference prices from public sources. Wiring
Pragma Sepolia feeds + tolerance checks is ROADMAP M2/M3.

---

## 4. Nostra / zkLend — money markets

- **Interface:** `contracts/src/interfaces/INostraMoneyMarket.cairo`

```cairo
fn deposit(token, amount) -> u256;      // returns aTokens minted
fn withdraw(token, amount) -> u256;
fn get_lending_apy(token) -> u256;      // ray-formatted
```

### Target policy
- Route only the idle buffer (never 100% of TVL) to keep withdrawal liquidity.
- `recall_capital` is invoked by the vault *before* large withdrawals.
- Harvested yield re-enters the STRK20 pool as new shielded value.

### Testnet stand-in 🟡
YieldRouter maintains routed-balance accounting and events; market calls are
simulated. Real Nostra Sepolia integration is ROADMAP M4.

---

## 5. Garaga — on-chain ZK verification

The ATTEST engine's proofs (solvency, provenance, PnL audit) target STWO
(StarkWare's prover) compiled through **Garaga** into a Cairo verifier
deployed once per circuit.

### Target wiring
1. Circuits encode statements like *"Merkle root R of note commitments is
   consistent with assets ≥ liabilities"* or *"every deposit had a valid FPI
   screening signature"*.
2. Garaga emits a verifier contract; its class hash is embedded in
   AttestEngine at construction (immutable gate).
3. `verify_and_issue_attestation` forwards `proof_data` to the verifier before
   writing any record.

### Testnet stand-in 🔴
AttestEngine validates payload structure only. Verifier classes do not exist
yet — this is the single largest gap between docs and code (ROADMAP M5).

---

## 6. Wallet API — client-side privacy

Frontend targets the **STRK20 Wallet API** (`starknet.js WalletAccountV6`):
`strk20InvokeTransaction(actions)` for open-note + invoke batches and
`strk20Balances(tokens)` for read-only discovery. The app degrades honestly:
if the connected wallet lacks the API, private flows throw with guidance
instead of silently downgrading. See `frontend/lib/strk20Wallet.ts`.
