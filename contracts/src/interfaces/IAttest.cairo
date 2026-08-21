#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct AttestationRecord {
    pub subject_hash: felt252,
    pub fact_type: felt252, // 1 = Solvency, 2 = Clean Provenance, 3 = PnL Audit
    pub is_valid: bool,
    pub issued_at: u64,
    pub expires_at: u64,
}

#[starknet::interface]
pub trait IAttestEngine<TContractState> {
    fn verify_and_issue_attestation(
        ref self: TContractState,
        attestation_id: felt252,
        subject_hash: felt252,
        fact_type: felt252,
        proof_data: Span<felt252>,
        validity_duration: u64
    ) -> bool;
    fn is_attestation_valid(self: @TContractState, attestation_id: felt252) -> bool;
    fn get_attestation(self: @TContractState, attestation_id: felt252) -> AttestationRecord;
    fn verify_solvency_proof(self: @TContractState, vault_assets: u256, total_shares: u256, proof: Span<felt252>) -> bool;
}
