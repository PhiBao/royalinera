import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Configuration
const HUB_CHAIN_ID = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || 'a6f2e101a65522962a5cc4a422202e3374f9d11215258c88e7496bdaadde9635';
const APP_ID = import.meta.env.VITE_LINERA_APPLICATION_ID || 'ad184ec9fe226812c377847c68f470f1ca39a80cc755db32c67fef142f13097a';

// IndexedDB helper for wallet persistence
const DB_NAME = 'royalinera_wallet';
const DB_VERSION = 1;
const STORE_NAME = 'wallet_store';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

const dbGet = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
};

const dbSet = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key, value });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const dbDelete = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Helper to compute Linera owner format from Ethereum address
const computeLineraOwner = (address) => {
  // Remove 0x prefix if present, lowercase
  const cleanAddress = address.toLowerCase().replace('0x', '');
  // Pad to 32 bytes (64 hex chars) - Linera Address32 format
  const padded = cleanAddress.padStart(64, '0');
  return padded;
};

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // Modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Wallet state
  const [walletType, setWalletType] = useState(null); // 'metamask' or 'demo'
  const [address, setAddress] = useState(null); // Ethereum address
  const [owner, setOwner] = useState(null); // Linera owner format
  const [chainId, setChainId] = useState(HUB_CHAIN_ID); // Current chain ID
  
  // Demo accounts for easy testing
  const DEMO_ACCOUNTS = [
    { name: 'Alice', address: '0x1111111111111111111111111111111111111111' },
    { name: 'Bob', address: '0x2222222222222222222222222222222222222222' },
    { name: 'Charlie', address: '0x3333333333333333333333333333333333333333' },
  ];

  // Restore wallet on mount
  useEffect(() => {
    const restoreWallet = async () => {
      try {
        const savedWallet = await dbGet('wallet');
        if (savedWallet) {
          setWalletType(savedWallet.type);
          setAddress(savedWallet.address);
          setOwner(computeLineraOwner(savedWallet.address));
          setChainId(savedWallet.chainId || HUB_CHAIN_ID);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Failed to restore wallet:', err);
      }
    };
    restoreWallet();
  }, []);

  // Connect with MetaMask
  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const addr = accounts[0];
      const lineraOwner = computeLineraOwner(addr);
      
      // Save to IndexedDB
      await dbSet('wallet', { 
        type: 'metamask', 
        address: addr,
        chainId: HUB_CHAIN_ID 
      });
      
      setWalletType('metamask');
      setAddress(addr);
      setOwner(lineraOwner);
      setChainId(HUB_CHAIN_ID);
      setIsConnected(true);
      setShowWalletModal(false);
      
      return { address: addr, owner: lineraOwner };
    } catch (err) {
      setConnectionError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect with demo account
  const connectDemo = useCallback(async (demoAccount) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const lineraOwner = computeLineraOwner(demoAccount.address);
      
      // Save to IndexedDB
      await dbSet('wallet', { 
        type: 'demo', 
        address: demoAccount.address,
        name: demoAccount.name,
        chainId: HUB_CHAIN_ID 
      });
      
      setWalletType('demo');
      setAddress(demoAccount.address);
      setOwner(lineraOwner);
      setChainId(HUB_CHAIN_ID);
      setIsConnected(true);
      setShowWalletModal(false);
      
      return { address: demoAccount.address, owner: lineraOwner };
    } catch (err) {
      setConnectionError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await dbDelete('wallet');
    } catch (err) {
      console.error('Failed to clear wallet:', err);
    }
    
    setWalletType(null);
    setAddress(null);
    setOwner(null);
    setIsConnected(false);
  }, []);

  // Format owner for GraphQL queries (AccountOwner type)
  const formatOwner = useCallback(() => {
    if (!owner) return null;
    return `User:${owner}`;
  }, [owner]);

  // Short address for display
  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const value = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Modal control
    showWalletModal,
    openWalletModal: () => setShowWalletModal(true),
    closeWalletModal: () => setShowWalletModal(false),
    
    // Wallet info
    walletType,
    address,
    shortAddress,
    owner,
    formatOwner,
    chainId,
    
    // Chain info
    hubChainId: HUB_CHAIN_ID,
    appId: APP_ID,
    
    // Actions
    connectMetaMask,
    connectDemo,
    disconnect,
    
    // Demo accounts
    DEMO_ACCOUNTS,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
