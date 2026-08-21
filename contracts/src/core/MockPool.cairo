    #[starknet::contract]
pub mod MockPool {
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::IOblivionVault::{
        IOblivionVaultDispatcher, IOblivionVaultDispatcherTrait,
    };

    #[starknet::interface]
    pub trait IERC20Minimal<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        );
    }

    #[starknet::interface]
    pub trait IPoolActions<TContractState> {
        fn pool_deposit(
            ref self: TContractState,
            note_commitment: felt252,
            token: ContractAddress,
            amount: u256,
            lower_tick: i128,
            upper_tick: i128,
        );
        fn pool_withdraw(
            ref self: TContractState,
            note_commitment: felt252,
            shares_to_burn: u256,
            token: ContractAddress,
        ) -> u256;
        fn pool_harvest(ref self: TContractState, token: ContractAddress) -> u256;
        fn set_vault(ref self: TContractState, vault: ContractAddress);
        fn get_vault(self: @TContractState) -> ContractAddress;
    }

    #[storage]
    struct Storage {
        admin: ContractAddress,
        vault: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        PoolDepositRouted: PoolDepositRouted,
        PoolWithdrawRouted: PoolWithdrawRouted,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PoolDepositRouted {
        #[key]
        pub note_commitment: felt252,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PoolWithdrawRouted {
        #[key]
        pub note_commitment: felt252,
        pub payout: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, vault: ContractAddress) {
        self.admin.write(admin);
        self.vault.write(vault);
    }

    #[abi(embed_v0)]
    pub impl IPoolActionsImpl of IPoolActions<ContractState> {
        /// Emulates the STRK20 pool executing a privacy_invoke deposit payload.
        /// Takes real custody of the deposited tokens (production: the pool
        /// already holds shielded assets; here custody moves to this executor).
        fn pool_deposit(
            ref self: ContractState,
            note_commitment: felt252,
            token: ContractAddress,
            amount: u256,
            lower_tick: i128,
            upper_tick: i128,
        ) {
            let erc20 = IERC20MinimalDispatcher { contract_address: token };
            erc20.transfer_from(starknet::get_caller_address(), starknet::get_contract_address(), amount);
            let vault = IOblivionVaultDispatcher { contract_address: self.vault.read() };
            vault.privacy_invoke_deposit(note_commitment, token, amount, lower_tick, upper_tick);
            self.emit(PoolDepositRouted { note_commitment, amount });
        }

        /// Emulates the STRK20 pool executing a privacy_invoke withdraw payload.
        /// Pays out real tokens held by this executor against burned shares.
        fn pool_withdraw(
            ref self: ContractState,
            note_commitment: felt252,
            shares_to_burn: u256,
            token: ContractAddress,
        ) -> u256 {
            let vault = IOblivionVaultDispatcher { contract_address: self.vault.read() };
            let payout = vault.privacy_invoke_withdraw(note_commitment, shares_to_burn, token);
            let erc20 = IERC20MinimalDispatcher { contract_address: token };
            erc20.transfer(starknet::get_caller_address(), payout);
            self.emit(PoolWithdrawRouted { note_commitment, payout });
            payout
        }

        /// Emulates the pool harvesting Ekubo fees and re-shielding them.
        fn pool_harvest(ref self: ContractState, token: ContractAddress) -> u256 {
            let vault = IOblivionVaultDispatcher { contract_address: self.vault.read() };
            vault.harvest_and_compound(token)
        }

        fn set_vault(ref self: ContractState, vault: ContractAddress) {
            assert(starknet::get_caller_address() == self.admin.read(), 'Not admin');
            self.vault.write(vault);
        }

        fn get_vault(self: @ContractState) -> ContractAddress {
            self.vault.read()
        }
    }
}
