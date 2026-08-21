use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::ICoWMatcher::{ICoWMatcherDispatcher, ICoWMatcherDispatcherTrait};

fn setup_cow_matcher() -> ICoWMatcherDispatcher {
    let admin_address: ContractAddress = 0x99999.try_into().unwrap();
    let pool_address: ContractAddress = 0x12345.try_into().unwrap();
    let oracle_address: ContractAddress = 0x88888.try_into().unwrap();

    let contract = declare("CoWMatcher").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        admin_address.into(),
        pool_address.into(),
        oracle_address.into()
    ];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    ICoWMatcherDispatcher { contract_address }
}

#[test]
fn test_open_and_commit_batch() {
    let matcher = setup_cow_matcher();
    let token_a: ContractAddress = 0x11111.try_into().unwrap();
    let token_b: ContractAddress = 0x22222.try_into().unwrap();

    let batch_id = matcher.open_batch(token_a, token_b, 300);
    assert(batch_id == 1, 'Batch ID should be 1');

    let order_1: felt252 = 0xaaaaa;
    let order_2: felt252 = 0xbbbbb;

    matcher.commit_order(batch_id, order_1, true, 500_000_u256, 1_000_000_000_000_000_000_u256);
    matcher.commit_order(batch_id, order_2, false, 500_000_u256, 1_000_000_000_000_000_000_u256);

    let batch = matcher.get_batch(batch_id);
    assert(batch.total_volume_a == 500_000_u256, 'Volume A mismatch');
    assert(batch.total_volume_b == 500_000_u256, 'Volume B mismatch');
    assert(!batch.is_settled, 'Should not be settled yet');
}

#[test]
fn test_settle_batch_uniform_price() {
    let matcher = setup_cow_matcher();
    let token_a: ContractAddress = 0x11111.try_into().unwrap();
    let token_b: ContractAddress = 0x22222.try_into().unwrap();

    let batch_id = matcher.open_batch(token_a, token_b, 0); // 0 second duration for immediate settlement test
    let order_1: felt252 = 0xaaaaa;
    matcher.commit_order(batch_id, order_1, true, 1_000_000_u256, 1_000_000_000_000_000_000_u256);

    let clearing_price: u256 = 1_500_000_000_000_000_000_u256; // 1.5 ratio
    matcher.settle_batch(batch_id, clearing_price);

    let batch = matcher.get_batch(batch_id);
    assert(batch.is_settled, 'Batch should be settled');
    assert(batch.clearing_price == clearing_price, 'Clearing price mismatch');
}
