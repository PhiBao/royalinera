import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// IndexedDB helper for wallet persistence
const DB_NAME = 'ticketh_wallet';
const DB_VERSION = 2;
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

const WalletContext = createContext(null);

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

// Helper to compute keccak256 and get Address32 format (Linera hash format)
const computeLineraOwner = async (address) => {
    const { ethers } = await import('ethers');
    // Remove 0x prefix if present, lowercase
    const cleanAddress = address.toLowerCase().replace('0x', '');
    // Pad to 32 bytes (64 hex chars) - Linera Address32 format
    const padded = cleanAddress.padStart(64, '0');
    // Hash it to get the CryptoHash owner format
    const hash = ethers.keccak256('0x' + padded);
    return hash.replace('0x', '');
};

export const WalletProvider = ({ children }) => {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Modal state
    const [showWalletModal, setShowWalletModal] = useState(false);

    // Linera client objects (populated when faucet available)
    const [lineraClient, setLineraClient] = useState(null);
    const [lineraFrontend, setLineraFrontend] = useState(null);
    const [application, setApplication] = useState(null);
    const [signer, setSigner] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [lineraFaucet, setLineraFaucet] = useState(null); // For lazy Client creation
    const [lineraInitialized, setLineraInitialized] = useState(false);
    const [hasFaucet, setHasFaucet] = useState(false);

    // Notification listener for state updates
    const [notificationListeners, setNotificationListeners] = useState([]);

    // Wallet state
    const [chainId, setChainId] = useState(null);
    const [owner, setOwner] = useState(null);
    const [lineraOwner, setLineraOwner] = useState(null); // Address32 format for contract calls
    const [balance, setBalance] = useState(null);

    // Multi-account support
    const [accounts, setAccounts] = useState([]);
    const [activeAccountIndex, setActiveAccountIndex] = useState(0);

    const initRef = useRef(false);

    // Config from env - support both skribble and legacy naming conventions
    const applicationId = import.meta.env.VITE_LINERA_APPLICATION_ID || import.meta.env.VITE_APP_ID;
    const faucetUrl = import.meta.env.VITE_LINERA_FAUCET_URL || import.meta.env.VITE_FAUCET_URL;
    const nodeUrl = import.meta.env.VITE_LINERA_NODE_URL || 'https://testnet-conway.linera.net';

    // The marketplace chain - where all shared state lives (events, listings, etc.)
    // This is the chain where the application was originally created/deployed
    const marketplaceChainId = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || 'a6f2e101a65522962a5cc4a422202e3374f9d11215258c88e7496bdaadde9635';

    // Check if MetaMask is the active default wallet
    // The @linera/signer only works with MetaMask, not other wallets like Rabby
    const isMetaMaskDefault = () => {
        if (typeof window === 'undefined' || !window.ethereum) return false;
        
        // MetaMask must be present and NOT be overridden by another wallet
        // Rabby sets isMetaMask=true but also sets isRabby=true
        if (window.ethereum.isRabby) return false;
        if (window.ethereum.isCoinbaseWallet) return false;
        if (window.ethereum.isBraveWallet) return false;
        if (window.ethereum.isOkxWallet) return false;
        if (window.ethereum.isTrust) return false;
        
        // Check if it's actually MetaMask
        return window.ethereum.isMetaMask === true;
    };

    // Get the name of the current wallet for display purposes
    const getActiveWalletName = () => {
        if (typeof window === 'undefined' || !window.ethereum) return null;
        if (window.ethereum.isRabby) return 'Rabby';
        if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
        if (window.ethereum.isBraveWallet) return 'Brave Wallet';
        if (window.ethereum.isOkxWallet) return 'OKX Wallet';
        if (window.ethereum.isTrust) return 'Trust Wallet';
        if (window.ethereum.isMetaMask) return 'MetaMask';
        return 'Unknown Wallet';
    };

    // Initialize Linera client with MetaMask signer
    // LIGHTWEIGHT MODE: Skip Client constructor (which connects to validators and can timeout)
    // Only get wallet address, claim chain, and store signer for later mutations
    // Queries go through 8080 backend, mutations create Client on-demand
    const initializeLineraClient = async () => {
        try {
            console.log('Initializing Linera client with MetaMask...');

            // Check for wallet provider
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('No wallet found. Please install MetaMask.');
            }

            // Check if MetaMask is the active default wallet
            const activeWallet = getActiveWalletName();
            console.log('Active wallet:', activeWallet);
            console.log('Provider details:', {
                isMetaMask: window.ethereum.isMetaMask,
                isRabby: window.ethereum.isRabby,
                isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
            });

            if (!isMetaMaskDefault()) {
                throw new Error(
                    `MetaMask must be your default wallet. Currently active: ${activeWallet}. ` +
                    `Please disable ${activeWallet} or set MetaMask as your default wallet in the extension settings.`
                );
            }

            // Import Linera packages
            const linera = await import('@linera/client');
            const { MetaMask } = await import('@linera/signer');

            // Initialize WASM from public folder
            const wasmUrl = '/wasm/linera_web_bg.wasm';
            console.log('Loading WASM from:', wasmUrl);
            await linera.default(wasmUrl);
            console.log('WASM initialized');
            setLineraInitialized(true);

            // Create MetaMask signer
            console.log('Creating MetaMask signer...');
            let metaMaskSigner;
            let ownerAddress;

            // Request accounts from MetaMask
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                ownerAddress = accounts[0];
                console.log('Got accounts from MetaMask:', accounts);
            } catch (err) {
                console.error('Failed to get accounts from MetaMask:', err);
                throw new Error('Failed to connect to MetaMask. Please try again.');
            }

            // Create the MetaMask signer
            try {
                metaMaskSigner = new MetaMask();
                const signerAddress = await metaMaskSigner.address();
                console.log('MetaMask signer address:', signerAddress);

                // Verify the addresses match
                if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
                    console.warn('Signer address mismatch - signer:', signerAddress, 'expected:', ownerAddress);
                }
            } catch (signerErr) {
                console.error('Failed to create MetaMask signer:', signerErr);
                throw new Error('Failed to initialize MetaMask signer. Please make sure MetaMask is unlocked and try again.');
            }

            console.log('MetaMask connected with address:', ownerAddress);

            // Compute Linera owner (Address32 format) for contract operations
            const lineraAddr = await computeLineraOwner(ownerAddress);
            console.log('Linera owner (Address32):', lineraAddr);

            // Check if we have a stored chain ID for this MetaMask address
            const storageKey = `linera_chain_${ownerAddress.toLowerCase()}`;
            let storedChainId = localStorage.getItem(storageKey);

            // Connect to faucet
            const faucet = new linera.Faucet(faucetUrl);
            console.log('Faucet created at:', faucetUrl);

            // LIGHTWEIGHT MODE: Just claim chain, don't create Client yet
            // The Client constructor connects to validators and can timeout
            // We'll create Client lazily when needed for mutations
            let claimedChainId;
            
            console.log('Creating wallet from faucet...');
            const lineraWallet = await faucet.createWallet();
            console.log('Wallet created:', lineraWallet);

            // Claim or reuse chain
            if (storedChainId) {
                console.log('Found stored chain ID:', storedChainId);
                claimedChainId = storedChainId;
                
                // Try to claim anyway to ensure we're registered with faucet
                try {
                    console.log('Re-claiming chain from faucet...');
                    const freshChainId = await faucet.claimChain(lineraWallet, ownerAddress);
                    console.log('Faucet returned chain:', freshChainId);
                    claimedChainId = freshChainId;
                    
                    if (freshChainId !== storedChainId) {
                        console.log('Chain ID changed, updating storage');
                        localStorage.setItem(storageKey, freshChainId);
                    }
                } catch (claimErr) {
                    console.warn('Chain re-claim failed (using stored ID):', claimErr.message);
                    // Use stored chain ID
                }
            } else {
                // New wallet - must claim chain
                console.log('No stored chain, claiming new chain from faucet...');
                try {
                    claimedChainId = await faucet.claimChain(lineraWallet, ownerAddress);
                    console.log('Claimed new chain:', claimedChainId);
                    localStorage.setItem(storageKey, claimedChainId);
                } catch (claimErr) {
                    console.error('Failed to claim chain:', claimErr);
                    throw new Error('Failed to claim a chain from the faucet. The Conway testnet may be temporarily unavailable.');
                }
            }

            console.log('✅ Lightweight wallet connection complete');
            console.log('   Chain ID:', claimedChainId);
            console.log('   Owner:', ownerAddress);
            console.log('   Linera Owner:', lineraAddr);
            console.log('   Note: Client will be created lazily when needed for mutations');

            // Return wallet info without creating Client
            // application is null - queries go through 8080 backend via queryHub
            // Client will be created on-demand when mutate() is called
            return {
                client: null,           // Created lazily for mutations
                frontend: null,         // Not needed in lightweight mode
                application: null,      // Not needed - queries go through 8080 backend
                signer: metaMaskSigner,
                wallet: lineraWallet,
                faucet: faucet,         // Keep faucet for lazy Client creation
                chainId: claimedChainId,
                owner: ownerAddress,
                lineraOwner: lineraAddr,
                balance: '0',           // Can't get balance without Client
                hasFaucet: true,
                walletName: 'MetaMask',
            };
        } catch (error) {
            console.error('Failed to initialize Linera wallet:', error);
            throw error;
        }
    };

    // Connect wallet using any EVM wallet (MetaMask, Rabby, Coinbase, etc.)
    const connect = useCallback(async () => {
        if (isConnecting) return;

        setIsConnecting(true);
        setConnectionError(null);

        try {
            // Initialize Linera client with whatever EVM wallet is active
            const result = await initializeLineraClient();

            // Build accounts array
            const accountsArray = [{
                index: 0,
                owner: result.owner,
                lineraOwner: result.lineraOwner,
                chainId: result.chainId,
            }];

            // Update state
            setLineraClient(result.client);
            setLineraFrontend(result.frontend);
            setApplication(result.application);
            setSigner(result.signer);
            setWallet(result.wallet);
            setLineraFaucet(result.faucet); // Store faucet for lazy Client creation
            setChainId(result.chainId);
            setOwner(result.owner);
            setHasFaucet(result.hasFaucet);
            setLineraOwner(result.lineraOwner);

            setBalance(result.balance);
            setAccounts(accountsArray);
            setActiveAccountIndex(0);
            setIsConnected(true);
            setIsConnecting(false);

            console.log(`✅ Wallet connected via ${result.walletName}`);
            console.log('   Owner (Address20):', result.owner);
            console.log('   Linera Owner (Address32):', result.lineraOwner);
            console.log('   Chain:', result.chainId);
            console.log('   Balance:', result.balance);

            // Note: Hub subscription removed - it was causing extra signature prompts
            // State sync happens via queryHub() when needed

            return result;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            setConnectionError(error.message);
            setIsConnecting(false);
            throw error;
        }
    }, [isConnecting, faucetUrl, applicationId, nodeUrl]);

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        // Free WASM resources
        if (lineraClient) {
            try {
                lineraClient.free();
            } catch (e) {
                console.warn('Error freeing client:', e);
            }
        }

        setLineraClient(null);
        setLineraFrontend(null);
        setApplication(null);
        setSigner(null);
        setWallet(null);
        setChainId(null);
        setOwner(null);
        setLineraOwner(null);
        setBalance(null);
        setAccounts([]);
        setIsConnected(false);
        setHasFaucet(false);

        // Clear IndexedDB
        await dbDelete('mnemonic');
        await dbDelete('accounts');
        await dbDelete('activeAccountIndex');

        console.log('Wallet disconnected');
    }, [lineraClient]);

    // Add new account (claim new chain from faucet)
    const addAccount = useCallback(async () => {
        if (!wallet || !signer) throw new Error('Faucet not available - cannot add account');

        const mnemonic = await dbGet('mnemonic');
        if (!mnemonic) throw new Error('No mnemonic found');

        const newIndex = accounts.length;

        try {
            const linera = await import('@linera/client');

            // Use the same owner address
            const newOwner = signer.address();
            const newLineraOwner = await computeLineraOwner(newOwner);

            // Claim a new chain
            const faucet = new linera.Faucet(faucetUrl);
            const newChainId = await faucet.claimChain(wallet, newOwner);

            const newAccount = {
                index: newIndex,
                owner: newOwner,
                lineraOwner: newLineraOwner,
                chainId: newChainId,
            };

            const updatedAccounts = [...accounts, newAccount];
            setAccounts(updatedAccounts);
            await dbSet('accounts', updatedAccounts);

            return newAccount;
        } catch (error) {
            console.error('Failed to add account:', error);
            throw error;
        }
    }, [accounts, wallet, signer, faucetUrl]);

    // Switch active account
    const switchAccount = useCallback(async (accountIndex) => {
        const account = accounts[accountIndex];
        if (!account) throw new Error('Account not found');

        setChainId(account.chainId);
        setActiveAccountIndex(accountIndex);
        await dbSet('activeAccountIndex', accountIndex);

        console.log('Switched to account:', accountIndex, account.chainId);
    }, [accounts]);

    // No auto-connect - user must explicitly click connect
    // EVM wallets require user interaction to request accounts
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        // Listen for wallet account changes (works with any EVM wallet)
        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                console.log('Wallet accounts changed:', accounts);
                if (accounts.length === 0) {
                    // User disconnected wallet
                    await disconnect();
                } else if (isConnected) {
                    // User switched accounts, disconnect and let them reconnect
                    console.log('Account switched, disconnecting...');
                    await disconnect();
                    // Don't auto-reconnect - let user click connect again
                }
            });

            window.ethereum.on('chainChanged', () => {
                console.log('Wallet chain changed, reloading...');
                window.location.reload();
            });
        }
    }, []);

    // GraphQL request helper - uses Linera Application
    // With InitialStateSync, user chains now have local copies of marketplace data
    // so we always query the user's local chain (no hub proxy needed)
    const request = useCallback(async (query, variables = {}) => {
        console.log('Making GraphQL request');
        console.log('Query:', query);

        // Format query as JSON string for @linera/client Application.query()
        // Must match skribble format: '{ "query": "THE_GRAPHQL_QUERY" }'
        const cleanQuery = query.replace(/\s+/g, ' ').trim();
        const escapedQuery = cleanQuery.replace(/"/g, '\\"');

        // Build payload in skribble format with properly escaped JSON
        let payload;
        if (Object.keys(variables).length > 0) {
            payload = `{ "query": "${escapedQuery}", "variables": ${JSON.stringify(variables)} }`;
        } else {
            payload = `{ "query": "${escapedQuery}" }`;
        }

        // Query user's local chain (which has synced data from hub)
        if (application) {
            console.log('Using user chain application (synced with hub)');
            console.log('Payload:', payload);

            const responseStr = await application.query(payload);
            console.log('Raw response (via User Application):', responseStr);

            const json = JSON.parse(responseStr);
            console.log('Parsed response:', json);

            if (json.errors) {
                throw new Error(json.errors.map(e => e.message).join(', '));
            }
            return json.data;
        }

        // No application available
        throw new Error('Linera Application not available. Please connect your wallet first.');
    }, [application]);

    // Transfer funds using Linera client
    const transfer = useCallback(async (recipient, amount) => {
        if (!lineraClient) {
            throw new Error('Linera client not initialized');
        }

        try {
            await lineraClient.transfer({
                donor: owner,
                recipient,
                amount,
            });

            // Refresh balance
            const newBalance = await lineraClient.balance();
            setBalance(newBalance);
        } catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        }
    }, [lineraClient, owner]);

    // Subscribe to blockchain notifications (like linera-skribble pattern)
    // This allows components to refresh data when the blockchain state changes
    const onNotification = useCallback((callback) => {
        if (!lineraClient) {
            console.warn('Cannot subscribe to notifications: client not initialized');
            return () => { };
        }

        // Try to use the client's onNotification method if available
        try {
            const unsub = lineraClient.onNotification?.(callback);
            if (typeof unsub === 'function') {
                console.log('Subscribed to blockchain notifications');
                return unsub;
            }
        } catch (e) {
            console.warn('Failed to subscribe to blockchain notifications:', e);
        }

        // Fallback: add to local listeners for manual polling
        setNotificationListeners(prev => [...prev, callback]);
        return () => {
            setNotificationListeners(prev => prev.filter(cb => cb !== callback));
        };
    }, [lineraClient]);

    // Manually trigger notification callbacks (for polling fallback)
    const triggerNotification = useCallback(() => {
        notificationListeners.forEach(cb => {
            try { cb(); } catch (e) { console.warn('Notification callback error:', e); }
        });
    }, [notificationListeners]);

    const value = {
        // Connection state
        isConnected,
        isConnecting,
        connectionError,
        lineraInitialized,
        hasFaucet,

        // Linera objects
        lineraClient,
        lineraFrontend,
        application,
        signer,

        // Wallet data
        chainId,
        owner,
        address: owner, // Alias for compatibility with older components
        lineraOwner, // Address32 format for contract operations
        balance,

        // Multi-account
        accounts,
        activeAccountIndex,

        // Modal state
        showWalletModal,
        setShowWalletModal,
        openWalletModal: () => setShowWalletModal(true),
        closeWalletModal: () => setShowWalletModal(false),

        // Actions
        connect,
        disconnect,
        addAccount,
        switchAccount,
        request,
        transfer,
        onNotification,        // Subscribe to blockchain notifications
        triggerNotification,   // Manually trigger notification callbacks

        // Config
        appId: applicationId,
        userChainId: chainId, // Full chain ID for use in components
        shortOwner: owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : null,
        shortAddress: owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : null, // Alias for compatibility
        shortChainId: chainId ? `${chainId.slice(0, 8)}...` : null,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletProvider;
