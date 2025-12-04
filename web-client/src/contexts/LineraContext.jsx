import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '@linera/client';


const LineraContext = createContext(null);

export const useLinera = () => {
    const context = useContext(LineraContext);
    if (!context) {
        throw new Error('useLinera must be used within a LineraProvider');
    }
    return context;
};

export const LineraProvider = ({ children }) => {
    const [client, setClient] = useState(null);
    const [chainId, setChainId] = useState(import.meta.env.VITE_CHAIN_ID || '');
    const [appId, setAppId] = useState(import.meta.env.VITE_APP_ID || '');
    const [owner, setOwner] = useState(import.meta.env.VITE_OWNER_ID || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                // In a real decentralized app, we might connect to a wallet extension here.
                // For this demo/dev environment, we'll assume a local service or direct connection.
                // If using the Linera Web Client with a backend service:
                const serviceUrl = import.meta.env.VITE_SERVICE_URL || 'http://localhost:8080';

                // We don't strictly need to instantiate a full Client if we are just doing GraphQL over HTTP
                // but @linera/client provides nice utilities.
                // For now, let's manage the state manually as the "Client" class in the SDK 
                // might be more for WASM/Service Worker setups.
                // We will use a simple fetch wrapper for GraphQL.

                setLoading(false);
            } catch (err) {
                console.error("Failed to init Linera:", err);
                setError(err.message);
                setLoading(false);
            }
        };
        init();
    }, []);

    const graphQLRequest = async (query, variables = {}) => {
        if (!chainId || !appId) throw new Error("Chain ID and App ID are required");

        // Construct URL: service_url/chains/{chainId}/applications/{appId}
        const serviceUrl = import.meta.env.VITE_SERVICE_URL || 'http://localhost:8080';
        let endpoint = serviceUrl;

        // Handle different URL formats (direct app URL vs base service URL)
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
        chainId,
        setChainId,
        appId,
        setAppId,
        owner,
        setOwner,
        loading,
        error,
        request: graphQLRequest,
    };

    return (
        <LineraContext.Provider value={value}>
            {children}
        </LineraContext.Provider>
    );
};
