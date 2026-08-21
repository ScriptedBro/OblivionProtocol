use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::IOblivionVault::{IOblivionVaultDispatcher, IOblivionVaultDispatcherTrait};

fn setup_vault() -> (IOblivionVaultDispatcher, ContractAddress) {
    let pool_address: ContractAddress = 0x12345.try_into().unwrap();
    let admin_address: ContractAddress = 0x99999.try_into().unwrap();
    let ekubo_address: ContractAddress = 0x55555.try_into().unwrap();
    let attest_address: ContractAddress = 0x77777.try_into().unwrap();

    let contract = declare("OblivionVault").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into(),
        ekubo_address.into(),
        attest_address.into()
    ];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    (IOblivionVaultDispatcher { contract_address }, pool_address)
}

#[test]
fn test_vault_initialization() {
    let (vault, _) = setup_vault();
    assert(vault.get_total_shares() == 0, 'Initial shares should be 0');
    assert(vault.get_accumulated_fees_per_share() == 0, 'Initial fees should be 0');
}

#[test]
fn test_vault_deposit_and_shares() {
    let (vault, pool_address) = setup_vault();
    let token_address: ContractAddress = 0x11111.try_into().unwrap();
    let note_commitment: felt252 = 0xabcde;

    // Prank caller as STRK20 pool
    snforge_std::start_cheat_caller_address(vault.contract_address, pool_address);

    vault.privacy_invoke_deposit(
        note_commitment,
        token_address,
        1_000_000_u256,
        -1000_i128,
        1000_i128
    );

    snforge_std::stop_cheat_caller_address(vault.contract_address);

    assert(vault.get_total_shares() == 1_000_000_u256, 'Shares mismatch');
    assert(vault.get_total_assets(token_address) == 1_000_000_u256, 'Assets mismatch');

    let position = vault.get_position(note_commitment);
    assert(position.shares == 1_000_000_u256, 'Position shares mismatch');
    assert(position.lower_tick == -1000_i128, 'Lower tick mismatch');
    assert(position.upper_tick == 1000_i128, 'Upper tick mismatch');
}

#[test]
fn test_vault_fee_compounding_and_withdraw() {
    let (vault, pool_address) = setup_vault();
    let token_address: ContractAddress = 0x11111.try_into().unwrap();
    let note_commitment: felt252 = 0xabcde;

    snforge_std::start_cheat_caller_address(vault.contract_address, pool_address);

    vault.privacy_invoke_deposit(
        note_commitment,
        token_address,
        1_000_000_u256,
        -1000_i128,
        1000_i128
    );

    // Harvest & compound fees
    let harvested = vault.harvest_and_compound(token_address);
    assert(harvested > 0, 'Harvested should be > 0');
    assert(vault.get_accumulated_fees_per_share() > 0, 'Fee rate should increase');

    // Withdraw all shares
    let payout = vault.privacy_invoke_withdraw(
        note_commitment,
        1_000_000_u256,
        token_address
    );

    snforge_std::stop_cheat_caller_address(vault.contract_address);

    assert(payout >= 1_000_000_u256, 'Payout should include yield');
    assert(vault.get_total_shares() == 0, 'Shares should be 0 after burn');
}
