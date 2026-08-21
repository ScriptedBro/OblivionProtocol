# Roadmap — catching the code up to the docs

The documentation describes the **mainnet target**. This page is the ordered
plan to get there; each milestone has explicit acceptance criteria. Status
markers match the rest of the docs: 🟢 done · 🟡 partial · 🔴 open.

---

## M0 · Testnet foundation 🟢
- Six-contract suite compiled, tested, deployed on Sepolia.
- Permissionless executor with **real ERC-20 custody** (deposit pulls tokens,
  withdraw pays out) — verified end-to-end on-chain.
- Per-token share ledgers (C1) and blind events (C2).
- Frontend: real wallet connect, live contract reads/writes, no mock data.

## M1 · Honest privacy end-to-end 🔴
*Goal: nothing user-sensitive in plaintext, anywhere.*
- [ ] CoWMatcher: remove plaintext order amounts from storage/events; keep only commitments pre-reveal.
- [ ] Reveal phase with per-order escrow + automatic refunds for unfilled orders.
- [ ] Frontend STRK20 wallet path (`strk20InvokeTransaction`) behind feature flag once a privacy-enabled wallet build is testable.
- **Accept:** chain diff of a full swap leaks no size/side/limit of any single order.

## M2 · Trustless settlement 🔴
*Goal: no trusted human in the clearing loop.*
- [ ] Pragma Sepolia feeds wired into CoWMatcher; clearing price bounded to median ± tolerance.
- [ ] Solver permissionlessness audited: any account can settle, wrong prices revert.
- [ ] Limit-price enforcement in fill math (B2).
- **Accept:** settlement reverts when submitted price deviates > tolerance.

## M3 · Real yield & real CLMM 🔴
*Goal: the vault's numbers come from external protocols, not internal accounting.*
- [ ] Ekubo (Sepolia) position minting held by the vault; harvest claims real fees.
- [ ] Remove/repair `harvest_and_compound` credit-from-nothing path (critical).
- [ ] Pragma staleness bounds in YieldRouter.
- **Accept:** vault TVL changes track Ekubo position values 1:1 within a block.

## M4 · Delegated automation 🔴
- [ ] SessionKeyManager: Starknet signature verification (C7), selector allowlists, replay-safe spends.
- [ ] Keeper bot runs harvest/settle via session keys under daily limits.
- **Accept:** a keeper can operate within policy; exceeding limit or expired key reverts.

## M5 · ZK compliance 🔴
*Goal: attestations are proofs, not records.*
- [ ] Solvency circuit with aligned units (assets vs shares × price) — replace 12-line inequality (C8).
- [ ] STWO → Garaga verifier class embedded immutably in AttestEngine.
- [ ] Clean-provenance circuit consuming FPI screening signatures.
- **Accept:** third party verifies solvency fact without vault read access.

## M6 · Mainnet 🎯
- [ ] All above merged; external audit of vault + matcher.
- [ ] Deploy against mainnet STRK20 pool / Ekubo / Pragma addresses.
- [ ] Fill `strk20.json` manifest with **real** mainnet tx hashes (organizers verify on-chain).
- [ ] Demo video + docs refresh to final addresses.

---

## Risk register (condensed)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Harvest mints unbacked shares today | Critical | M3 first item; disabled in UI until fixed |
| Caller-supplied clearing price | High | M2 oracle bounding |
| No escrow on committed orders | High | M1 escrow redesign |
| Session keys lack signature checks | Medium | M4 gating before any keeper funds flow |
| Note loss = position loss | By design | viewing-key recovery docs; local backup guidance |
