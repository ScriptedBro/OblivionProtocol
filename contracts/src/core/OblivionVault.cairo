#[starknet::contract]
pub mod OblivionVault {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use oblivion_protocol::interfaces::IOblivionVault::{IOblivionVault, LPPosition, OpenNoteDeposit};

    const FEE_PRECISION: u256 = 1_000_000_000_000_000_000_u256; // 1e18

    #[storage]
    struct Storage {
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        ekubo_core: ContractAddress,
        attest_engine: ContractAddress,
        total_shielded_shares: u256,
        accumulated_fees_per_share: u256,
        total_vault_assets: Map<ContractAddress, u256>,
        lp_positions: Map<felt252, LPPosition>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ShieldedLPDeposited: ShieldedLPDeposited,
        ShieldedLPWithdrawn: ShieldedLPWithdrawn,
        FeesCompounded: FeesCompounded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ShieldedLPDeposited {
        #[key]
        pub note_commitment: felt252,
        pub shares_minted: u256,
        pub lower_tick: i128,
        pub upper_tick: i128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ShieldedLPWithdrawn {
        #[key]
        pub note_commitment: felt252,
        pub shares_burned: u256,
        pub payout_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FeesCompounded {
        pub fees_re_shielded: u256,
        pub new_acc_fees_per_share: u256,
    }

    #[constructor]
    pub fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk20_pool: ContractAddress,
        ekubo_core: ContractAddress,
        attest_engine: ContractAddress
    ) {
        self.admin.write(admin);
        self.strk20_pool.write(strk20_pool);
        self.ekubo_core.write(ekubo_core);
        self.attest_engine.write(attest_engine);
        self.total_shielded_shares.write(0);
        self.accumulated_fees_per_share.write(0);
    }

    #[abi(embed_v0)]
    impl OblivionVaultImpl of IOblivionVault<ContractState> {
        fn privacy_invoke_deposit(
            ref self: ContractState,
            note_commitment: felt252,
            token: ContractAddress,
            amount: u256,
            lower_tick: i128,
            upper_tick: i128
        ) {
            let caller = get_caller_address();
            let pool = self.strk20_pool.read();
            assert(caller == pool, 'Only STRK20 Pool allowed');
            assert(amount > 0, 'Amount must be > 0');

            let total_shares = self.total_shielded_shares.read();
            let current_assets = self.total_vault_assets.read(token);
            
            let minted_shares = if total_shares == 0 || current_assets == 0 {
                amount
            } else {
                (amount * total_shares) / current_assets
            };

            let current_fee_rate = self.accumulated_fees_per_share.read();
            let fee_debt = (minted_shares * current_fee_rate) / FEE_PRECISION;

            self.lp_positions.write(note_commitment, LPPosition {
                lower_tick,
                upper_tick,
                shares: minted_shares,
                fee_debt,
                deposited_at: get_block_timestamp(),
            });

            self.total_shielded_shares.write(total_shares + minted_shares);
            self.total_vault_assets.write(token, current_assets + amount);

            self.emit(ShieldedLPDeposited {
                note_commitment,
                shares_minted: minted_shares,
                lower_tick,
                upper_tick
            });
        }

        fn privacy_invoke_withdraw(
            ref self: ContractState,
            note_commitment: felt252,
            shares_to_burn: u256,
            token: ContractAddress
        ) -> u256 {
            let caller = get_caller_address();
            let pool = self.strk20_pool.read();
            assert(caller == pool, 'Only STRK20 Pool allowed');

            let mut position = self.lp_positions.read(note_commitment);
            assert(position.shares >= shares_to_burn, 'Insufficient shares');

            let total_shares = self.total_shielded_shares.read();
            let current_assets = self.total_vault_assets.read(token);
            assert(total_shares > 0, 'Zero shares');

            let gross_payout = (shares_to_burn * current_assets) / total_shares;

            let current_fee_rate = self.accumulated_fees_per_share.read();
            let total_accrued = (shares_to_burn * current_fee_rate) / FEE_PRECISION;
            let fee_reward = if total_accrued > position.fee_debt {
                total_accrued - position.fee_debt
            } else {
                0
            };

            let total_payout = gross_payout + fee_reward;

            position.shares -= shares_to_burn;
            self.lp_positions.write(note_commitment, position);
            self.total_shielded_shares.write(total_shares - shares_to_burn);
            
            if current_assets >= gross_payout {
                self.total_vault_assets.write(token, current_assets - gross_payout);
            } else {
                self.total_vault_assets.write(token, 0);
            }

            self.emit(ShieldedLPWithdrawn {
                note_commitment,
                shares_burned: shares_to_burn,
                payout_amount: total_payout
            });

            total_payout
        }

        fn privacy_invoke(
            ref self: ContractState,
            note_id: felt252,
            token: ContractAddress,
            amount: u128,
            lower_tick: i128,
            upper_tick: i128
        ) -> Span<OpenNoteDeposit> {
            let caller = get_caller_address();
            let pool = self.strk20_pool.read();
            assert(caller == pool, 'Only STRK20 Pool allowed');
            assert(amount > 0, 'Zero amount');

            let amount_u256: u256 = amount.into();
            let total_shares = self.total_shielded_shares.read();
            let current_assets = self.total_vault_assets.read(token);

            let minted_shares = if total_shares == 0 || current_assets == 0 {
                amount_u256
            } else {
                (amount_u256 * total_shares) / current_assets
            };

            let current_fee_rate = self.accumulated_fees_per_share.read();
            let fee_debt = (minted_shares * current_fee_rate) / FEE_PRECISION;

            self.lp_positions.write(note_id, LPPosition {
                lower_tick,
                upper_tick,
                shares: minted_shares,
                fee_debt,
                deposited_at: get_block_timestamp(),
            });

            self.total_shielded_shares.write(total_shares + minted_shares);
            self.total_vault_assets.write(token, current_assets + amount_u256);

            self.emit(ShieldedLPDeposited {
                note_commitment: note_id,
                shares_minted: minted_shares,
                lower_tick,
                upper_tick
            });

            let deposit = OpenNoteDeposit {
                note_id,
                token,
                amount,
            };
            array![deposit].span()
        }

        fn harvest_and_compound(ref self: ContractState, token: ContractAddress) -> u256 {
            let total_shares = self.total_shielded_shares.read();
            if total_shares == 0 {
                return 0;
            }

            let current_assets = self.total_vault_assets.read(token);
            let harvested_fees = (current_assets * 10) / 10_000;
            
            if harvested_fees > 0 {
                let fee_increment = (harvested_fees * FEE_PRECISION) / total_shares;
                let new_rate = self.accumulated_fees_per_share.read() + fee_increment;
                self.accumulated_fees_per_share.write(new_rate);
                self.total_vault_assets.write(token, current_assets + harvested_fees);

                self.emit(FeesCompounded {
                    fees_re_shielded: harvested_fees,
                    new_acc_fees_per_share: new_rate
                });
            }

            harvested_fees
        }

        fn get_position(self: @ContractState, note_commitment: felt252) -> LPPosition {
            self.lp_positions.read(note_commitment)
        }

        fn get_total_shares(self: @ContractState) -> u256 {
            self.total_shielded_shares.read()
        }

        fn get_total_assets(self: @ContractState, token: ContractAddress) -> u256 {
            self.total_vault_assets.read(token)
        }

        fn get_accumulated_fees_per_share(self: @ContractState) -> u256 {
            self.accumulated_fees_per_share.read()
        }
    }
}
