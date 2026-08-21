#[starknet::contract]
pub mod CoWMatcher {
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::ICoWMatcher::{ICoWMatcher, BatchState};

    const PRICE_PRECISION: u256 = 1_000_000_000_000_000_000_u256; // 1e18

    #[storage]
    struct Storage {
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        pragma_oracle: ContractAddress,
        batch_counter: u64,
        batches: Map<u64, BatchState>,
        order_commitments: Map<(u64, felt252), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        BatchCreated: BatchCreated,
        OrderCommitted: OrderCommitted,
        BatchCleared: BatchCleared,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchCreated {
        #[key]
        pub batch_id: u64,
        pub token_a: ContractAddress,
        pub token_b: ContractAddress,
        pub deadline: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct OrderCommitted {
        #[key]
        pub batch_id: u64,
        #[key]
        pub order_commitment: felt252,
        pub is_token_a: bool,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchCleared {
        #[key]
        pub batch_id: u64,
        pub volume_a_cleared: u256,
        pub volume_b_cleared: u256,
        pub clearing_price: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        pragma_oracle: ContractAddress
    ) {
        self.admin.write(admin);
        self.strk20_pool.write(strk20_pool);
        self.pragma_oracle.write(pragma_oracle);
        self.batch_counter.write(0);
    }

    #[abi(embed_v0)]
    impl CoWMatcherImpl of ICoWMatcher<ContractState> {
        fn open_batch(
            ref self: ContractState,
            token_a: ContractAddress,
            token_b: ContractAddress,
            duration_seconds: u64
        ) -> u64 {
            let next_id = self.batch_counter.read() + 1;
            self.batch_counter.write(next_id);

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

            self.emit(BatchCreated {
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
            assert(get_block_timestamp() <= batch.deadline, 'Batch expired');
            assert(amount > 0, 'Amount must be > 0');

            assert(!self.order_commitments.read((batch_id, order_commitment)), 'Duplicate commitment');
            self.order_commitments.write((batch_id, order_commitment), true);

            if is_token_a {
                batch.total_volume_a += amount;
            } else {
                batch.total_volume_b += amount;
            }

            self.batches.write(batch_id, batch);

            self.emit(OrderCommitted {
                batch_id,
                order_commitment,
                is_token_a,
                amount
            });
        }

        fn settle_batch(ref self: ContractState, batch_id: u64, oracle_price: u256) {
            let mut batch = self.batches.read(batch_id);
            assert(!batch.is_settled, 'Batch already settled');
            assert(oracle_price > 0, 'Price must be > 0');

            let matched_a = batch.total_volume_a;
            let matched_b = if matched_a > 0 {
                (matched_a * oracle_price) / PRICE_PRECISION
            } else {
                batch.total_volume_b
            };

            batch.clearing_price = oracle_price;
            batch.is_settled = true;
            self.batches.write(batch_id, batch);

            self.emit(BatchCleared {
                batch_id,
                volume_a_cleared: matched_a,
                volume_b_cleared: matched_b,
                clearing_price: oracle_price
            });
        }

        fn get_batch(self: @ContractState, batch_id: u64) -> BatchState {
            self.batches.read(batch_id)
        }

        fn get_current_batch_id(self: @ContractState) -> u64 {
            self.batch_counter.read()
        }
    }
}
