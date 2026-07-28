import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window { ethereum?: any; }
}

export function useWallet() {
  const [providerAvailable, setProviderAvailable] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProviderAvailable(typeof window !== 'undefined' && !!window.ethereum);
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts && accounts.length ? accounts[0] : null);
    };
    const handleChainChanged = (chain: string) => {
      setChainId(chain ?? null);
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        window.ethereum.on && window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on && window.ethereum.on('chainChanged', handleChainChanged);
      } catch (e) {
        // some providers may throw when attaching listeners
        // swallow silently but keep providerAvailable flag
        // console.warn('wallet listener attach error', e);
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.removeListener) {
        try {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        } catch (_) {
          // ignore
        }
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No Ethereum provider detected — please install MetaMask or a compatible wallet.');
      setProviderAvailable(false);
      return null;
    }
    try {
      // Must be called from a user gesture (button click)
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(currentChain ?? null);
      setProviderAvailable(true);
      return accounts;
    } catch (err: any) {
      if (err && err.code === 4001) {
        setError('Connection request rejected by user.');
      } else {
        setError(err?.message || 'Failed to connect to wallet.');
      }
      console.error('wallet connect error', err);
      return null;
    }
  }, []);

  return { providerAvailable, account, chainId, error, connect, setError };
}

export default useWallet;
