import React, { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { useLinera } from '../providers/LineraProvider';
import { useDebounce } from '../hooks/useDebounce';
import { ShoppingBag, Ticket, DollarSign, Wallet, Loader2, RefreshCw, User, Hash, XCircle, Search, ArrowUpDown, Filter } from 'lucide-react';

// GraphQL queries as plain strings for direct blockchain calls
const GET_LISTINGS_QUERY = `query GetListings { listings }`;

// Hub URL and application ID from environment
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:8080';
const APPLICATION_ID = import.meta.env.VITE_LINERA_APPLICATION_ID;

const GET_TICKET_QUERY = `
  query GetTicket($ticketId: String!) {
    ticket(ticketId: $ticketId) {
      ticketId
      eventId { value }
      eventName
      seat
      ownerChain
      organizerChain
      minterChain
      royaltyBps
      lastSalePrice
    }
  }
`;

const BUY_TICKET_MUTATION = `
  mutation BuyListing($ticketId: String!, $buyer: String!, $price: String!) {
    buyListing(ticketId: $ticketId, buyer: $buyer, price: $price)
  }
`;

const CANCEL_LISTING_MUTATION = `
  mutation CancelListing($ticketId: String!, $seller: String!) {
    cancelListing(ticketId: $ticketId, seller: $seller)
  }
`;

// Styles
const styles = {
    pageHeader: {
        marginBottom: '32px',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(to right, #6366f1, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px',
    },
    subtitle: {
        color: '#a0a0a0',
        fontSize: '1rem',
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
        marginTop: '16px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px',
    },
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
    },
    cardImage: {
        height: '160px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    priceBadge: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#ffffff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    cardContent: {
        padding: '20px',
    },
    cardTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: '8px',
    },
    cardSubtitle: {
        color: '#a0a0a0',
        fontSize: '0.875rem',
        marginBottom: '16px',
    },
    cardMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.75rem',
        color: '#6b7280',
    },
    btn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: 'none',
    },
    btnPrimary: {
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: '#ffffff',
    },
    btnSecondary: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    btnGreen: {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#ffffff',
    },
    btnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    loadingCard: {
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
};

