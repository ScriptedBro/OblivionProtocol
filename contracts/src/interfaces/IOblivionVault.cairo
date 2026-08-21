use starknet::ContractAddress;

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct LPPosition {
    pub lower_tick: i128,
    pub upper_tick: i128,
    pub shares: u256,
    pub fee_debt: u256,
    pub deposited_at: u64,
}

#[derive(Drop, Copy, Serde)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[starknet::interface]
pub trait IOblivionVault<TContractState> {
    fn privacy_invoke_deposit(
        ref self: TContractState,
        note_commitment: felt252,
        token: ContractAddress,
        amount: u256,
        lower_tick: i128,
        upper_tick: i128
    );
    fn privacy_invoke_withdraw(
        ref self: TContractState,
        note_commitment: felt252,
        shares_to_burn: u256,
        token: ContractAddress
    ) -> u256;
    fn privacy_invoke(
        ref self: TContractState,
        note_id: felt252,
        token: ContractAddress,
        amount: u128,
        lower_tick: i128,
        upper_tick: i128
    ) -> Span<OpenNoteDeposit>;
    fn harvest_and_compound(ref self: TContractState, token: ContractAddress) -> u256;
    fn get_position(self: @TContractState, note_commitment: felt252) -> LPPosition;
    fn get_total_shares(self: @TContractState) -> u256;
    fn get_total_assets(self: @TContractState, token: ContractAddress) -> u256;
    fn get_accumulated_fees_per_share(self: @TContractState) -> u256;
}
