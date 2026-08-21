pub mod interfaces {
    pub mod ISTRK20Pool;
    pub mod IEkuboCore;
    pub mod IPragmaOracle;
    pub mod INostraMoneyMarket;
    pub mod IYieldRouter;
    pub mod IAttest;
    pub mod IOblivionVault;
    pub mod ICoWMatcher;
    pub mod ISessionManager;
}

pub mod core {
    pub mod OblivionVault;
    pub mod CoWMatcher;
    pub mod YieldRouter;
    pub mod SessionKeyManager;
    pub mod MockPool;
}

pub mod compliance {
    pub mod AttestEngine;
    pub mod SolvencyProver;
}
