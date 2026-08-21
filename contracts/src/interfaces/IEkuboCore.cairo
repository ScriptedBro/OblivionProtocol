use starknet::ContractAddress;

#[starknet::interface]
pub trait IEkuboCore<TContractState> {
    fn deposit_liquidity(
        ref self: TContractState,
        token_a: ContractAddress,
        token_b: ContractAddress,
        amount_a: u256,
        amount_b: u256,
        lower_tick: i128,
        upper_tick: i128
    ) -> u64; // returns position_id
    fn withdraw_liquidity(
        ref self: TContractState,
        position_id: u64,
        amount_a: u256,
        amount_b: u256
    );
    fn claim_fees(ref self: TContractState, position_id: u64, token: ContractAddress) -> u256;
    fn swap(
        ref self: TContractState,
        token_in: ContractAddress,
        token_out: ContractAddress,
        amount_in: u256,
        min_amount_out: u256
    ) -> u256;
}
