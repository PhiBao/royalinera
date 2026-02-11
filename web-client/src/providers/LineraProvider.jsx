import React, { createContext, useContext, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useConfirmTransaction } from '../components/TransactionConfirmation';
import toast from 'react-hot-toast';

/**
 * LineraProvider — blockchain I/O via @linera/client v0.15.8 SDK.
 *
 * query()    → application.query() on the USER's chain (local state)
 * mutate()   → application.query() with retry (writes → forwarded to hub)
 * hubQuery() → HTTP fetch to the node-service endpoint for the HUB chain.
 *              Falls back to local query() when no hub URL is configured.
 *
 * This solves the "other users can't see marketplace data" problem:
 * queries for events/listings/tickets go directly to the hub chain's
 * state via a public linera-service node, not the user's local chain.
 */

const LineraContext = createContext(null);

export function useLinera() {
    const ctx = useContext(LineraContext);
    if (!ctx) throw new Error('useLinera must be used within a LineraProvider');
    return ctx;
}

// Build the SDK's custom JSON payload string
function formatPayload(gql, variables = {}) {
    const q = gql.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
    return Object.keys(variables).length
        ? `{ "query": "${q}", "variables": ${JSON.stringify(variables)} }`
        : `{ "query": "${q}" }`;
}

// ── Hub endpoint config ──────────────────────────────────────────────
// In dev mode: always use /api/hub proxy (avoids CORS with localhost linera-service).
// In production: use VITE_HUB_PUBLIC_URL for a CORS-enabled endpoint,
//                or /api/hub if Express proxy is co-located.
const HUB_NODE_URL   = import.meta.env.VITE_HUB_NODE_URL || '';
const HUB_PUBLIC_URL = import.meta.env.VITE_HUB_PUBLIC_URL || ''; // direct CORS-enabled URL
const HUB_CHAIN_ID   = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || '';
const HUB_APP_ID     = import.meta.env.VITE_LINERA_APPLICATION_ID || '';

function getHubEndpoint() {
    // Production: direct CORS-enabled public endpoint (e.g. behind Nginx)
    if (HUB_PUBLIC_URL && HUB_CHAIN_ID && HUB_APP_ID) {
        return `${HUB_PUBLIC_URL}/chains/${HUB_CHAIN_ID}/applications/${HUB_APP_ID}`;
    }
    // Dev mode: always proxy through Express server.js → linera-service
    // server.js reads VITE_HUB_NODE_URL server-side, no CORS needed.
    return '/api/hub';
}