const Marketplace = () => {
    const { isConnected, openWalletModal, chainId: userChainId, owner: userAddress } = useWallet();
    const { query, queryHub, mutate, mutateWithSdk, isReady } = useLinera();

    // Direct blockchain query state
    const [data, setData] = useState(null);
    const [ticketsData, setTicketsData] = useState({}); // Store ticket details by ID
    const [loading, setLoading] = useState(true);

    // Wave 6: Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search
    const [sortBy, setSortBy] = useState('price'); // 'price', 'eventName'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [hideOwnListings, setHideOwnListings] = useState(false);
    
    // Check if any filters are active
    const hasActiveFilters = debouncedSearchQuery || sortBy !== 'price' || sortOrder !== 'asc' || hideOwnListings;
    
    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSortBy('price');
        setSortOrder('asc');
        setHideOwnListings(false);
    };

    // Fetch listings directly from blockchain (works without wallet connection)
    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            console.log('[Marketplace] Fetching listings from hub...');
            
            // Direct fetch to hub with chain ID and application ID
            const MARKETPLACE_CHAIN_ID = import.meta.env.VITE_MARKETPLACE_CHAIN_ID;
            const url = `${HUB_URL}/chains/${MARKETPLACE_CHAIN_ID}/applications/${APPLICATION_ID}`;
            console.log('[Marketplace] Hub URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: GET_LISTINGS_QUERY,
                    variables: {},
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Hub request failed: ${response.status}`);
            }
            
            const json = await response.json();
            console.log('[Marketplace] Hub response:', json);
            
            if (json.errors) {
                throw new Error(json.errors.map(e => e.message).join(', '));
            }
            
            setData(json.data);
            
            // Fetch ticket details for all listings to enable seat search
            if (json.data?.listings) {
                const listingIds = Object.keys(json.data.listings);
                console.log('[Marketplace] Fetching ticket details for', listingIds.length, 'listings...');
                
                const ticketPromises = listingIds.map(async (ticketId) => {
                    try {
                        const ticketResponse = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: GET_TICKET_QUERY,
                                variables: { ticketId },
                            }),
                        });
                        
                        if (ticketResponse.ok) {
                            const ticketJson = await ticketResponse.json();
                            if (!ticketJson.errors && ticketJson.data?.ticket) {
                                return { id: ticketId, ticket: ticketJson.data.ticket };
                            }
                        }
                    } catch (err) {
                        console.error(`[Marketplace] Failed to fetch ticket ${ticketId}:`, err);
                    }
                    return null;
                });
                
                const tickets = await Promise.all(ticketPromises);
                const ticketsMap = {};
                tickets.forEach(item => {
                    if (item) {
                        ticketsMap[item.id] = item.ticket;
                    }
                });
                console.log('[Marketplace] Loaded ticket details for', Object.keys(ticketsMap).length, 'tickets');
                setTicketsData(ticketsMap);
            }
        } catch (err) {
            console.error('[Marketplace] Hub query failed:', err);
            toast.error('Failed to load listings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const listingIds = useMemo(() => {
        if (!data?.listings) {
            console.log('[Marketplace] No listings data:', data);
            return [];
        }
        console.log('[Marketplace] Listings data type:', typeof data.listings);
        console.log('[Marketplace] Listings data:', data.listings);
        
        if (typeof data.listings === 'object' && !Array.isArray(data.listings)) {
            const ids = Object.keys(data.listings);
            console.log('[Marketplace] Listing IDs from object:', ids);
            return ids;
        }
        const ids = Array.isArray(data.listings) ? data.listings : [];
        console.log('[Marketplace] Listing IDs from array:', ids);
        return ids;
    }, [data]);
    
    const listingsMap = useMemo(() => {
        if (!data?.listings || Array.isArray(data.listings)) {
            console.log('[Marketplace] ListingsMap empty (array or no data)');
            return {};
        }
        console.log('[Marketplace] ListingsMap created with keys:', Object.keys(data.listings));
        return data.listings;
    }, [data]);

    // Wave 6: Filter and sort listings
    const filteredListingIds = useMemo(() => {
        console.log('[Marketplace Filter] Starting with', listingIds.length, 'listings');
        let filtered = [...listingIds];
        
        // Hide own listings filter
        if (hideOwnListings && userAddress) {
            const beforeLength = filtered.length;
            filtered = filtered.filter(id => {
                const listing = listingsMap[id];
                if (!listing?.seller) return true;
                return listing.seller.toLowerCase() !== userAddress.toLowerCase();
            });
            console.log('[Marketplace Filter] Hide own listings:', beforeLength, '->', filtered.length);
        }
        
        // Search filter - by event name, seat, or ticket ID - uses debounced value
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            console.log('[Marketplace Filter] Searching for:', query);
            const beforeLength = filtered.length;
            filtered = filtered.filter(id => {
                const listing = listingsMap[id];
                const ticket = ticketsData[id];
                const eventName = (listing?.event_name || listing?.eventName || ticket?.eventName || '').toLowerCase();
                const seat = (ticket?.seat || '').toLowerCase();
                const ticketId = (id || '').toLowerCase();
                const matches = eventName.includes(query) || seat.includes(query) || ticketId.includes(query);
                console.log('[Marketplace Filter] Ticket', id, '- event:', eventName, 'seat:', seat, 'matches:', matches);
                return matches;
            });
            console.log('[Marketplace Filter] After search:', beforeLength, '->', filtered.length);
        }
        
        // Sort listings
        filtered.sort((a, b) => {
            const listingA = listingsMap[a];
            const listingB = listingsMap[b];
            if (!listingA || !listingB) return 0;
            
            let comparison = 0;
            switch (sortBy) {
                case 'price':
                    const priceA = parseFloat(listingA.price) || 0;
                    const priceB = parseFloat(listingB.price) || 0;
                    comparison = priceA - priceB;
                    break;
                case 'eventName':
                    const nameA = listingA.event_name || listingA.eventName || '';
                    const nameB = listingB.event_name || listingB.eventName || '';
                    comparison = nameA.localeCompare(nameB);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
    }, [listingIds, listingsMap, debouncedSearchQuery, sortBy, sortOrder, hideOwnListings, userAddress]);

    if (loading) {
        return (
            <div style={{ ...styles.emptyState, padding: '80px 20px' }}>
                <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#a0a0a0' }}>Loading marketplace...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.title}>Marketplace</h1>
                <p style={styles.subtitle}>Discover and buy verified tickets from other users</p>
                <div style={styles.headerActions}>
                    <button onClick={() => refetch()} style={{ ...styles.btn, ...styles.btnSecondary, width: 'auto' }}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
                
                {/* Wave 6: Search and Filter Bar */}
                <div style={{ 
                    marginTop: '24px', 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '12px', 
                    flexWrap: 'wrap',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search by event name or seat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px 10px 36px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '0.875rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    
                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    
                    {/* Sort Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Sort:</span>
                        <button 
                            onClick={() => {
                                if (sortBy === 'price') {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                    setSortBy('price');
                                    setSortOrder('asc');
                                }
                            }}
                            style={{ 
                                padding: '8px 12px',
                                backgroundColor: sortBy === 'price' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: sortBy === 'price' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: sortBy === 'price' ? '#6366f1' : '#a0a0a0',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <DollarSign size={14} />
                            Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button 
                            onClick={() => {
                                if (sortBy === 'eventName') {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                    setSortBy('eventName');
                                    setSortOrder('asc');
                                }
                            }}
                            style={{ 
                                padding: '8px 12px',
                                backgroundColor: sortBy === 'eventName' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: sortBy === 'eventName' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: sortBy === 'eventName' ? '#6366f1' : '#a0a0a0',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <ArrowUpDown size={14} />
                            Name {sortBy === 'eventName' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                    </div>
                    
                    {/* Hide Own Listings Toggle */}
                    {isConnected && (
                        <>
                            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            <button 
                                onClick={() => setHideOwnListings(!hideOwnListings)}
                                style={{ 
                                    padding: '8px 12px',
                                    backgroundColor: hideOwnListings ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: hideOwnListings ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: hideOwnListings ? '#10b981' : '#a0a0a0',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Filter size={14} />
                                {hideOwnListings ? 'Others Only' : 'Hide Mine'}
                            </button>
                        </>
                    )}
                    
                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <>
                            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            <button
                                onClick={clearFilters}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <XCircle size={14} />
                                Clear
                            </button>
                        </>
                    )}
                </div>
                
                {/* Results count */}
                {(debouncedSearchQuery || hideOwnListings) && (
                    <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#a0a0a0' }}>
                        Showing {filteredListingIds.length} listing{filteredListingIds.length !== 1 ? 's' : ''}
                        {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
                        {hideOwnListings && ' (excluding your listings)'}
                    </div>
                )}
            </div>

            {/* Listings Grid */}
            {filteredListingIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <ShoppingBag size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                        {searchQuery || hideOwnListings ? 'No matching listings' : 'No listings yet'}
                    </h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>
                        {searchQuery ? 'Try adjusting your search' : hideOwnListings ? 'No listings from other users' : 'Be the first to list a ticket for sale!'}
                    </p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredListingIds.map((ticketId) => (
                        <ListingCard
                            key={ticketId}
                            ticketId={ticketId}
                            listing={listingsMap[ticketId]}
                            preloadedTicket={ticketsData[ticketId]}
                            isConnected={isConnected}
                            openWalletModal={openWalletModal}
                            onBought={refetch}
                            userChainId={userChainId}
                            userAddress={userAddress}
                        />
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

// Listing Card Component - uses direct blockchain queries
const ListingCard = ({ ticketId, listing, preloadedTicket, isConnected, openWalletModal, onBought, userChainId, userAddress }) => {
    const { query, mutate, mutateWithSdk, isReady } = useLinera();
    const [buying, setBuying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [ticket, setTicket] = useState(preloadedTicket || null);
    const [ticketLoading, setTicketLoading] = useState(!preloadedTicket);

    // Fetch ticket details from hub if not preloaded
    useEffect(() => {
        if (preloadedTicket) {
            setTicket(preloadedTicket);
            setTicketLoading(false);
            return;
        }
        
        const fetchTicket = async () => {
            try {
                console.log(`[ListingCard] Fetching ticket ${ticketId} from hub...`);
                const MARKETPLACE_CHAIN_ID = import.meta.env.VITE_MARKETPLACE_CHAIN_ID;
                const APPLICATION_ID = import.meta.env.VITE_LINERA_APPLICATION_ID;
                const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:8080';
                const url = `${HUB_URL}/chains/${MARKETPLACE_CHAIN_ID}/applications/${APPLICATION_ID}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GET_TICKET_QUERY,
                        variables: { ticketId },
                    }),
                });
                
                if (response.ok) {
                    const json = await response.json();
                    if (!json.errors) {
                        setTicket(json.data?.ticket);
                    } else {
                        console.error(`[ListingCard] Ticket query errors:`, json.errors);
                    }
                } else {
                    console.error(`[ListingCard] Hub request failed: ${response.status}`);
                }
            } catch (err) {
                console.error(`[ListingCard] Failed to fetch ticket ${ticketId}:`, err);
            } finally {
                setTicketLoading(false);
            }
        };
        
        fetchTicket();
    }, [ticketId, preloadedTicket]);

    const handleBuy = async () => {
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setBuying(true);
        const price = listing?.price || '0';
        
        try {
            console.log('[ListingCard] Buying ticket via direct SDK (MetaMask will popup)...');
            await mutate(BUY_TICKET_MUTATION, { ticketId, buyer: userAddress, price });
            onBought();
        } catch (err) {
            console.error('[ListingCard] Buy failed:', err);
            // Toast already shown by mutateWithSdk
        }
        
        setBuying(false);
    };

    const handleCancel = async () => {
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setCancelling(true);
        
        try {
            console.log('[ListingCard] Cancelling listing via direct SDK (MetaMask will popup)...');
            await mutate(CANCEL_LISTING_MUTATION, { ticketId, seller: userAddress });
            onBought();
        } catch (err) {
            console.error('[ListingCard] Cancel failed:', err);
            // Toast already shown by mutateWithSdk
        }
        
        setCancelling(false);
    };
    
    // Check if user owns this listing by comparing wallet addresses (seller field)
    const isOwnListing = isConnected && listing?.seller && userAddress && 
        listing.seller.toLowerCase() === userAddress.toLowerCase();

    if (ticketLoading) {
        return (
            <div style={styles.loadingCard}>
                <div style={{ height: '160px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <div style={{ padding: '20px' }}>
                    <div style={{ height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '12px' }} />
                    <div style={{ height: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '60%' }} />
                </div>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <div style={styles.cardImage}>
                <Ticket size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
                {listing?.price && (
                    <div style={styles.priceBadge}>
                        <DollarSign size={14} />
                        {listing.price}
                    </div>
                )}
                {isOwnListing && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(99, 102, 241, 0.9)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                    }}>
                        Your Listing
                    </div>
                )}
            </div>
            <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>
                    {ticket?.eventName || listing?.event_name || listing?.eventName || 'Unknown Event'}
                </h3>
                <p style={styles.cardSubtitle}>{ticket?.seat || 'Loading seat info...'}</p>
                
                <div style={styles.cardMeta}>
                    <div style={styles.metaItem}>
                        <Hash size={14} />
                        <span>ID: {ticketId.slice(0, 16)}...</span>
                    </div>
                    {listing?.seller && !isOwnListing && (
                        <div style={styles.metaItem}>
                            <User size={14} />
                            <span>Seller: {listing.seller.slice(0, 10)}...{listing.seller.slice(-4)}</span>
                        </div>
                    )}
                </div>

                {isOwnListing ? (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        style={{
                            ...styles.btn,
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            ...(cancelling ? styles.btnDisabled : {}),
                        }}
                    >
                        {cancelling ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <XCircle size={16} />
                                Cancel Listing
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleBuy}
                        disabled={buying}
                        style={{
                            ...styles.btn,
                            ...styles.btnGreen,
                            ...(buying ? styles.btnDisabled : {}),
                        }}
                    >
                        {buying ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Purchasing...
                            </>
                        ) : !isConnected ? (
                            <>
                                <Wallet size={16} />
                                Connect to Buy
                            </>
                        ) : (
                            <>
                                <ShoppingBag size={16} />
                                Buy Now
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Marketplace;
