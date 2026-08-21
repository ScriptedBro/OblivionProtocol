use starknet::ContractAddress;

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct SessionKeyConfig {
    pub owner_address: ContractAddress,
    pub session_public_key: felt252,
    pub expires_at: u64,
    pub max_daily_volume: u256,
    pub current_spent_volume: u256,
    pub is_revoked: bool,
}

#[starknet::interface]
pub trait ISessionManager<TContractState> {
    fn register_session_key(
        ref self: TContractState,
        session_public_key: felt252,
        duration_seconds: u64,
        max_daily_volume: u256
    );
    fn revoke_session_key(ref self: TContractState, session_public_key: felt252);
    fn validate_and_record_spend(
        ref self: TContractState,
        session_public_key: felt252,
        trade_volume: u256
    ) -> bool;
    fn get_session_config(self: @TContractState, session_public_key: felt252) -> SessionKeyConfig;
}
