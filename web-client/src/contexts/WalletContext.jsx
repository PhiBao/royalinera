import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/**
 * WalletContext — @linera/client v0.15.8 (Conway testnet).
 *
 * MetaMask flow:
 *   1. MetaMask verifies the user is connected (no signing).
 *   2. An autosigner (PrivateKey from persisted mnemonic) is used as the
 *      sole signer and chain owner → all operations sign silently.
 *   3. Zero MetaMask popups during normal operation.
 *
 * Local flow:
 *   1. PrivateKey from mnemonic = signs everything silently.
 */

const FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const APP_ID = import.meta.env.VITE_LINERA_APPLICATION_ID || '';
const MARKETPLACE_CHAIN_ID = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || '';

// Sanitize balance: guard against Infinity, NaN, huge raw values
function sanitizeBalance(raw) {
    if (raw == null) return '0';
    const s = raw.toString();
    const n = parseFloat(s);
    if (!isFinite(n) || isNaN(n)) return '0';
    if (n < 0) return '0';
    return n.toFixed(4);
}

const WalletContext = createContext(null);

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error('useWallet must be used within a WalletProvider');
    return context;
};

// ── MetaMask Signer (matches @linera/metamask exactly) ───────────────
// Implements the Signer interface: sign(owner, value) + containsKey(owner).
// Each sign() call triggers MetaMask's personal_sign popup.
class MetaMaskSigner {
    constructor(provider) {
        this.provider = provider;
    }

    async sign(owner, value) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const connected = accounts?.find(a => a.toLowerCase() === owner.toLowerCase());
        if (!connected) throw new Error(`MetaMask not connected with owner: ${owner}`);

        const msgHex = '0x' + Array.from(new Uint8Array(value))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [msgHex, owner],
        });
        if (!signature) throw new Error('Signature rejected');
        return signature;
    }

    async containsKey(owner) {
        const accounts = await this.provider.send('eth_requestAccounts', []);
        return accounts.some(a => a.toLowerCase() === owner.toLowerCase());
    }

    async address() {
        const signer = await this.provider.getSigner();
        return await signer.getAddress();
    }
}

