import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';

// Context for Linera blockchain operations
const LineraContext = createContext(null);

export function useLinera() {
  const context = useContext(LineraContext);
  if (!context) {
    throw new Error('useLinera must be used within a LineraProvider');
  }
  return context;
}

/**
 * LineraProvider - Direct blockchain interaction without proxy
 * 
 * Uses @linera/client SDK to:
 * - Query the blockchain directly
 * - Execute mutations with wallet signing
 * - All operations go through Conway testnet validators
 */
export function LineraProvider({ children }) {
  const { 
    application, 
    isConnected, 
    chainId: userChainId,
    owner: userAddress,
    lineraOwner,
    hasFaucet,
  } = useWallet();
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // In lightweight mode, we're ready as soon as connected
    // (application is null because we don't create Client on connect)
    setIsReady(isConnected);
  }, [isConnected]);

  /**
   * Execute a GraphQL query on the HUB chain (marketplace chain)
   * This is needed for queries that need hub data (tickets, listings, events)
   * Uses /api/hub proxy which connects to the linera service at port 8080
   * 
   * NOTE: We use the 8080 proxy because direct Client connection to validators
   * can timeout during high load. The local linera service handles retries better.
   */
  const queryHub = useCallback(async (graphqlQuery, variables = {}) => {
    console.log('[Linera] Hub chain query (via 8080 proxy)');
    console.log('[Linera] Query:', graphqlQuery.substring(0, 100) + '...');
    
    const body = {
      query: graphqlQuery,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
    };

    try {
      const res = await fetch('/api/hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        throw new Error(`Hub query failed: ${res.status}`);
      }
      
      const json = await res.json();
      
      if (json.error) {
        // Backend returned an error (e.g., linera service not running)
        throw new Error(json.message || json.error);
      }
      
      if (json.errors && json.errors.length > 0) {
        const errorMsg = json.errors.map(e => e.message).join(', ');
        console.error('[Linera] Hub query error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      return json.data;
    } catch (err) {
      console.warn('[Linera] Hub proxy query failed:', err.message);
      throw new Error(`Hub query failed: ${err.message}. Make sure 'linera service --port 8080' is running.`);
    }
  }, []);

  /**
   * Execute a GraphQL query directly on the blockchain
   * Uses @linera/client Application.query() - goes to validators directly
   * 
   * NOTE: This requires the application object which is only available
   * if Client was created. In lightweight mode, falls back to queryHub.
   */
  const query = useCallback(async (graphqlQuery, variables = {}) => {
    if (!application) {
      // In lightweight mode, fall back to queryHub
      console.log('[Linera] No application - using queryHub fallback');
      return queryHub(graphqlQuery, variables);
    }

    console.log('[Linera] Direct blockchain query');
    console.log('[Linera] Query:', graphqlQuery.substring(0, 100) + '...');
    
    // Format query for @linera/client
    const cleanQuery = graphqlQuery.replace(/\s+/g, ' ').trim();
    const escapedQuery = cleanQuery.replace(/"/g, '\\"');
    
    let payload;
    if (Object.keys(variables).length > 0) {
      payload = `{ "query": "${escapedQuery}", "variables": ${JSON.stringify(variables)} }`;
    } else {
      payload = `{ "query": "${escapedQuery}" }`;
    }

    console.log('[Linera] Sending to blockchain via @linera/client...');
    const responseStr = await application.query(payload);
    console.log('[Linera] Blockchain response received');
    
    const json = JSON.parse(responseStr);
    
    if (json.errors && json.errors.length > 0) {
      const errorMsg = json.errors.map(e => e.message).join(', ');
      console.error('[Linera] Query error:', errorMsg);
      throw new Error(errorMsg);
    }
    
    return json.data;
  }, [application, queryHub]);

  /**
   * Execute a GraphQL mutation via 8080 backend
   * 
   * UPDATED: Mutations now go through the linera service at port 8080
   * This avoids the need to create a Client (which connects to validators and can timeout)
   * The linera service handles signing and retry logic internally
   * 
   * NOTE: User must have linera service running with their wallet
   */
  const mutate = useCallback(async (graphqlMutation, variables = {}, options = {}) => {
    const { maxRetries = 5, delay = 3000, showToast = true } = options;
    const toastId = showToast ? toast.loading('Sending to blockchain...') : null;

    console.log('[Linera] Mutation via 8080 backend');
    console.log('[Linera] Mutation:', graphqlMutation.substring(0, 100) + '...');
    console.log('[Linera] Variables:', variables);
    
    const body = {
      query: graphqlMutation,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
    };

    // Retry loop for testnet timestamp issues
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Linera] Attempt ${attempt}/${maxRetries} - sending via 8080...`);
        
        const res = await fetch('/api/hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (!res.ok) {
          throw new Error(`Mutation failed: HTTP ${res.status}`);
        }
        
        const json = await res.json();
        
        if (json.error) {
          throw new Error(json.message || json.error);
        }
        
        if (json.errors && json.errors.length > 0) {
          const errorMsg = json.errors.map(e => e.message).join(', ');
          const isRetryable = errorMsg.includes('timestamp') || 
                             errorMsg.includes('future') || 
                             errorMsg.includes('quorum') ||
                             errorMsg.includes('malformed');
          
          if (isRetryable && attempt < maxRetries) {
            if (toastId) toast.loading(`Validator sync... retry ${attempt}/${maxRetries}`, { id: toastId });
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          
          if (toastId) toast.error(`Failed: ${errorMsg}`, { id: toastId });
          throw new Error(errorMsg);
        }
        
        if (toastId) toast.success('Transaction confirmed!', { id: toastId });
        return json.data;
        
      } catch (err) {
        const errorMsg = err.message || 'Unknown error';
        const isRetryable = errorMsg.includes('timestamp') || 
                           errorMsg.includes('future') || 
                           errorMsg.includes('quorum') ||
                           errorMsg.includes('malformed') ||
                           errorMsg.includes('timeout');
        
        if (isRetryable && attempt < maxRetries) {
          if (toastId) toast.loading(`Retry ${attempt}/${maxRetries}...`, { id: toastId });
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        if (toastId) toast.error(`Failed: ${errorMsg}`, { id: toastId });
        throw err;
      }
    }
  }, []);

  /**
   * Hook-like function for queries with loading state
   */
  const useBlockchainQuery = useCallback((queryStr, variables = {}, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
      if (!application) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await query(queryStr, variables);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }, [queryStr, JSON.stringify(variables)]);

    useEffect(() => {
      refetch();
    }, [refetch, isReady]);

    return { data, loading, error, refetch };
  }, [application, query, isReady]);

  const value = {
    // Connection state
    isReady,
    isConnected,
    userChainId,
    userAddress,
    lineraOwner,
    hasFaucet,
    
    // Direct blockchain operations
    query,       // Query user's chain (for local state)
    queryHub,    // Query hub chain (for tickets, listings, events)
    mutate,      // Mutations go through user's chain
    
    // Helper hook
    useBlockchainQuery,
    
    // The raw application object for advanced use
    application,
  };

  return (
    <LineraContext.Provider value={value}>
      {children}
    </LineraContext.Provider>
  );
}

export default LineraProvider;
