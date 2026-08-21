use starknet::ContractAddress;

#[starknet::interface]
pub trait INostraMoneyMarket<TContractState> {
    fn deposit(ref self: TContractState, token: ContractAddress, amount: u256) -> u256;
    fn withdraw(ref self: TContractState, token: ContractAddress, amount: u256) -> u256;
    fn get_asset_balance(self: @TContractState, token: ContractAddress, account: ContractAddress) -> u256;
    fn get_lending_apy(self: @TContractState, token: ContractAddress) -> u256;
}
