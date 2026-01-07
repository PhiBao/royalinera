import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';

const LineraContext = createContext(null);

export const useLinera = () => {
    const context = useContext(LineraContext);
    if (!context) {
        throw new Error('useLinera must be used within a LineraProvider');
    }
    return context;
};

// Conway Testnet Faucet URL
const CONWAY_FAUCET_URL = 'https://faucet.testnet-conway.linera.net/';

export const LineraProvider = ({ children }) => {
    const [client, setClient] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [chainId, setChainId] = useState(import.meta.env.VITE_CHAIN_ID || '');
    const [appId, setAppId] = useState(import.meta.env.VITE_APP_ID || '');
    const [owner, setOwner] = useState(import.meta.env.VITE_OWNER_ID || null);
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const init = async () => {
            try {
                // Initialize Linera WASM module
                await linera.default();

                const applicationId = import.meta.env.VITE_APP_ID;
                if (!applicationId) {
                    throw new Error('VITE_APP_ID is required');
                }

                // Check for existing mnemonic or generate new one
                let mnemonic = localStorage.getItem('linera_mnemonic');
                let privateKey;

                if (!mnemonic) {
                    // Generate new wallet - this creates a real connection to Conway!
                    const { ethers } = await import('ethers');
                    const generated = ethers.Wallet.createRandom();
                    mnemonic = generated.mnemonic?.phrase;
                    if (!mnemonic) throw new Error('Failed to generate mnemonic');
                    localStorage.setItem('linera_mnemonic', mnemonic);
                }

                // Create signer from mnemonic
                privateKey = PrivateKey.fromMnemonic(mnemonic);
                const ownerAddress = privateKey.address();
                setOwner(ownerAddress);

                // Connect to Conway Faucet and claim chain
                const faucet = new linera.Faucet(CONWAY_FAUCET_URL);
                const newWallet = await faucet.createWallet();
                const newChainId = await faucet.claimChain(newWallet, ownerAddress);
                
                setWallet(newWallet);
                setChainId(newChainId);

                // Create Linera client
                const clientInstance = new linera.Client(newWallet, privateKey, false);
                setClient(clientInstance);

                // Get application frontend
                const app = await clientInstance.frontend().application(applicationId);
                setApplication(app);
                setAppId(applicationId);

                console.log('✅ Connected to Conway Testnet');
                console.log('   Chain ID:', newChainId);
                console.log('   Owner:', ownerAddress);
                console.log('   App ID:', applicationId);

                setLoading(false);
            } catch (err) {
                console.error("Failed to init Linera:", err);
                // Fallback to env-based config for development
                const serviceUrl = import.meta.env.VITE_SERVICE_URL;
                if (serviceUrl) {
                    console.log('⚠️ Falling back to direct service URL');
                    setLoading(false);
                } else {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };
        init();
    }, []);

    const graphQLRequest = async (query, variables = {}) => {
        // If we have a proper application instance, use it
        if (application) {
            try {
                const result = await application.query(query, variables);
                return result;
            } catch (err) {
                console.error('GraphQL via application failed:', err);
            }
        }

        // Fallback to direct HTTP for development
        if (!chainId || !appId) throw new Error("Chain ID and App ID are required");

        const serviceUrl = import.meta.env.VITE_SERVICE_URL || 'http://localhost:8080';
        let endpoint = serviceUrl;

        if (!serviceUrl.includes('/applications/')) {
            endpoint = `${serviceUrl}/chains/${chainId}/applications/${appId}`;
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });

        const json = await res.json();
        if (json.errors) {
            throw new Error(json.errors.map(e => e.message).join(', '));
        }
        return json.data;
    };

    const value = {
        client,
        wallet,
        chainId,
        setChainId,
        appId,
        setAppId,
        owner,
        setOwner,
        application,
        loading,
        error,
        request: graphQLRequest,
        // Expose connection status
        isConnectedToConway: !!client && !!wallet,
    };

    return (
        <LineraContext.Provider value={value}>
            {children}
        </LineraContext.Provider>
    );
};
