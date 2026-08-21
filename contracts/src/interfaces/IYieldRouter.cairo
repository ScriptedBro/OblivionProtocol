use starknet::ContractAddress;

#[starknet::interface]
pub trait IYieldRouter<TContractState> {
    fn route_idle_capital(ref self: TContractState, token: ContractAddress, amount: u256) -> u256;
    fn recall_capital(ref self: TContractState, token: ContractAddress, amount: u256) -> u256;
    fn harvest_lending_yield(ref self: TContractState, token: ContractAddress) -> u256;
    fn get_routed_balance(self: @TContractState, token: ContractAddress) -> u256;
    fn get_total_harvested_yield(self: @TContractState, token: ContractAddress) -> u256;
}
