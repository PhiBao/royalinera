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
    const [frontend, setFrontend] = useState(null);
    const [application, setApplication] = useState(null);
    const [signer, setSigner] = useState(null);
    const [wallet, setWallet] = useState(null);
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
    
    // The marketplace chain - where all shared state lives (events, listings, etc.)
    // This is the chain where the application was originally created/deployed
    const marketplaceChainId = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || 'a6f2e101a65522962a5cc4a422202e3374f9d11215258c88e7496bdaadde9635';

    // Generate a new mnemonic using ethers
    const generateMnemonic = async () => {
        const { ethers } = await import('ethers');
        const wallet = ethers.Wallet.createRandom();
        return wallet.mnemonic?.phrase;
    };

    // Initialize Linera client with proper WASM loading (skribble pattern)
    const initializeLineraClient = async (mnemonic) => {
        try {
            console.log('Initializing Linera client...');
            
            // Import Linera packages
            const linera = await import('@linera/client');
            const { PrivateKey } = await import('@linera/signer');
            
            // Initialize WASM from public folder
            const wasmUrl = '/wasm/linera_web_bg.wasm';
            console.log('Loading WASM from:', wasmUrl);
            await linera.default(wasmUrl);
            console.log('WASM initialized');
            setLineraInitialized(true);
            
            // Create signer from mnemonic
            const privateKeySigner = PrivateKey.fromMnemonic(mnemonic);
            const ownerAddress = privateKeySigner.address();
            console.log('Signer created with address:', ownerAddress);
            
            // Compute Linera owner (Address32 format) for contract operations
            const lineraAddr = await computeLineraOwner(ownerAddress);
            console.log('Linera owner (Address32):', lineraAddr);
            
            // Connect to faucet and create wallet/chain (required for serverless)
            const faucet = new linera.Faucet(faucetUrl);
            console.log('Faucet created at:', faucetUrl);
            
            const lineraWallet = await faucet.createWallet();
            console.log('Wallet created from faucet');
            
            const claimedChainId = await faucet.claimChain(lineraWallet, ownerAddress);
            console.log('Claimed chain:', claimedChainId);
            
            // Create client with skipProcessInbox: false (like linera-skribble)
            // This ensures messages are processed when queries are made
            console.log('Creating Linera client...');
            console.log('Wallet:', lineraWallet);
            console.log('Signer:', privateKeySigner);
            
            const clientPromise = new linera.Client(lineraWallet, privateKeySigner, { skipProcessInbox: false });
            console.log('Client constructor called, awaiting...');
            
            // Add timeout for debugging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Client creation timed out after 60 seconds')), 60000)
            );
            
            const client = await Promise.race([clientPromise, timeoutPromise]);
            console.log('Client created successfully');
            
            // Get application directly via frontend (skribble pattern)
            console.log('Getting application for ID:', applicationId);
            const frontend = client.frontend();
            console.log('Frontend obtained');
            const app = await frontend.application(applicationId);
            console.log('Application obtained:', applicationId);
            
            // NOTE: The JS SDK doesn't support client.chain() to query other chains
            // Marketplace reads (events, listings) are handled via local node service proxy
            // See vite.config.ts proxy and request() function for hub chain queries
            
            // Get balance
            let balanceStr = '0';
            try {
                balanceStr = await client.balance();
                console.log('Balance:', balanceStr);
            } catch (balErr) {
                console.warn('Could not get balance:', balErr);
            }
            
            return {
                client,
                frontend: client.frontend(),
                application: app,
                signer: privateKeySigner,
                wallet: lineraWallet,
                chainId: claimedChainId,
                owner: ownerAddress,
                lineraOwner: lineraAddr,
                balance: balanceStr,
                hasFaucet: true,
            };
        } catch (error) {
            console.error('Failed to initialize Linera client:', error);
            throw error;
        }
    };

    // Connect wallet (create new or restore)
    const connect = useCallback(async (existingMnemonic = null) => {
        if (isConnecting) return;

        setIsConnecting(true);
        setConnectionError(null);

        try {
            let mnemonic = existingMnemonic;

            // Try to restore from IndexedDB first
            if (!mnemonic) {
                mnemonic = await dbGet('mnemonic');
            }

            // Generate new if none exists
            if (!mnemonic) {
                mnemonic = await generateMnemonic();
                if (!mnemonic) throw new Error('Failed to generate mnemonic');
            }

            // Initialize Linera client
            const result = await initializeLineraClient(mnemonic);

            // Build accounts array
            const savedAccounts = await dbGet('accounts');
            let accountsArray;
            if (savedAccounts && savedAccounts.length > 0) {
                accountsArray = savedAccounts;
                // Update current account's chain if needed
                if (result.chainId && !accountsArray[0].chainId) {
                    accountsArray[0].chainId = result.chainId;
                }
            } else {
                accountsArray = [{
                    index: 0,
                    owner: result.owner,
                    lineraOwner: result.lineraOwner,
                    chainId: result.chainId,
                }];
            }

            // Save to IndexedDB
            await dbSet('mnemonic', mnemonic);
            await dbSet('accounts', accountsArray);
            await dbSet('activeAccountIndex', 0);

            // Update state
            setLineraClient(result.client);
            setFrontend(result.frontend);
            setApplication(result.application);
            setSigner(result.signer);
            setWallet(result.wallet);
            setChainId(result.chainId);
            setOwner(result.owner);
            setHasFaucet(result.hasFaucet);
            setLineraOwner(result.lineraOwner);
            
            setBalance(result.balance);
            setAccounts(accountsArray);
            setActiveAccountIndex(0);
            setIsConnected(true);
            setIsConnecting(false);

            console.log('✅ Wallet connected');
            console.log('   Owner (Address20):', result.owner);
            console.log('   Linera Owner (Address32):', result.lineraOwner);
            console.log('   Chain:', result.chainId);
            console.log('   Balance:', result.balance);

            // Subscribe to hub chain's event stream for marketplace data sync
            // This enables serverless operation - user chain receives events from hub
            try {
                console.log('Subscribing to hub event stream...');
                const subscribePayload = '{ "query": "mutation { subscribeToHub }" }';
                await result.application.query(subscribePayload);
                console.log('✅ Subscribed to hub event stream');
            } catch (subErr) {
                // Subscription might fail if already subscribed or on hub chain
                console.warn('Hub subscription note:', subErr.message);
            }

            return result;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            setConnectionError(error.message);
            setIsConnecting(false);
            throw error;
        }
    }, [isConnecting, faucetUrl, applicationId]);

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
        setFrontend(null);
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

    // Import wallet from mnemonic
    const importWallet = useCallback(async (mnemonic) => {
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
            throw new Error('Invalid mnemonic: must be 12 or 24 words');
        }

        // Clear existing data
        await dbDelete('accounts');
        await dbDelete('activeAccountIndex');

        return connect(mnemonic);
    }, [connect]);

    // Export mnemonic (for backup)
    const exportMnemonic = useCallback(async () => {
        const mnemonic = await dbGet('mnemonic');
        if (!mnemonic) throw new Error('No wallet to export');
        return mnemonic;
    }, []);

    // Auto-reconnect on mount
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const autoConnect = async () => {
            try {
                const savedMnemonic = await dbGet('mnemonic');
                if (savedMnemonic) {
                    console.log('Auto-connecting with saved mnemonic...');
                    await connect(savedMnemonic);
                }
            } catch (error) {
                console.log('Auto-connect failed:', error.message);
            }
        };

        autoConnect();
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
            return () => {};
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
        frontend,
        application,
        signer,

        // Wallet data
        chainId,
        owner,
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
        importWallet,
        exportMnemonic,
        request,
        transfer,
        onNotification,        // Subscribe to blockchain notifications
        triggerNotification,   // Manually trigger notification callbacks

        // Config
        appId: applicationId,
        userChainId: chainId, // Full chain ID for use in components
        shortOwner: owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : null,
        shortChainId: chainId ? `${chainId.slice(0, 8)}...` : null,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletProvider;
