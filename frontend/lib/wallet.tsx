"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { connect, disconnect } from "get-starknet";
import type { StarknetWindowObject } from "get-starknet";
import type { AccountInterface } from "starknet";

interface WalletState {
  address: string | null;
  account: AccountInterface | null;
  chainId: string | null;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  account: null,
  chainId: null,
  connecting: false,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
});

const LAST_WALLET_KEY = "oblivion.lastWalletId";

function shortChainId(chainId?: string): string | null {
  if (!chainId) return null;
  // hex-encoded ASCII, e.g. 0x534e5f5345504f4c4941 = SN_SEPOLIA
  try {
    const decoded = chainId
      .slice(2)
      .match(/.{2}/g)
      ?.map((b) => String.fromCharCode(parseInt(b, 16)))
      .join("");
    return decoded ?? chainId;
  } catch {
    return chainId;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const bind = useCallback(async (wallet: StarknetWindowObject) => {
    const acc = await wallet.account;
    setAccount(acc);
    setAddress(wallet.selectedAddress ?? acc.address);
    try {
      setChainId(shortChainId(await acc.getChainId()));
    } catch {
      setChainId(null);
    }
    window.localStorage.setItem(LAST_WALLET_KEY, wallet.id);
  }, []);

  // Silent reconnect on load if the user connected before
  // (get-starknet remembers the last wallet; neverAsk resolves it without UI)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wallet = await connect({ modalMode: "neverAsk" });
        if (wallet && !cancelled) await bind(wallet);
      } catch {
        /* no previous wallet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bind]);

  // Track account switches / disconnects initiated inside the wallet extension
  useEffect(() => {
    const onChange = (evt: Event) => {
      const accounts = (evt as CustomEvent<string[]>).detail;
      if (!accounts || accounts.length === 0) {
        setAddress(null);
        setAccount(null);
        window.localStorage.removeItem(LAST_WALLET_KEY);
      } else {
        setAddress(accounts[0]);
      }
    };
    window.addEventListener(
      "starknet_accountsChanged",
      onChange as EventListener
    );
    return () =>
      window.removeEventListener(
        "starknet_accountsChanged",
        onChange as EventListener
      );
  }, []);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      const wallet = await connect({
        modalMode: "alwaysAsk",
        modalTheme: "light",
      });
      if (wallet) await bind(wallet);
    } finally {
      setConnecting(false);
    }
  }, [bind]);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect({ clearLastWallet: true });
    } finally {
      window.localStorage.removeItem(LAST_WALLET_KEY);
      setAddress(null);
      setAccount(null);
      setChainId(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      address,
      account,
      chainId,
      connecting,
      connectWallet,
      disconnectWallet,
    }),
    [address, account, chainId, connecting, connectWallet, disconnectWallet]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
