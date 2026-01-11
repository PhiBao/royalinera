import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client/core';
import { ApolloProvider } from '@apollo/client/react';
import React, { createContext, useContext, useMemo } from 'react';

// Configuration from environment
const HUB_CHAIN_ID = import.meta.env.VITE_MARKETPLACE_CHAIN_ID || 'a6f2e101a65522962a5cc4a422202e3374f9d11215258c88e7496bdaadde9635';
const APP_ID = import.meta.env.VITE_LINERA_APPLICATION_ID || 'ad184ec9fe226812c377847c68f470f1ca39a80cc755db32c67fef142f13097a';

// Context for clients
const GraphQLContext = createContext(null);

export function useGraphQL() {
  const context = useContext(GraphQLContext);
  if (!context) {
    throw new Error('useGraphQL must be used within a GraphQLProvider');
  }
  return context;
}

/**
 * Creates an Apollo Client for a specific chain and application
 */
function createAppClient(chainId, applicationId) {
  // HTTP link for queries and mutations
  // Goes through our proxy -> linera service
  const httpLink = new HttpLink({
    uri: `/api/chains/${chainId}/applications/${applicationId}`,
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

/**
 * Creates an Apollo Client for the node service (chain-level operations)
 */
function createNodeClient() {
  const httpLink = new HttpLink({
    uri: `/api/node`,
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

/**
 * GraphQL Provider component
 * Provides access to:
 * - hubClient: For querying the hub/marketplace chain (shared events, listings)
 * - nodeClient: For node-level operations
 * - getChainClient: Function to get a client for any chain
 */
/**
 * Creates an Apollo Client specifically for the hub chain
 */
function createHubClient() {
  // Use direct URL if VITE_HUB_APP_URL is set (production), otherwise use local proxy
  const hubUrl = import.meta.env.VITE_HUB_APP_URL || '/api/hub';
  console.log('[GraphQL] Hub URL:', hubUrl);
  
  // HTTP link goes directly to hub URL
  const httpLink = new HttpLink({
    uri: hubUrl,
    headers: {
      'ngrok-skip-browser-warning': '69420', // Skip ngrok interstitial page
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

export function GraphQLProvider({ children }) {
  const clients = useMemo(() => {
    // Client for the hub/marketplace chain - uses /api/hub
    const hubClient = createHubClient();
    
    // Client for node-level operations
    const nodeClient = createNodeClient();
    
    // Cache for chain-specific clients
    const chainClients = new Map();
    
    // Function to get or create a client for a specific chain
    const getChainClient = (chainId) => {
      const key = `${chainId}:${APP_ID}`;
      if (!chainClients.has(key)) {
        chainClients.set(key, createAppClient(chainId, APP_ID));
      }
      return chainClients.get(key);
    };
    
    return {
      hubClient,
      nodeClient,
      getChainClient,
      hubChainId: HUB_CHAIN_ID,
      appId: APP_ID,
    };
  }, []);

  return (
    <GraphQLContext.Provider value={clients}>
      <ApolloProvider client={clients.hubClient}>
        {children}
      </ApolloProvider>
    </GraphQLContext.Provider>
  );
}

export default GraphQLProvider;

// Re-export gql for convenience (other hooks imported directly in components)
export { gql };
