#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PragmaPrice {
    pub price: u128,
    pub decimals: u32,
    pub last_updated_timestamp: u64,
    pub num_sources_aggregated: u32,
}

#[starknet::interface]
pub trait IPragmaOracle<TContractState> {
    fn get_data_median(self: @TContractState, data_type: felt252) -> PragmaPrice;
    fn get_spot_price(self: @TContractState, pair_id: felt252) -> u256;
}