export const WalletProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);

    const [owner, setOwner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [balance, setBalance] = useState(null);
    const [client, setClient] = useState(null);
    const [chain, setChain] = useState(null);
    const [application, setApplication] = useState(null);
    const [walletType, setWalletType] = useState(null); // 'metamask' | 'local'

    const [notificationCount, setNotificationCount] = useState(0);
    const notifDebounceRef = useRef(null);

    const initRef = useRef(false);
    const clientRef = useRef(null);

    const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum;

    const shortOwner = owner ? `${owner.slice(0, 8)}...${owner.slice(-6)}` : null;
    const shortChainId = chainId ? `${chainId.slice(0, 8)}...${chainId.slice(-6)}` : null;

    // ── Core connect logic (shared by MetaMask & local) ──────────────
    const setupClient = async (signer, ownerAddr, opts = {}) => {
        const linera = await import('@linera/client');

        console.log('[Wallet] Faucet:', FAUCET_URL);
        const faucet = new linera.Faucet(FAUCET_URL);
        const lineraWallet = await faucet.createWallet();
        const claimedChainId = await faucet.claimChain(lineraWallet, ownerAddr);
        console.log('[Wallet] Chain claimed:', claimedChainId);

        // DO NOT call setOwner here — chain is owned by ownerAddr (MetaMask).
        // setOwner must happen AFTER addOwner succeeds, otherwise the client
        // tries to sign with autosigner that isn't registered yet → error.

        const clientInstance = await new linera.Client(lineraWallet, signer, {
            skipProcessInbox: false,
        });
        console.log('[Wallet] Client created');

        const chainHandle = await clientInstance.chain(claimedChainId);
        console.log('[Wallet] Chain handle ready');

        // If the signer is a PrivateKey, ensure the wallet uses it as default.
        // (No addOwner needed — the chain is already owned by this address.)
        if (typeof signer.address === 'function') {
            try {
                lineraWallet.setOwner(claimedChainId, signer.address());
                console.log('[Wallet] Owner set to signer address (silent signing)');
            } catch (err) {
                console.warn('[Wallet] setOwner (non-fatal):', err.message);
            }
        }

        let app = null;
        if (APP_ID) {
            try {
                app = await chainHandle.application(APP_ID);
                console.log('[Wallet] App handle:', APP_ID.slice(0, 16) + '...');
                try {
                    await Promise.race([
                        app.query('{ "query": "mutation { subscribeToHub }" }'),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
                    ]);
                    console.log('[Wallet] Hub subscription done');
                } catch (subErr) {
                    console.warn('[Wallet] Hub sub (non-fatal):', subErr.message);
                }
            } catch (err) {
                console.warn('[Wallet] App handle failed:', err.message);
            }
        }

        try {
            chainHandle.onNotification(() => {
                if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
                notifDebounceRef.current = setTimeout(() => {
                    console.log('[Wallet] Notification (debounced)');
                    setNotificationCount(c => c + 1);
                }, 2000);
            });
        } catch (notifErr) {
            console.warn('[Wallet] onNotification (non-fatal):', notifErr.message);
        }

        let bal = '0';
        try {
            const rawBal = await chainHandle.balance();
            bal = sanitizeBalance(rawBal);
        } catch (err) {
            console.warn('[Wallet] Balance failed:', err.message);
        }

        localStorage.setItem('linera_chain_id', claimedChainId);
        localStorage.setItem('linera_owner', ownerAddr);

        setOwner(ownerAddr);
        setChainId(claimedChainId);
        setBalance(bal);
        setClient(clientInstance);
        setChain(chainHandle);
        setApplication(app);
        setIsConnected(true);
        clientRef.current = clientInstance;

        console.log('[Wallet] Connected — chain:', claimedChainId);
        return { owner: ownerAddr, chainId: claimedChainId };
    };

    // ── MetaMask connect ──────────────────────────────────────────────
    // MetaMask is used ONLY to verify the user has a wallet. All chain
    // signing is done by a persisted autosigner (PrivateKey) — zero
    // MetaMask popups during normal operation.
    const doConnectMetaMask = async () => {
        if (!window.ethereum) throw new Error('MetaMask is not installed');

        const { ethers } = await import('ethers');
        const linera = await import('@linera/client');

        // 1. Verify MetaMask is connected (no signing, just identity check)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (!accounts?.length) throw new Error('No MetaMask accounts');
        console.log('[Wallet] MetaMask connected:', accounts[0]);
        localStorage.setItem('linera_mm_address', accounts[0]);

        // 2. Get or create persisted autosigner (signs everything silently)
        const PrivateKey = linera.signer.PrivateKey;
        let autosigner;
        const savedMnemonic = localStorage.getItem('linera_autosigner_mnemonic');
        if (savedMnemonic) {
            autosigner = PrivateKey.fromMnemonic(savedMnemonic);
            console.log('[Wallet] Restored autosigner:', autosigner.address());
        } else {
            const randomWallet = ethers.Wallet.createRandom();
            const mnemonic = randomWallet.mnemonic.phrase;
            autosigner = PrivateKey.fromMnemonic(mnemonic);
            localStorage.setItem('linera_autosigner_mnemonic', mnemonic);
            console.log('[Wallet] New autosigner:', autosigner.address());
        }

        localStorage.setItem('linera_wallet_type', 'metamask');
        setWalletType('metamask');

        // 3. Use autosigner as sole signer — chain owned by autosigner,
        //    all operations sign silently (no MetaMask popups).
        return setupClient(autosigner, autosigner.address());
    };

    // ── Local wallet connect ─────────────────────────────────────────
    const doConnectLocal = async (existingMnemonic = null) => {
        const linera = await import('@linera/client');
        const { ethers } = await import('ethers');

        let mnemonic = existingMnemonic;
        if (!mnemonic) {
            const generated = ethers.Wallet.createRandom();
            mnemonic = generated.mnemonic.phrase;
        }

        const PrivateKey = linera.signer.PrivateKey;
        const sk = PrivateKey.fromMnemonic(mnemonic);
        const ownerAddr = sk.address();
        console.log('[Wallet] Local owner:', ownerAddr);

        localStorage.setItem('linera_mnemonic', mnemonic);
        localStorage.setItem('linera_wallet_type', 'local');
        setWalletType('local');

        return setupClient(sk, ownerAddr);
    };

    // ── WASM init + auto-restore ─────────────────────────────────────
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        (async () => {
            try {
                const linera = await import('@linera/client');
                const initFn = linera.initialize || linera.default;
                await initFn({ module_or_path: '/wasm/index_bg.wasm' });
                setIsInitialized(true);
                console.log('[Wallet] WASM initialized');

                const savedType = localStorage.getItem('linera_wallet_type');
                if (savedType) {
                    console.log('[Wallet] Restoring session (' + savedType + ')...');
                    setIsConnecting(true);
                    try {
                        if (savedType === 'metamask' && window.ethereum) {
                            await doConnectMetaMask();
                        } else if (savedType === 'local') {
                            const m = localStorage.getItem('linera_mnemonic');
                            if (m) await doConnectLocal(m);
                        }
                    } catch (err) {
                        console.warn('[Wallet] Restore failed:', err.message);
                        localStorage.removeItem('linera_wallet_type');
                        localStorage.removeItem('linera_mnemonic');
                        localStorage.removeItem('linera_chain_id');
                        localStorage.removeItem('linera_owner');
                        localStorage.removeItem('linera_mm_address');
                        localStorage.removeItem('linera_autosigner_mnemonic');
                    } finally {
                        setIsConnecting(false);
                    }
                }
            } catch (err) {
                console.error('[Wallet] WASM init failed:', err);
                setIsInitialized(true);
            }
        })();
    }, []);

    // ── Public connect (called from WalletModal) ─────────────────────
    const connect = useCallback(async (type = 'local') => {
        if (isConnecting) return;
        setIsConnecting(true);
        setConnectionError(null);
        try {
            const result = type === 'metamask'
                ? await doConnectMetaMask()
                : await doConnectLocal(null);
            setShowWalletModal(false);
            return result;
        } catch (err) {
            console.error('[Wallet] Connect failed:', err);
            setConnectionError(err.message);
            throw err;
        } finally {
            setIsConnecting(false);
        }
    }, [isConnecting]);

    const disconnect = useCallback(async () => {
        if (clientRef.current) {
            try { clientRef.current.free(); } catch (e) {}
        }
        localStorage.removeItem('linera_mnemonic');
        localStorage.removeItem('linera_wallet_type');
        localStorage.removeItem('linera_chain_id');
        localStorage.removeItem('linera_owner');
        localStorage.removeItem('linera_mm_address');
        localStorage.removeItem('linera_autosigner_mnemonic');
        setOwner(null);
        setChainId(null);
        setBalance(null);
        setClient(null);
        setChain(null);
        setApplication(null);
        setIsConnected(false);
        setWalletType(null);
        clientRef.current = null;
        if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
        console.log('[Wallet] Disconnected');
    }, []);

    // ── Periodic balance refresh ─────────────────────────────────────
    useEffect(() => {
        if (!isConnected || !chain) return;
        const refresh = async () => {
            try {
                const rawBal = await chain.balance();
                setBalance(sanitizeBalance(rawBal));
            } catch (err) { /* silence */ }
        };
        const interval = setInterval(refresh, 15000);
        return () => clearInterval(interval);
    }, [isConnected, chain]);

    const value = {
        isConnected, isConnecting, connectionError, isInitialized,
        lineraInitialized: isInitialized, hasFaucet: !!FAUCET_URL,
        showWalletModal, setShowWalletModal,
        openWalletModal: () => setShowWalletModal(true),
        closeWalletModal: () => setShowWalletModal(false),
        owner, lineraOwner: owner, address: owner,
        chainId, userChainId: chainId, balance,
        shortOwner, shortAddress: shortOwner, shortChainId,
        client, chain, application,
        walletType, hasMetaMask,
        notificationCount,
        connect, disconnect,
        appId: APP_ID, hubChainId: MARKETPLACE_CHAIN_ID,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletProvider;
