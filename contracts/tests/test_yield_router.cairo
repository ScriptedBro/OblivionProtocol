use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::IYieldRouter::{IYieldRouterDispatcher, IYieldRouterDispatcherTrait};

fn setup_yield_router() -> (IYieldRouterDispatcher, ContractAddress) {
    let admin_address: ContractAddress = 0x11111.try_into().unwrap();
    let vault_address: ContractAddress = 0x22222.try_into().unwrap();
    let nostra_address: ContractAddress = 0x33333.try_into().unwrap();

    let contract = declare("YieldRouter").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        admin_address.into(),
        vault_address.into(),
        nostra_address.into()
    ];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    (IYieldRouterDispatcher { contract_address }, vault_address)
}

#[test]
fn test_yield_router_lifecycle() {
    let (router, vault_address) = setup_yield_router();
    let token_address: ContractAddress = 0x99999.try_into().unwrap();
    let deposit_amt: u256 = 100_000_u256;

    snforge_std::start_cheat_caller_address(router.contract_address, vault_address);

    // 1. Route idle capital
    let routed = router.route_idle_capital(token_address, deposit_amt);
    assert(routed == deposit_amt, 'Routed amt mismatch');
    assert(router.get_routed_balance(token_address) == deposit_amt, 'Balance mismatch');

    // 2. Harvest lending yield (5% of 100_000 = 50)
    let harvested = router.harvest_lending_yield(token_address);
    assert(harvested == 50_u256, 'Harvested yield mismatch');
    assert(router.get_total_harvested_yield(token_address) == 50_u256, 'Yield total mismatch');

    // 3. Recall capital
    let recalled = router.recall_capital(token_address, 50_000_u256);
    assert(recalled == 50_000_u256, 'Recall amt mismatch');
    assert(router.get_routed_balance(token_address) == 50_050_u256, 'Remaining balance mismatch');

    snforge_std::stop_cheat_caller_address(router.contract_address);
}
