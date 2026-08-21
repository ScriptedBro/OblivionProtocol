use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::IAttest::{IAttestEngineDispatcher, IAttestEngineDispatcherTrait};

fn setup_attest_engine() -> IAttestEngineDispatcher {
    let admin_address: ContractAddress = 0x99999.try_into().unwrap();
    let pool_address: ContractAddress = 0x12345.try_into().unwrap();

    let contract = declare("AttestEngine").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into()
    ];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    IAttestEngineDispatcher { contract_address }
}

#[test]
fn test_verify_and_issue_attestation() {
    let attest = setup_attest_engine();
    let attestation_id: felt252 = 0x111;
    let subject_hash: felt252 = 0x222;
    let fact_type: felt252 = 1; // Solvency
    let proof: Array<felt252> = array![0x100, 0x200, 0x300];

    let success = attest.verify_and_issue_attestation(
        attestation_id,
        subject_hash,
        fact_type,
        proof.span(),
        3600 // 1 hour validity
    );

    assert(success, 'Attestation issue failed');
    assert(attest.is_attestation_valid(attestation_id), 'Attestation should be valid');

    let record = attest.get_attestation(attestation_id);
    assert(record.is_valid, 'Record should be valid');
    assert(record.fact_type == 1, 'Fact type mismatch');
}

#[test]
fn test_solvency_proof_math() {
    let attest = setup_attest_engine();
    let proof: Array<felt252> = array![0xabc, 0xdef];

    // Solvent case: Assets (2,000,000) >= Liabilities (1,000,000)
    let is_solvent = attest.verify_solvency_proof(
        2_000_000_u256,
        1_000_000_u256,
        proof.span()
    );
    assert(is_solvent, 'Should be solvent');

    // Insolvent case: Assets (500,000) < Liabilities (1,000,000)
    let is_insolvent = attest.verify_solvency_proof(
        500_000_u256,
        1_000_000_u256,
        proof.span()
    );
    assert(!is_insolvent, 'Should be insolvent');
}
