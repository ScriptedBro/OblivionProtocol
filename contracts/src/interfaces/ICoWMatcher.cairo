use starknet::ContractAddress;

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct BatchState {
    pub token_a: ContractAddress,
    pub token_b: ContractAddress,
    pub total_volume_a: u256,
    pub total_volume_b: u256,
    pub clearing_price: u256,
    pub deadline: u64,
    pub is_settled: bool,
}

#[starknet::interface]
pub trait ICoWMatcher<TContractState> {
    fn open_batch(ref self: TContractState, token_a: ContractAddress, token_b: ContractAddress, duration_seconds: u64) -> u64;
    fn commit_order(
        ref self: TContractState,
        batch_id: u64,
        order_commitment: felt252,
        is_token_a: bool,
        amount: u256,
        min_limit_price: u256
    );
    fn settle_batch(ref self: TContractState, batch_id: u64, oracle_price: u256);
    fn get_batch(self: @TContractState, batch_id: u64) -> BatchState;
    fn get_current_batch_id(self: @TContractState) -> u64;
}
