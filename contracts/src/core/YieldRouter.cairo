#[starknet::contract]
pub mod YieldRouter {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::IYieldRouter::IYieldRouter;

    #[storage]
    struct Storage {
        admin: ContractAddress,
        vault: ContractAddress,
        nostra_market: ContractAddress,
        total_routed_assets: Map<ContractAddress, u256>,
        accumulated_lending_yield: Map<ContractAddress, u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        AssetsRoutedToLending: AssetsRoutedToLending,
        AssetsWithdrawnFromLending: AssetsWithdrawnFromLending,
        YieldHarvested: YieldHarvested,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AssetsRoutedToLending {
        #[key]
        pub token: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AssetsWithdrawnFromLending {
        #[key]
        pub token: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct YieldHarvested {
        #[key]
        pub token: ContractAddress,
        pub yield_amount: u256,
    }

    #[constructor]
    pub fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        vault: ContractAddress,
        nostra_market: ContractAddress
    ) {
        self.admin.write(admin);
        self.vault.write(vault);
        self.nostra_market.write(nostra_market);
    }

    #[abi(embed_v0)]
    impl YieldRouterImpl of IYieldRouter<ContractState> {
        fn route_idle_capital(ref self: ContractState, token: ContractAddress, amount: u256) -> u256 {
            let caller = get_caller_address();
            assert(caller == self.vault.read(), 'Only Vault authorized');
            assert(amount > 0, 'Amount must be > 0');

            let current_routed = self.total_routed_assets.read(token);
            self.total_routed_assets.write(token, current_routed + amount);

            self.emit(AssetsRoutedToLending { token, amount });
            amount
        }

        fn recall_capital(ref self: ContractState, token: ContractAddress, amount: u256) -> u256 {
            let caller = get_caller_address();
            assert(caller == self.vault.read(), 'Only Vault authorized');
            let current_routed = self.total_routed_assets.read(token);
            assert(current_routed >= amount, 'Insufficient routed capital');

            self.total_routed_assets.write(token, current_routed - amount);

            self.emit(AssetsWithdrawnFromLending { token, amount });
            amount
        }

        fn harvest_lending_yield(ref self: ContractState, token: ContractAddress) -> u256 {
            let caller = get_caller_address();
            assert(caller == self.vault.read(), 'Only Vault authorized');
            let current_routed = self.total_routed_assets.read(token);
            if current_routed == 0 {
                return 0;
            }

            // Simulated Nostra 5% APY yield calculation per harvest cycle
            let generated_yield = (current_routed * 5) / 10_000;
            if generated_yield > 0 {
                let acc = self.accumulated_lending_yield.read(token);
                self.accumulated_lending_yield.write(token, acc + generated_yield);
                self.total_routed_assets.write(token, current_routed + generated_yield);

                self.emit(YieldHarvested { token, yield_amount: generated_yield });
            }

            generated_yield
        }

        fn get_routed_balance(self: @ContractState, token: ContractAddress) -> u256 {
            self.total_routed_assets.read(token)
        }

        fn get_total_harvested_yield(self: @ContractState, token: ContractAddress) -> u256 {
            self.accumulated_lending_yield.read(token)
        }
    }
}
