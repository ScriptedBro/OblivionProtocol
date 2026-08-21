use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::IOblivionVault::{IOblivionVaultDispatcher, IOblivionVaultDispatcherTrait};
use oblivion_protocol::interfaces::ICoWMatcher::{ICoWMatcherDispatcher, ICoWMatcherDispatcherTrait};
use oblivion_protocol::interfaces::IAttest::{IAttestEngineDispatcher, IAttestEngineDispatcherTrait};

#[test]
fn test_full_protocol_lifecycle() {
    let admin_address: ContractAddress = 0x11111.try_into().unwrap();
    let pool_address: ContractAddress = 0x22222.try_into().unwrap();
    let ekubo_address: ContractAddress = 0x33333.try_into().unwrap();
    let oracle_address: ContractAddress = 0x44444.try_into().unwrap();
    let token_address: ContractAddress = 0x55555.try_into().unwrap();
    let token_usdc: ContractAddress = 0x66666.try_into().unwrap();

    // 1. Deploy Attest Engine
    let attest_contract = declare("AttestEngine").unwrap().contract_class();
    let attest_calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into()
    ];
    let (attest_addr, _) = attest_contract.deploy(@attest_calldata).unwrap();
    let attest = IAttestEngineDispatcher { contract_address: attest_addr };

    // 2. Deploy Oblivion Vault
    let vault_contract = declare("OblivionVault").unwrap().contract_class();
    let vault_calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into(),
        ekubo_address.into(),
        attest_addr.into()
    ];
    let (vault_addr, _) = vault_contract.deploy(@vault_calldata).unwrap();
    let vault = IOblivionVaultDispatcher { contract_address: vault_addr };

    // 3. Deploy CoW Matcher
    let cow_contract = declare("CoWMatcher").unwrap().contract_class();
    let cow_calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into(),
        oracle_address.into()
    ];
    let (cow_addr, _) = cow_contract.deploy(@cow_calldata).unwrap();
    let cow = ICoWMatcherDispatcher { contract_address: cow_addr };

    // --- STEP 1: Shielded LP Deposit via privacy_invoke ---
    snforge_std::start_cheat_caller_address(vault.contract_address, pool_address);
    snforge_std::start_cheat_block_timestamp(vault.contract_address, 1000);

    let note_commitment: felt252 = 0xabcdef123456789;
    let deposit_amount: u256 = 100_000_u256;

    vault.privacy_invoke_deposit(
        note_commitment,
        token_address,
        deposit_amount,
        -1000_i128,
        1000_i128
    );

    assert(vault.get_total_assets(token_address) == deposit_amount, 'Assets mismatch');

    // --- STEP 2: Dark CoW Batch Auction Matching ---
    let batch_id = cow.open_batch(token_address, token_usdc, 60);
    let order_a: felt252 = 0x1111;
    let order_b: felt252 = 0x2222;

    cow.commit_order(batch_id, order_a, true, 5_000_u256, 0);
    cow.commit_order(batch_id, order_b, false, 2_400_u256, 0);

    let clearing_price: u256 = 480_000_000_000_000_000_u256; // 0.48 * 1e18
    cow.settle_batch(batch_id, clearing_price);

    let batch_record = cow.get_batch(batch_id);
    assert(batch_record.is_settled, 'Batch should be settled');
    assert(batch_record.clearing_price == clearing_price, 'Price mismatch');

    // --- STEP 3: ZK Solvency Verification ---
    let total_assets = vault.get_total_assets(token_address);
    let total_shares = deposit_amount;
    let proof = array![0x123, 0x456].span();

    let is_solvent = attest.verify_solvency_proof(
        total_assets,
        total_shares,
        proof
    );
    assert(is_solvent, 'Solvency verification failed');

    // --- STEP 4: Issue On-Chain Compliance Attestation ---
    let attestation_id: felt252 = 0x9999;
    let subject_hash: felt252 = 0x5555;
    let issued = attest.verify_and_issue_attestation(
        attestation_id,
        subject_hash,
        1, // FactType = Solvency
        proof,
        86400 // 1 day
    );
    assert(issued, 'Attestation issue failed');
    assert(attest.is_attestation_valid(attestation_id), 'Attestation should be valid');

    // --- STEP 5: Shielded Withdrawal & Payout ---
    let payout = vault.privacy_invoke_withdraw(
        note_commitment,
        deposit_amount,
        token_address
    );
    assert(payout == deposit_amount, 'Payout mismatch');

    snforge_std::stop_cheat_caller_address(vault.contract_address);
    snforge_std::stop_cheat_block_timestamp(vault.contract_address);
}
