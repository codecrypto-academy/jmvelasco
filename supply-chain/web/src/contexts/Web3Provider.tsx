import { ethers } from 'ethers';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { CONTRACT_CONFIG } from '../config/contracts';
import type { SupplyChain } from '../types/SupplyChain'; // TypeChain types

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

type Web3ContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: SupplyChain | null;
  address: string | null;
  connect: () => Promise<void>;
};

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<SupplyChain | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // Conectar a MetaMask
  const connect = async () => {
    if (!window.ethereum) {
      alert('MetaMask no está instalado');
      return;
    }
    // Get accounts from MetaMask and prefer first account for state
    const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const selected = accounts[0];

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(browserProvider);
    const signer = await browserProvider.getSigner();
    setSigner(signer);

    // Use the selected account for address state
    setAddress(selected);
    // Persist session
    try {
      localStorage.setItem('web3:address', selected);
    } catch {}

    // Instanciar el contrato con TypeChain
    const contractInstance = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_CONFIG.abi,
      signer
    ) as unknown as SupplyChain;
    setContract(contractInstance);
  };

  // Conectar automáticamente si MetaMask ya está autorizado
  useEffect(() => {
    if (!window.ethereum) return;

    let removed = false;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const next = accounts[0];
        setAddress(next);
        try {
          // Always create fresh provider - don't rely on stale closure
          const freshProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(freshProvider);
          const nextSigner = await freshProvider.getSigner();
          setSigner(nextSigner);
          const contractInstance = new ethers.Contract(
            CONTRACT_CONFIG.address,
            CONTRACT_CONFIG.abi,
            nextSigner
          ) as unknown as SupplyChain;
          setContract(contractInstance);
          localStorage.setItem('web3:address', next);
        } catch (e) {
          // If something goes wrong re-initializing signer/contract, fall back to clearing them
          console.warn('Failed to refresh signer/contract on accountsChanged:', e);
        }
      } else {
        // No accounts: reset state
        setAddress(null);
        setSigner(null);
        setContract(null);
        setProvider(null);
        localStorage.removeItem('web3:address');
      }
    };

    const handleChainChanged = (_chainId: string) => {
      // Simplest behavior: reset state (tests expect reset)
      setAddress(null);
      setSigner(null);
      setContract(null);
      setProvider(null);
      try {
        localStorage.removeItem('web3:address');
      } catch {}
    };

    // Auto-connect if authorized or persisted
    const init = async () => {
      const [accounts, persisted] = await Promise.all([
        window.ethereum.request({ method: 'eth_accounts' }) as Promise<string[]>,
        Promise.resolve<string | null>(
          typeof localStorage !== 'undefined' ? localStorage.getItem('web3:address') : null
        ),
      ]);

      if (accounts && accounts.length > 0) {
        // Establish provider/signer/contract but avoid prompting
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        const signer = await browserProvider.getSigner();
        setSigner(signer);
        const selected = accounts[0];
        setAddress(selected);
        try {
          localStorage.setItem('web3:address', selected);
        } catch {}
        const contractInstance = new ethers.Contract(
          CONTRACT_CONFIG.address,
          CONTRACT_CONFIG.abi,
          signer
        ) as unknown as SupplyChain;
        setContract(contractInstance);
      } else if (persisted) {
        // Clear stale persistence if no accounts actually connected
        try {
          localStorage.removeItem('web3:address');
        } catch {}
      }

      if (!removed) {
        window.ethereum.on?.('accountsChanged', handleAccountsChanged);
        window.ethereum.on?.('chainChanged', handleChainChanged);
      }
    };

    init();

    return () => {
      removed = true;
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, contract, address, connect }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 debe usarse dentro de Web3Provider');
  return ctx;
};
