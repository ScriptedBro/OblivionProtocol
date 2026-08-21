#[starknet::contract]
pub mod AttestEngine {
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::IAttest::{IAttestEngine, AttestationRecord};
    use core::poseidon::poseidon_hash_span;

    #[storage]
    struct Storage {
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        attestation_counter: u64,
        attestations: Map<felt252, AttestationRecord>,
        verified_solvency_roots: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        AttestationIssued: AttestationIssued,
        SolvencyProofVerified: SolvencyProofVerified,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AttestationIssued {
        #[key]
        pub attestation_id: felt252,
        pub fact_type: felt252,
        pub subject_hash: felt252,
        pub expires_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SolvencyProofVerified {
        #[key]
        pub root_hash: felt252,
        pub vault_assets: u256,
        pub total_shares: u256,
        pub is_solvent: bool,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk20_pool: ContractAddress
    ) {
        self.admin.write(admin);
        self.strk20_pool.write(strk20_pool);
        self.attestation_counter.write(0);
    }

    #[abi(embed_v0)]
    impl AttestEngineImpl of IAttestEngine<ContractState> {
        fn verify_and_issue_attestation(
            ref self: ContractState,
            attestation_id: felt252,
            subject_hash: felt252,
            fact_type: felt252,
            proof_data: Span<felt252>,
            validity_duration: u64
        ) -> bool {
            assert(proof_data.len() > 0, 'Empty proof');
            
            let computed_hash = poseidon_hash_span(proof_data);
            assert(computed_hash != 0, 'Invalid proof root');

            let expires_at = get_block_timestamp() + validity_duration;
            self.attestations.write(attestation_id, AttestationRecord {
                subject_hash,
                fact_type,
                is_valid: true,
                issued_at: get_block_timestamp(),
                expires_at,
            });

            self.emit(AttestationIssued {
                attestation_id,
                fact_type,
                subject_hash,
                expires_at,
            });

            true
        }

        fn verify_solvency_proof(
            self: @ContractState,
            vault_assets: u256,
            total_shares: u256,
            proof: Span<felt252>
        ) -> bool {
            if vault_assets < total_shares {
                return false;
            }

            if proof.len() == 0 {
                return false;
            }

            let root = poseidon_hash_span(proof);
            root != 0
        }

        fn is_attestation_valid(self: @ContractState, attestation_id: felt252) -> bool {
            let record = self.attestations.read(attestation_id);
            record.is_valid && (get_block_timestamp() <= record.expires_at)
        }

        fn get_attestation(self: @ContractState, attestation_id: felt252) -> AttestationRecord {
            self.attestations.read(attestation_id)
        }
    }
}
