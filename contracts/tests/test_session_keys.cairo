use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::ISessionManager::{ISessionManagerDispatcher, ISessionManagerDispatcherTrait};

fn setup_session_manager() -> (ISessionManagerDispatcher, ContractAddress) {
    let admin_address: ContractAddress = 0x11111.try_into().unwrap();
    let cow_address: ContractAddress = 0x22222.try_into().unwrap();

    let contract = declare("SessionKeyManager").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        admin_address.into(),
        cow_address.into()
    ];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    (ISessionManagerDispatcher { contract_address }, admin_address)
}

#[test]
fn test_session_key_lifecycle() {
    let (session_mgr, _) = setup_session_manager();
    let user_address: ContractAddress = 0x55555.try_into().unwrap();
    let session_pk: felt252 = 0x987654321;
    let duration: u64 = 3600; // 1 hour
    let max_volume: u256 = 50_000_u256;

    snforge_std::start_cheat_caller_address(session_mgr.contract_address, user_address);
    snforge_std::start_cheat_block_timestamp(session_mgr.contract_address, 1000);

    // 1. Register session key
    session_mgr.register_session_key(session_pk, duration, max_volume);

    let config = session_mgr.get_session_config(session_pk);
    assert(config.owner_address == user_address, 'Owner mismatch');
    assert(config.expires_at == 4600, 'Expiry mismatch');
    assert(!config.is_revoked, 'Should not be revoked');

    // 2. Validate valid spend
    let valid_spend = session_mgr.validate_and_record_spend(session_pk, 10_000_u256);
    assert(valid_spend, 'Spend should be valid');

    let updated_config = session_mgr.get_session_config(session_pk);
    assert(updated_config.current_spent_volume == 10_000_u256, 'Spent volume mismatch');

    // 3. Exceed limit
    let exceed_spend = session_mgr.validate_and_record_spend(session_pk, 45_000_u256);
    assert(!exceed_spend, 'Spend should be rejected');

    // 4. Revoke session key
    session_mgr.revoke_session_key(session_pk);
    let revoked_spend = session_mgr.validate_and_record_spend(session_pk, 1_000_u256);
    assert(!revoked_spend, 'Revoked spend rejected');

    snforge_std::stop_cheat_caller_address(session_mgr.contract_address);
    snforge_std::stop_cheat_block_timestamp(session_mgr.contract_address);
}
