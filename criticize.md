# CRITICIZE.MD — Oblivion Protocol Audit
**Date:** 2026-08-21 · **Scope:** everything in this repo vs. `OblivionProtocol.md` spec vs. hackathon judging criteria (Integration 30% / Working Mainnet Product 30% / Innovation 25% / Docs 15%)

---

## Verdict

The repo has a **compelling spec, a compiling skeleton, and green tests that test nothing real**. Every external integration the protocol is named for — STRK20 pool, Ekubo, Pragma, Nostra, ZK proofs — is **stored as an address and never called**. What exists is internal accounting shells. Worse, several accounting shells contain **economically broken math** (infinite money printing) and **privacy leaks in the events** of a privacy protocol. The manifest previously advertised fabricated mainnet addresses/tx hashes to the crawler; it has been reset to the honest empty template.

| Layer | Status |
|---|---|
| Spec (`OblivionProtocol.md`) | Strong, coherent, buildable |
| Cairo contracts | Compile; ~1,500 lines; **zero real integrations** |
| Tests | 7+ pass, but all cheat-driven against fake addresses; validate the bugs |
| Frontend | Builds; static shell; hardcodes fabricated contract addresses |
| Mainnet evidence | **None** |
| Registration | Done (present in merged `registry.json`) |

---

## A. What hasn't been built at all

1. **STRK20 pool integration — the core of the hackathon.** No contract decodes a `privacy_invoke` payload, no note credit-back call exists, `ISTRK20Pool.cairo` interface is declared and never imported by any contract. Funds never enter or leave anything. The vault's "Only STRK20 Pool allowed" check is checked against a constructor argument nobody enforces in production.
2. **Ekubo integration (Pillar I).** `ekubo_core` stored, never called. Ticks are accepted, stored, emitted — and used for nothing. No LP position is ever opened, no fees ever collected. "Shielded Concentrated Liquidity" is currently fictional.
3. **Pragma oracle.** Stored, never called. `settle_batch` takes `oracle_price` as a trust-me function argument from any caller.
4. **Real money markets (Pillar III).** `INostraMoneyMarket` declared, unused. Yield is simulated.
5. **Real ZK proofs (Pillar V).** No Garaga circuits, no verifier classes, no `verify_proof`. `SolvencyProver.cairo` is 12 lines: an inequality comparing asset units to share units.
6. **TwapExecutor + PaymasterRelay** (spec §5, Contract 4) — missing entirely. `SessionKeyManager` partially stands in but does no signature verification and is referenced by nothing.
7. **Deployment artifacts.** No sncast profile, no deploy scripts, no declared classes, nothing on mainnet, no real tx hashes.
8. **Honest frontend wiring.** `frontend/lib/starknet.ts` hardcodes the same fabricated addresses that were in `strk20.json` (repeating-hex patterns like `...92a83e028b182a938e102`). The UI points at contracts that do not exist.
9. **A real fork test.** `test_mainnet_fork.cairo` deploys local mocks with mainnet addresses as labels. There is no `snforge` fork of SN_MAIN anywhere.
10. **Demo video / demo URL.**

## B. What's built but built wrong

### OblivionVault.cairo
1. **Cross-token share contamination** (spec Correction C1, still unfixed). `total_shielded_shares` is global; `total_vault_assets` is per-token. A USDC deposit mints shares priced off the USDC ledger; a STRK withdrawer then pays out of the STRK ledger using those shares. Multi-token accounting is structurally unsound.
2. **Infinite money printer.** `harvest_and_compound` credits `0.1% × total_vault_assets` per call **from nothing** — no Ekubo collect backs it. Call it N times and TVL grows 0.1%×N while share price pumps. Separately, on withdraw the `fee_reward` is paid **on top of** `gross_payout` but only `gross_payout` is debited from assets → guaranteed insolvency drift.
3. **Privacy leaks in events** (C2 unfixed). `ShieldedLPDeposited` emits `shares_minted`, `lower_tick`, `upper_tick` in plaintext; `ShieldedLPWithdrawn` emits `payout_amount`. The exact data the protocol promises to hide is published in the logs, keyed by a commitment whose deposit/withdraw pairing is trivially correlated.
4. **Three overlapping entrypoints** (`privacy_invoke_deposit`, `privacy_invoke_withdraw`, plus a second `privacy_invoke` returning `Span<OpenNoteDeposit>`) with copy-pasted logic — C3's single-dispatch design was not implemented.
5. Zero-share positions are never cleaned; fee accounting uses one global accumulator across tokens.

