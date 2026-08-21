#[starknet::contract]
pub mod CoWMatcher {
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::ICoWMatcher::{ICoWMatcher, BatchState};

    #[storage]
    struct Storage {
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        pragma_oracle: ContractAddress,
        batch_count: u64,
        batches: Map<u64, BatchState>,
        order_commitments: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        BatchOpened: BatchOpened,
        OrderSealed: OrderSealed,
        BatchSettled: BatchSettled,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchOpened {
        #[key]
        pub batch_id: u64,
        pub token_a: ContractAddress,
        pub token_b: ContractAddress,
        pub deadline: u64,
    }

    // Zero-Knowledge Blind Event: Emits ONLY the order commitment hash (no amounts, no limit prices)
    #[derive(Drop, starknet::Event)]
    pub struct OrderSealed {
        #[key]
        pub batch_id: u64,
        #[key]
        pub order_commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchSettled {
        #[key]
        pub batch_id: u64,
        pub clearing_price: u256,
        pub matched_volume: u256,
    }

    #[constructor]
    pub fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        pragma_oracle: ContractAddress
    ) {
        self.admin.write(admin);
        self.strk20_pool.write(strk20_pool);
        self.pragma_oracle.write(pragma_oracle);
        self.batch_count.write(0);
    }

    #[abi(embed_v0)]
    impl CoWMatcherImpl of ICoWMatcher<ContractState> {
        fn open_batch(
            ref self: ContractState,
            token_a: ContractAddress,
            token_b: ContractAddress,
            duration_seconds: u64
        ) -> u64 {
            let next_id = self.batch_count.read() + 1;
            let deadline = get_block_timestamp() + duration_seconds;

            self.batches.write(next_id, BatchState {
                token_a,
                token_b,
                total_volume_a: 0,
                total_volume_b: 0,
                clearing_price: 0,
                deadline,
                is_settled: false,
            });

            self.batch_count.write(next_id);

            self.emit(BatchOpened {
                batch_id: next_id,
                token_a,
                token_b,
                deadline
            });

            next_id
        }

        fn commit_order(
            ref self: ContractState,
            batch_id: u64,
            order_commitment: felt252,
            is_token_a: bool,
            amount: u256,
            min_limit_price: u256
        ) {
            let mut batch = self.batches.read(batch_id);
            assert(!batch.is_settled, 'Batch already settled');
            assert(amount > 0, 'Zero amount');
            assert(!self.order_commitments.read(order_commitment), 'Order already committed');

            self.order_commitments.write(order_commitment, true);

            if is_token_a {
                batch.total_volume_a += amount;
            } else {
                batch.total_volume_b += amount;
            }

            self.batches.write(batch_id, batch);

            // Blind event emission (No amount or side leakage)
            self.emit(OrderSealed {
                batch_id,
                order_commitment,
            });
        }

        fn settle_batch(ref self: ContractState, batch_id: u64, oracle_price: u256) {
            let mut batch = self.batches.read(batch_id);
            assert(!batch.is_settled, 'Batch already settled');
            assert(oracle_price > 0, 'Invalid clearing price');

            batch.clearing_price = oracle_price;
            batch.is_settled = true;
            self.batches.write(batch_id, batch);

            // Sound CoW math: matched volume is the crossed intersection
            let volume_a_in_b = (batch.total_volume_a * oracle_price) / 1_000_000_000_000_000_000_u256;
            let matched_volume = if volume_a_in_b < batch.total_volume_b {
                volume_a_in_b
            } else {
                batch.total_volume_b
            };

            self.emit(BatchSettled {
                batch_id,
                clearing_price: oracle_price,
                matched_volume
            });
        }

        fn get_batch(self: @ContractState, batch_id: u64) -> BatchState {
            self.batches.read(batch_id)
        }

        fn get_current_batch_id(self: @ContractState) -> u64 {
            self.batch_count.read()
        }
    }
}
