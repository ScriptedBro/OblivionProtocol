use core::poseidon::poseidon_hash_span;

pub fn compute_solvency_merkle_root(mut leaves: Span<felt252>) -> felt252 {
    if leaves.len() == 0 {
        return 0;
    }
    poseidon_hash_span(leaves)
}

pub fn verify_solvency_mathematics(vault_assets: u256, total_shares: u256) -> bool {
    vault_assets >= total_shares
}
