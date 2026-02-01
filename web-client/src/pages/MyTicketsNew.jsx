import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { useLinera } from '../providers/LineraProvider';
import { Ticket as TicketIcon, Send, DollarSign, Tag, X, Wallet, Loader2, RefreshCw, AlertTriangle, XCircle, History, Filter, Search } from 'lucide-react';
import TicketHistory from '../components/TicketHistory';

// GraphQL queries as plain strings for direct blockchain calls
const GET_TICKETS_BY_OWNER_QUERY = `
  query GetTicketsByOwner($owner: String!) {
    ticketsByOwner(owner: $owner)
  }
`;

const GET_LISTINGS_QUERY = `query GetListings { listings }`;

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

const TRANSFER_TICKET_MUTATION = `
  mutation TransferTicket($ticketId: String!, $newOwner: String!, $buyerChain: String!, $salePrice: String) {
    transferTicket(ticketId: $ticketId, newOwner: $newOwner, buyerChain: $buyerChain, salePrice: $salePrice)
  }
`;

const LIST_FOR_SALE_MUTATION = `
  mutation CreateListing($ticketId: String!, $seller: String!, $price: String!) {
    createListing(ticketId: $ticketId, seller: $seller, price: $price)
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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
        height: '140px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
    ticketId: {
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: '#6b7280',
        padding: '8px 12px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        marginBottom: '16px',
    },
    cardActions: {
        display: 'flex',
        gap: '12px',
    },
    btn: {
        flex: 1,
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
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
    },
    modalContent: {
        position: 'relative',
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    modalBody: {
        padding: '24px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#ffffff',
        marginBottom: '8px',
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '0.875rem',
        outline: 'none',
    },
    hint: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '6px',
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '0 24px 24px',
    },
};

const MyTickets = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isConnected, openWalletModal, chainId: userChainId, owner: userAddress } = useWallet();
    const { query, queryHub, mutate, mutateWithSdk, isReady } = useLinera();
    
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [transferForm, setTransferForm] = useState({ toChain: '', toAddress: '' });
    const [listForm, setListForm] = useState({ price: '' });

    // Direct blockchain query state
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [listingsData, setListingsData] = useState(null);

    // Error state for connection issues
    const [connectionError, setConnectionError] = useState(null);
    
    // Track if we came from minting (need to poll for new ticket)
    const [isPolling, setIsPolling] = useState(false);

    // Fetch tickets directly from blockchain
    const fetchTickets = useCallback(async () => {
        if (!isReady || !isConnected || !userAddress) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setConnectionError(null);
        try {
            console.log('[MyTickets] Fetching tickets from hub chain...');
            console.log('[MyTickets] Owner address:', userAddress);
            // Use queryHub to get tickets from the marketplace/hub chain where they're stored
            const result = await queryHub(GET_TICKETS_BY_OWNER_QUERY, { owner: userAddress });
            console.log('[MyTickets] Hub response:', result);
            setData(result);
        } catch (err) {
            console.error('[MyTickets] Hub query failed:', err);
            // Check if it's a connection error
            if (err.message.includes('CONNECTION_REFUSED') || err.message.includes('Failed to fetch') || err.message.includes('linera service')) {
                setConnectionError('Cannot connect to Linera service. Please make sure "linera service --port 8080" is running.');
            } else {
                setConnectionError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, [queryHub, isReady, isConnected, userAddress]);

    // Fetch listings from hub chain
    const fetchListings = useCallback(async () => {
        if (!isReady) return;
        
        try {
            console.log('[MyTickets] Fetching listings from hub chain...');
            const result = await queryHub(GET_LISTINGS_QUERY);
            setListingsData(result);
        } catch (err) {
            console.error('[MyTickets] Failed to fetch listings:', err);
        }
    }, [queryHub, isReady]);

    // Track initial ticket count for polling
    const initialTicketCountRef = useRef(null);

    useEffect(() => {
        fetchTickets();
        fetchListings();
    }, [fetchTickets, fetchListings]);

    // Poll for new ticket if we came from minting
    useEffect(() => {
        const cameFromMint = location.state?.refresh && location.state?.newTicketAt;
        if (!cameFromMint || !isReady || !isConnected || !userAddress) return;
        
        console.log('[MyTickets] Came from mint, will poll for new ticket...');
        setIsPolling(true);
        
        // Store the initial count when we first arrive
        if (initialTicketCountRef.current === null && data?.ticketsByOwner) {
            initialTicketCountRef.current = data.ticketsByOwner.length;
        }
        
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000; // 2 seconds
        
        const poll = setInterval(async () => {
            attempts++;
            console.log(`[MyTickets] Polling attempt ${attempts}/${maxAttempts}...`);
            
            try {
                const result = await queryHub(GET_TICKETS_BY_OWNER_QUERY, { owner: userAddress });
                const currentCount = result?.ticketsByOwner?.length || 0;
                const expectedCount = (initialTicketCountRef.current || 0) + 1;
                
                console.log(`[MyTickets] Current tickets: ${currentCount}, expected: ${expectedCount}`);
                
                if (currentCount >= expectedCount) {
                    console.log('[MyTickets] New ticket found!');
                    setData(result);
                    setIsPolling(false);
                    clearInterval(poll);
                    // Clear the navigation state
                    navigate(location.pathname, { replace: true, state: {} });
                    toast.success('New ticket loaded!');
                }
            } catch (err) {
                console.error('[MyTickets] Poll error:', err);
            }
            
            if (attempts >= maxAttempts) {
                console.log('[MyTickets] Max poll attempts reached');
                setIsPolling(false);
                clearInterval(poll);
                // Try one more fetch
                fetchTickets();
            }
        }, pollInterval);
        
        return () => clearInterval(poll);
    }, [location.state, isReady, isConnected, userAddress, queryHub, data, navigate, location.pathname, fetchTickets]);

    // Build a map of ticketId -> listing info
    const listingsMap = useMemo(() => {
        if (!listingsData?.listings) return {};
        if (typeof listingsData.listings === 'object' && !Array.isArray(listingsData.listings)) {
            return listingsData.listings;
        }
        return {};
    }, [listingsData]);

    const handleRefetch = () => {
        fetchTickets();
        fetchListings();
    };

    // State for loading indicators
    const [transferring, setTransferring] = useState(false);
    const [listing, setListing] = useState(false);
    
    // Filter state
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'listed', 'not-listed'
    const [searchQuery, setSearchQuery] = useState('');

    const handleCancelListing = async (ticketId) => {
        try {
            console.log('[MyTickets] Cancelling listing via direct SDK (MetaMask will popup)...');
            await mutate(CANCEL_LISTING_MUTATION, { ticketId, seller: userAddress });
            handleRefetch();
        } catch (err) {
            console.error('[MyTickets] Cancel listing failed:', err);
            // Toast already shown by mutateWithSdk
        }
    };

    const ticketIds = useMemo(() => {
        if (!data?.ticketsByOwner) return [];
        return Array.isArray(data.ticketsByOwner) ? data.ticketsByOwner : [];
    }, [data]);
    
    // Apply filters to ticket IDs
    const filteredTicketIds = useMemo(() => {
        return ticketIds.filter(ticketId => {
            const isListed = listingsMap[ticketId]?.status === 'Active';
            
            // Filter by listing status
            if (filterStatus === 'listed' && !isListed) return false;
            if (filterStatus === 'not-listed' && isListed) return false;
            
            return true;
        });
    }, [ticketIds, listingsMap, filterStatus]);

    const closeModal = () => {
        setActionTicket(null);
        setActionType(null);
        setTransferForm({ toChain: '', toAddress: '' });
        setListForm({ price: '' });
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!transferForm.toAddress) {
            toast.error('Please enter recipient wallet address');
            return;
        }
        setTransferring(true);
        
        try {
            console.log('[MyTickets] Transferring ticket via direct SDK (MetaMask will popup)...');
            await mutate(TRANSFER_TICKET_MUTATION, { 
                ticketId: actionTicket, 
                newOwner: transferForm.toAddress,
                buyerChain: transferForm.toChain || userChainId,
                salePrice: null,
            });
            closeModal();
            handleRefetch();
        } catch (err) {
            console.error('[MyTickets] Transfer failed:', err);
            // Toast already shown by mutateWithSdk
        }
        
        setTransferring(false);
    };

    const handleList = async (e) => {
        e.preventDefault();
        if (!listForm.price || parseFloat(listForm.price) <= 0) {
            toast.error('Please enter a valid price');
            return;
        }
        setListing(true);
        
        try {
            console.log('[MyTickets] Listing ticket via direct SDK (MetaMask will popup)...');
            await mutate(LIST_FOR_SALE_MUTATION, { 
                ticketId: actionTicket, 
                seller: userAddress, 
                price: listForm.price 
            });
            closeModal();
            navigate('/marketplace');
        } catch (err) {
            console.error('[MyTickets] List failed:', err);
            // Toast already shown by mutateWithSdk
        }
        
        setListing(false);
    };

    if (!isConnected) {
        return (
            <div style={styles.emptyState}>
                <Wallet size={48} style={{ color: '#6366f1', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '8px' }}>Your Tickets</h2>
                <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>Connect your wallet to view your NFT tickets.</p>
                <button onClick={openWalletModal} style={{ ...styles.btn, ...styles.btnPrimary, flex: 'none', padding: '12px 24px' }}>
                    <Wallet size={18} />
                    Connect Wallet
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ ...styles.emptyState, padding: '80px 20px' }}>
                <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#a0a0a0' }}>Loading your tickets...</p>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div style={styles.emptyState}>
                <AlertTriangle size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '8px', color: '#f59e0b' }}>Connection Error</h2>
                <p style={{ color: '#a0a0a0', marginBottom: '16px', maxWidth: '400px' }}>{connectionError}</p>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontFamily: 'monospace', fontSize: '0.875rem', color: '#a0a0a0' }}>
                    linera service --port 8080
                </div>
                <button onClick={handleRefetch} style={{ ...styles.btn, ...styles.btnPrimary, flex: 'none', padding: '12px 24px' }}>
                    <RefreshCw size={18} />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.title}>My Tickets</h1>
                <p style={styles.subtitle}>{ticketIds.length} ticket{ticketIds.length !== 1 ? 's' : ''} in your wallet</p>
                
                <div style={styles.headerActions}>
                    <button onClick={handleRefetch} disabled={isPolling} style={{ ...styles.btn, ...styles.btnSecondary, flex: 'none', opacity: isPolling ? 0.5 : 1 }}>
                        <RefreshCw size={16} style={isPolling ? { animation: 'spin 1s linear infinite' } : {}} />
                        {isPolling ? 'Syncing...' : 'Refresh'}
                    </button>
                    <button onClick={() => navigate('/mint')} style={{ ...styles.btn, ...styles.btnPrimary, flex: 'none' }}>
                        <TicketIcon size={16} />
                        Get More Tickets
                    </button>
                </div>
                {isPolling && (
                    <p style={{ color: '#6366f1', fontSize: '0.875rem', marginTop: '12px' }}>
                        ⏳ Waiting for new ticket to sync from blockchain...
                    </p>
                )}
                
                {/* Filter Bar */}
                {ticketIds.length > 0 && (
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
                        {/* Filter Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={16} style={{ color: '#6b7280' }} />
                            <span style={{ fontSize: '0.875rem', color: '#a0a0a0' }}>Filter:</span>
                        </div>
                        
                        {/* Filter Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setFilterStatus('all')}
                                style={{
                                    padding: '8px 14px',
                                    backgroundColor: filterStatus === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: filterStatus === 'all' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: filterStatus === 'all' ? '#6366f1' : '#a0a0a0',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                }}
                            >
                                All ({ticketIds.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus('listed')}
                                style={{
                                    padding: '8px 14px',
                                    backgroundColor: filterStatus === 'listed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: filterStatus === 'listed' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: filterStatus === 'listed' ? '#10b981' : '#a0a0a0',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Tag size={14} />
                                Listed
                            </button>
                            <button
                                onClick={() => setFilterStatus('not-listed')}
                                style={{
                                    padding: '8px 14px',
                                    backgroundColor: filterStatus === 'not-listed' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: filterStatus === 'not-listed' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: filterStatus === 'not-listed' ? '#6366f1' : '#a0a0a0',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <TicketIcon size={14} />
                                Not Listed
                            </button>
                        </div>
                        
                        {/* Results count when filtered */}
                        {filterStatus !== 'all' && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                                Showing {filteredTicketIds.length} of {ticketIds.length}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Tickets Grid */}
            {ticketIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <TicketIcon size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>No tickets yet</h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>Mint your first ticket from an event!</p>
                    <button onClick={() => navigate('/events')} style={{ ...styles.btn, ...styles.btnPrimary, flex: 'none', padding: '12px 24px' }}>
                        Browse Events
                    </button>
                </div>
            ) : filteredTicketIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <Filter size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>No matching tickets</h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>Try changing your filter selection</p>
                    <button onClick={() => setFilterStatus('all')} style={{ ...styles.btn, ...styles.btnSecondary, flex: 'none', padding: '12px 24px' }}>
                        Show All Tickets
                    </button>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredTicketIds.map((ticketId) => (
                        <TicketCard
                            key={ticketId}
                            ticketId={ticketId}
                            listing={listingsMap[ticketId]}
                            onTransfer={() => { setActionTicket(ticketId); setActionType('transfer'); }}
                            onList={() => { setActionTicket(ticketId); setActionType('list'); }}
                            onCancelListing={handleCancelListing}
                        />
                    ))}
                </div>
            )}

            {/* Transfer Modal */}
            {actionTicket && actionType === 'transfer' && (
                <div style={styles.modal}>
                    <div style={styles.modalBackdrop} onClick={closeModal} />
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <Send size={20} style={{ color: '#6366f1' }} />
                                Transfer Ticket
                            </h2>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleTransfer}>
                            <div style={styles.modalBody}>
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '0.8rem',
                                    color: '#a0a0a0',
                                    lineHeight: '1.5',
                                }}>
                                    <strong style={{ color: '#6366f1' }}>Note:</strong> Enter the recipient's wallet address. 
                                    In demo mode, you can transfer between demo accounts (e.g., 0x1111...1111, 0x2222...2222).
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Recipient Wallet Address</label>
                                    <input
                                        style={styles.input}
                                        value={transferForm.toAddress}
                                        onChange={(e) => setTransferForm({ ...transferForm, toAddress: e.target.value })}
                                        placeholder="e.g. 0x2222222222222222222222222222222222222222"
                                        required
                                    />
                                    <p style={styles.hint}>The recipient's Ethereum wallet address</p>
                                </div>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={closeModal} style={{ ...styles.btn, ...styles.btnSecondary }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={transferring} style={{ ...styles.btn, ...styles.btnPrimary }}>
                                    {transferring ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                                    {transferring ? 'Transferring...' : 'Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List Modal */}
            {actionTicket && actionType === 'list' && (
                <div style={styles.modal}>
                    <div style={styles.modalBackdrop} onClick={closeModal} />
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <DollarSign size={20} style={{ color: '#10b981' }} />
                                List for Sale
                            </h2>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleList}>
                            <div style={styles.modalBody}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Price</label>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={listForm.price}
                                        onChange={(e) => setListForm({ price: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                    <p style={styles.hint}>A marketplace fee may apply</p>
                                </div>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={closeModal} style={{ ...styles.btn, ...styles.btnSecondary }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={listing} style={{ ...styles.btn, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none' }}>
                                    {listing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Tag size={16} />}
                                    {listing ? 'Listing...' : 'List Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

// Ticket Card Component - uses hub chain queries for ticket data
const TicketCard = ({ ticketId, listing, onTransfer, onList, onCancelListing }) => {
    const { queryHub, isReady } = useLinera();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch ticket details from hub chain
    useEffect(() => {
        const fetchTicket = async () => {
            if (!isReady) return;
            
            try {
                console.log(`[TicketCard] Fetching ticket ${ticketId} from hub chain...`);
                const result = await queryHub(GET_TICKET_QUERY, { ticketId });
                setTicket(result?.ticket);
            } catch (err) {
                console.error(`[TicketCard] Failed to fetch ticket ${ticketId}:`, err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchTicket();
    }, [ticketId, queryHub, isReady]);

    // Check if ticket is listed - listing is passed from parent, status must be 'Active'
    const isListed = listing && listing.status === 'Active';

    if (loading) {
        return (
            <div style={styles.card}>
                <div style={{ ...styles.cardImage, opacity: 0.5 }} />
                <div style={styles.cardContent}>
                    <div style={{ height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '12px' }} />
                    <div style={{ height: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '60%' }} />
                </div>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{ticket?.eventName || 'Unknown Event'}</h3>
                <p style={styles.cardSubtitle}>{ticket?.seat || 'General Admission'}</p>
                <div style={styles.ticketId}>ID: {ticketId.slice(0, 20)}...</div>
                
                {isListed ? (
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            backgroundColor: 'rgba(234, 179, 8, 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            color: '#eab308',
                            fontSize: '0.75rem',
                        }}>
                            <AlertTriangle size={14} />
                            <span>Cancel listing before transferring</span>
                        </div>
                        <button 
                            onClick={() => onCancelListing(ticketId)} 
                            style={{ 
                                ...styles.btn, 
                                width: '100%',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                        >
                            <XCircle size={16} />
                            Cancel Listing
                        </button>
                    </div>
                ) : (
                    <div style={styles.cardActions}>
                        <button onClick={onTransfer} style={{ ...styles.btn, ...styles.btnSecondary }}>
                            <Send size={16} />
                            Transfer
                        </button>
                        <button onClick={onList} style={{ ...styles.btn, ...styles.btnPrimary }}>
                            <Tag size={16} />
                            Sell
                        </button>
                    </div>
                )}

                {/* Ticket History & Provenance */}
                <div style={{ marginTop: '16px' }}>
                    <TicketHistory ticketId={ticketId} />
                </div>
            </div>
        </div>
    );
};

export default MyTickets;