### CoWMatcher.cairo
1. **Zero privacy.** `commit_order` takes and *emits* `amount` and `is_token_a` in plaintext. `min_limit_price` is accepted and then discarded — limit prices don't exist.
2. **Trust-based settlement.** Anyone can call `settle_batch` with any price, before deadline, on an empty batch. When `volume_a > 0`, `volume_b` is ignored entirely — "matching" is a fiction.
3. **No escrow, no reveal phase, no refunds** — C4's sealed two-phase batch design (commit → close → reveal → solver fill → refund liveness) is absent. Settlement moves no funds.

### YieldRouter.cairo
- Comment admits it: *"Simulated Nostra 5% APY yield calculation per harvest cycle"* — mints 0.05% of routed assets per call from thin air (same printer pattern). `route_idle_capital`/`recall_capital` move no tokens; `nostra_market` never called.

### SessionKeyManager.cairo
- `validate_and_record_spend` performs **no cryptography**: any caller can burn any key's budget or use any key. No daily-window reset despite "max_daily_volume". Not wired into CoWMatcher.

### AttestEngine.cairo
- `verify_and_issue_attestation` accepts **any** non-empty `proof_data` hashing to non-zero → anyone can mint valid attestations about anything. No fact-type registry, no Garaga verifier classes, no revocation, no subject binding. `verify_solvency_proof` compares `vault_assets >= total_shares` across incommensurable units.

### Tests
- All unit tests cheat the caller into the pool address and assert the fake math (e.g. e2e asserts `fees == 100` = exactly the air-minted 0.1% of 100k). Green tests here **prove the bugs work**, not the protocol. The "mainnet fork" test even reuses a fabricated tx hash as a note commitment.

## C. What should be built — priority order

**P0 — Integrity (today)**
1. ✅ `strk20.json` reset to honest empty template (done in this pass).
2. Purge fabricated addresses from `frontend/lib/starknet.ts`; load from env/config with empty defaults.
3. Push the repo (auth still missing locally) and commit continuously — judges read the repo every 30 min.

**P1 — Make Pillar I real**
4. Step 0 alignment: pull the `privacy_invoke` payload encoding + `IStrk20NoteIssuer` credit-back API from strk20-by-example.org / starkware-libs/starknet-privacy; implement the single dispatch entrypoint; vault actually receives notes on deposit and returns notes on withdraw through the live pool.
5. Fix economics: per-token share ledgers, principal-tracking accounting (assets = principal + externally collected fees), delete both air-minting harvests, events reduced to unlinkable `action_hash` only.

**P2 — Make Pillar II real**
6. Sealed two-phase batches: escrow-at-commit via pool transfer, amount/side hidden until reveal-after-close, solver-submitted fills checked for limit price / conservation / uniform clearing price / Pragma oracle band, `refund_unrevealed` after grace period.

**P3 — Make Pillar V real**
7. Author 3 fact circuits, compile via Garaga, declare verifier classes, implement `set_fact_verifier` registry + real `verify_proof` dispatch + revocation in AttestEngine.

**P4 — Pillars III & IV**
8. Wire YieldRouter to a real Nostra/zkLend market; yield = observed exchange-rate delta, with caps and atomic recall.
9. TwapExecutor + PaymasterRelay per spec §5 Contract 4; session keys with actual signature verification, enforced inside CoWMatcher.

**P5 — Evidence (the 30%)**
10. Deploy via sncast to mainnet, execute the demo tx set against the live pool (shield → LP deposit → harvest → withdraw → attestation), put the **real** hashes in `strk20.json`, add genuine `snforge --fork` tests against SN_MAIN, record the 3-minute video.

---

## Score reality check
- Innovation (25%): strong on paper, will survive review.
- Docs (15%): strong.
- Integration depth (30%): currently near zero — no external protocol is touched.
- Working mainnet product (30%): currently zero, and was briefly negative-risk while fabricated hashes were published.

Everything in P0–P5 above maps directly to recovering the 60% of the score that is currently unearned.
