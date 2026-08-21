use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use oblivion_protocol::interfaces::IOblivionVault::{IOblivionVaultDispatcher, IOblivionVaultDispatcherTrait};
use oblivion_protocol::interfaces::ICoWMatcher::{ICoWMatcherDispatcher, ICoWMatcherDispatcherTrait};
use oblivion_protocol::interfaces::IAttest::{IAttestEngineDispatcher, IAttestEngineDispatcherTrait};

// Real Starknet Mainnet Addresses
const MAINNET_STRK20_POOL: felt252 = 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a;
const MAINNET_EKUBO_CORE: felt252 = 0x00000005dd3d2f4429af886ac1a75428d1d52d0a09c74bd85696b5b79ef757c2;
const MAINNET_PRAGMA_ORACLE: felt252 = 0x02a85bd616f912537ec5092da0b93d304678b83329b38495b6a82934a78e9a8f;
const MAINNET_STRK_TOKEN: felt252 = 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d;
const MAINNET_USDC_TOKEN: felt252 = 0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8;

#[test]
fn test_mainnet_protocol_deployment_and_execution() {
    let admin: ContractAddress = 0x123.try_into().unwrap();
    let mainnet_pool: ContractAddress = MAINNET_STRK20_POOL.try_into().unwrap();
    let mainnet_ekubo: ContractAddress = MAINNET_EKUBO_CORE.try_into().unwrap();
    let mainnet_oracle: ContractAddress = MAINNET_PRAGMA_ORACLE.try_into().unwrap();
    let strk_token: ContractAddress = MAINNET_STRK_TOKEN.try_into().unwrap();
    let usdc_token: ContractAddress = MAINNET_USDC_TOKEN.try_into().unwrap();

    // 1. Deploy ATTEST Engine with Mainnet Pool linkage
    let attest_contract = declare("AttestEngine").unwrap().contract_class();
    let attest_calldata: Array<felt252> = array![admin.into(), mainnet_pool.into()];
    let (attest_addr, _) = attest_contract.deploy(@attest_calldata).unwrap();
    let attest = IAttestEngineDispatcher { contract_address: attest_addr };

    // 2. Deploy Oblivion Vault bound to Mainnet STRK20 Pool & Ekubo Core
    let vault_contract = declare("OblivionVault").unwrap().contract_class();
    let vault_calldata: Array<felt252> = array![
        admin.into(),
        mainnet_pool.into(),
        mainnet_ekubo.into(),
        attest_addr.into()
    ];
    let (vault_addr, _) = vault_contract.deploy(@vault_calldata).unwrap();
    let vault = IOblivionVaultDispatcher { contract_address: vault_addr };

    // 3. Deploy CoW Matcher bound to Mainnet STRK20 Pool & Pragma Oracle
    let cow_contract = declare("CoWMatcher").unwrap().contract_class();
    let cow_calldata: Array<felt252> = array![
        admin.into(),
        mainnet_pool.into(),
        mainnet_oracle.into()
    ];
    let (cow_addr, _) = cow_contract.deploy(@cow_calldata).unwrap();
    let cow = ICoWMatcherDispatcher { contract_address: cow_addr };

    // --- EXECUTE MAINNET FLOW ---
    snforge_std::start_cheat_caller_address(vault.contract_address, mainnet_pool);
    snforge_std::start_cheat_block_timestamp(vault.contract_address, 1724238000); // Mainnet timestamp

    let note_commitment: felt252 = 0x07f419460965d6d83b2cc919a0f08d11dee212fe367849cfb1afe124ed14b511;
    let deposit_amount: u256 = 50_000_000_000_000_000_000_u256; // 50 STRK

    // Deposit into Mainnet Vault via STRK20 privacy_invoke
    vault.privacy_invoke_deposit(
        note_commitment,
        strk_token,
        deposit_amount,
        -1200_i128,
        850_i128
    );

    assert(vault.get_total_shares() == deposit_amount, 'Mainnet shares mismatch');
    assert(vault.get_total_assets(strk_token) == deposit_amount, 'Mainnet assets mismatch');

    // Batch Auction with Mainnet USDC pair
    let batch_id = cow.open_batch(strk_token, usdc_token, 30);
    cow.commit_order(batch_id, 0x1111, true, 25_000_000_000_000_000_000_u256, 0);
    cow.commit_order(batch_id, 0x2222, false, 12_000_000_000_000_000_000_u256, 0);

    let spot_price: u256 = 480_000_000_000_000_000_u256; // $0.48 Pragma median
    cow.settle_batch(batch_id, spot_price);

    let batch = cow.get_batch(batch_id);
    assert(batch.is_settled, 'Batch not settled');

    // Solvency Proof Verification
    let proof = array![0x111, 0x222, 0x333].span();
    let is_solvent = attest.verify_solvency_proof(
        vault.get_total_assets(strk_token),
        vault.get_total_shares(),
        proof
    );
    assert(is_solvent, 'Solvency failed on Mainnet');

    snforge_std::stop_cheat_caller_address(vault.contract_address);
    snforge_std::stop_cheat_block_timestamp(vault.contract_address);
}
