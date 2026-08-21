use starknet::ContractAddress;

#[starknet::interface]
pub trait ISTRK20Pool<TContractState> {
    fn shield(ref self: TContractState, token: ContractAddress, amount: u256, recipient_note_commitment: felt252);
    fn unshield(ref self: TContractState, nullifier: felt252, token: ContractAddress, amount: u256, recipient: ContractAddress);
    fn privacy_invoke(
        ref self: TContractState,
        target_anonymizer: ContractAddress,
        call_data: Span<felt252>,
        note_commitment: felt252
    ) -> Span<felt252>;
    fn verify_fpi_deposit(self: @TContractState, depositor: ContractAddress, fpi_signature: Span<felt252>) -> bool;
    fn get_pool_balance(self: @TContractState, token: ContractAddress) -> u256;
}