export function LineraProvider({ children }) {
    const { application, isConnected, chainId: userChainId, owner: userAddress, notificationCount } = useWallet();
    const { requestConfirmation } = useConfirmTransaction();

    // ── query(): read local chain state via SDK ──────────────────────
    const query = useCallback(async (graphqlQuery, variables = {}) => {
        if (!application) {
            console.log('[Linera] query skipped — not connected');
            return null;
        }
        const payload = formatPayload(graphqlQuery, variables);
        console.log('[Linera] query →', graphqlQuery.substring(0, 80));

        const raw = await application.query(payload);
        const json = JSON.parse(raw);

        if (json.errors?.length) {
            const msg = json.errors.map(e => e.message).join(', ');
            console.error('[Linera] query error:', msg);
            throw new Error(msg);
        }
        return json.data;
    }, [application]);

    // ── hubQuery(): read MARKETPLACE state from the hub chain ────────
    // Sends a standard GraphQL POST to the hub chain's node-service
    // (or /api/hub proxy). This bypasses the SDK and cross-chain sync,
    // so ALL users see the same authoritative marketplace data.
    const hubQuery = useCallback(async (graphqlQuery, variables = {}) => {
        const endpoint = getHubEndpoint();
        const body = {
            query: graphqlQuery.replace(/\s+/g, ' ').trim(),
            ...(Object.keys(variables).length ? { variables } : {}),
        };

        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!resp.ok) {
                // Hub proxy not configured or node down — fall back to local
                console.warn('[Linera] hubQuery HTTP', resp.status, '— falling back to SDK');
                return query(graphqlQuery, variables);
            }

            const json = await resp.json();
            if (json.errors?.length) {
                const msg = json.errors.map(e => e.message).join(', ');
                // If it's a "not configured" error, fall back silently
                if (msg.includes('not configured') || msg.includes('Hub unreachable')) {
                    console.warn('[Linera] hubQuery:', msg, '— falling back to SDK');
                    return query(graphqlQuery, variables);
                }
                console.error('[Linera] hubQuery error:', msg);
                throw new Error(msg);
            }
            return json.data;
        } catch (err) {
            // Network error — fall back to local SDK query
            console.warn('[Linera] hubQuery failed:', err.message, '— falling back to SDK');
            return query(graphqlQuery, variables);
        }
    }, [query]);

    // ── mutate(): write via SDK (auto-forwarded to hub) ──────────────
    // Shows confirmation modal before executing.
    // Signing is handled silently by the autosigner after initial setup.
    const mutate = useCallback(async (graphqlMutation, variables = {}, opts = {}) => {
        const { maxRetries = 6, delay = 4000, showToast = true, skipConfirm = false } = opts;

        if (!application) {
            throw new Error('Not connected. Please connect your wallet first.');
        }

        // Show confirmation modal (unless skipped for internal ops)
        if (!skipConfirm) {
            try {
                await requestConfirmation({
                    mutation: graphqlMutation,
                    variables,
                });
            } catch (err) {
                // User cancelled
                toast.error('Transaction cancelled');
                throw err;
            }
        }

        const tid = showToast ? toast.loading('Sending to blockchain…') : null;
        const payload = formatPayload(graphqlMutation, variables);
        console.log('[Linera] mutate →', graphqlMutation.substring(0, 80));

        let lastError = null;
        for (let i = 1; i <= maxRetries; i++) {
            try {
                if (tid) toast.loading(`Sending to validators (${i}/${maxRetries})…`, { id: tid });

                const raw = await Promise.race([
                    application.query(payload),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Validator timeout')), 45000)
                    ),
                ]);
                const json = JSON.parse(raw);

                if (json.errors?.length) {
                    const msg = json.errors.map(e => e.message).join(', ');
                    console.warn(`[Linera] mutate attempt ${i}:`, msg);
                    if (canRetry(msg) && i < maxRetries) {
                        if (tid) toast.loading(`Validator issue, retry ${i}/${maxRetries}…`, { id: tid });
                        await sleep(delay);
                        continue;
                    }
                    if (tid) toast.error(`Failed: ${msg}`, { id: tid });
                    throw new Error(msg);
                }

                if (tid) toast.success('Transaction submitted', { id: tid });
                await sleep(2000);
                return json.data;
            } catch (err) {
                lastError = err;
                console.warn(`[Linera] mutate attempt ${i}:`, err.message);
                if (canRetry(err.message) && i < maxRetries) {
                    if (tid) toast.loading(`Network issue, retry ${i}/${maxRetries}…`, { id: tid });
                    await sleep(delay);
                    continue;
                }
                if (i >= maxRetries || !canRetry(err.message)) {
                    if (tid) toast.error(`Failed: ${err.message}`, { id: tid });
                    throw err;
                }
            }
        }
        if (tid) toast.error('Max retries reached', { id: tid });
        throw lastError || new Error('Max retries reached');
    }, [application, userAddress, requestConfirmation]);

    const value = {
        isConnected,
        userChainId,
        userAddress,
        application,
        query,
        hubQuery,
        mutate,
        notificationCount,
    };

    return (
        <LineraContext.Provider value={value}>
            {children}
        </LineraContext.Provider>
    );
}

function canRetry(msg = '') {
    return /timestamp|future|quorum|malformed|timeout|CORS|ERR_FAILED|ERR_SSL|Gateway|fetch|net::|connection|unavailable|dns error|Failed to fetch|Validator timeout|confirmed_log/i.test(msg);
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default LineraProvider;
