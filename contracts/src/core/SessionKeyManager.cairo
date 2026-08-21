#[starknet::contract]
pub mod SessionKeyManager {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::ISessionManager::{ISessionManager, SessionKeyConfig};

    #[storage]
    struct Storage {
        admin: ContractAddress,
        cow_matcher: ContractAddress,
        sessions: Map<felt252, SessionKeyConfig>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        SessionKeyRegistered: SessionKeyRegistered,
        SessionKeyRevoked: SessionKeyRevoked,
        SessionSpendRecorded: SessionSpendRecorded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SessionKeyRegistered {
        #[key]
        pub session_public_key: felt252,
        #[key]
        pub owner: ContractAddress,
        pub expires_at: u64,
        pub max_daily_volume: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SessionKeyRevoked {
        #[key]
        pub session_public_key: felt252,
        #[key]
        pub owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SessionSpendRecorded {
        #[key]
        pub session_public_key: felt252,
        pub volume: u256,
        pub total_spent: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, cow_matcher: ContractAddress) {
        self.admin.write(admin);
        self.cow_matcher.write(cow_matcher);
    }

    #[abi(embed_v0)]
    impl SessionManagerImpl of ISessionManager<ContractState> {
        fn register_session_key(
            ref self: ContractState,
            session_public_key: felt252,
            duration_seconds: u64,
            max_daily_volume: u256
        ) {
            let caller = get_caller_address();
            assert(session_public_key != 0, 'Invalid public key');
            assert(duration_seconds > 0, 'Invalid duration');

            let expires_at = get_block_timestamp() + duration_seconds;
            self.sessions.write(session_public_key, SessionKeyConfig {
                owner_address: caller,
                session_public_key,
                expires_at,
                max_daily_volume,
                current_spent_volume: 0,
                is_revoked: false,
            });

            self.emit(SessionKeyRegistered {
                session_public_key,
                owner: caller,
                expires_at,
                max_daily_volume
            });
        }

        fn revoke_session_key(ref self: ContractState, session_public_key: felt252) {
            let caller = get_caller_address();
            let mut session = self.sessions.read(session_public_key);
            assert(session.owner_address == caller || caller == self.admin.read(), 'Not authorized');

            session.is_revoked = true;
            self.sessions.write(session_public_key, session);

            self.emit(SessionKeyRevoked {
                session_public_key,
                owner: session.owner_address
            });
        }

        fn validate_and_record_spend(
            ref self: ContractState,
            session_public_key: felt252,
            trade_volume: u256
        ) -> bool {
            let mut session = self.sessions.read(session_public_key);
            if session.is_revoked {
                return false;
            }
            if get_block_timestamp() > session.expires_at {
                return false;
            }
            if session.current_spent_volume + trade_volume > session.max_daily_volume {
                return false;
            }

            session.current_spent_volume += trade_volume;
            self.sessions.write(session_public_key, session);

            self.emit(SessionSpendRecorded {
                session_public_key,
                volume: trade_volume,
                total_spent: session.current_spent_volume
            });

            true
        }

        fn get_session_config(self: @ContractState, session_public_key: felt252) -> SessionKeyConfig {
            self.sessions.read(session_public_key)
        }
    }
}
