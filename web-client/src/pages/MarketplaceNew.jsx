import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { gql } from '@apollo/client/core';
import { useQuery, useMutation } from '@apollo/client/react';
import { useWallet } from '../providers/WalletProvider';
import { useGraphQL } from '../providers/GraphQLProvider';
import { ShoppingBag, Ticket, DollarSign, Wallet, Loader2, RefreshCw, User, Hash, XCircle } from 'lucide-react';

// GraphQL
const GET_LISTINGS = gql`
  query GetListings {
    listings
  }
`;

const GET_TICKET = gql`
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

const BUY_TICKET = gql`
  mutation BuyListing($ticketId: String!, $buyer: String!, $price: String!) {
    buyListing(ticketId: $ticketId, buyer: $buyer, price: $price)
  }
`;

const CANCEL_LISTING = gql`
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
    const { isConnected, openWalletModal, chainId: userChainId, address: userAddress } = useWallet();
    const { hubClient } = useGraphQL();

    const { data, loading, refetch } = useQuery(GET_LISTINGS, {
        client: hubClient,
    });

    const listingIds = useMemo(() => {
        if (!data?.listings) return [];
        // Backend returns object {ticketId: ListingInfo}, convert to array of IDs
        if (typeof data.listings === 'object' && !Array.isArray(data.listings)) {
            return Object.keys(data.listings);
        }
        return Array.isArray(data.listings) ? data.listings : [];
    }, [data]);
    
    // Get full listing data from the object
    const listingsMap = useMemo(() => {
        if (!data?.listings || Array.isArray(data.listings)) return {};
        return data.listings;
    }, [data]);

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
            </div>

            {/* Listings Grid */}
            {listingIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <ShoppingBag size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>No listings yet</h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>Be the first to list a ticket for sale!</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {listingIds.map((ticketId) => (
                        <ListingCard
                            key={ticketId}
                            ticketId={ticketId}
                            listing={listingsMap[ticketId]}
                            hubClient={hubClient}
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

// Listing Card Component
const ListingCard = ({ ticketId, listing, hubClient, isConnected, openWalletModal, onBought, userChainId, userAddress }) => {
    const [buying, setBuying] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const { data: ticketData, loading: ticketLoading } = useQuery(GET_TICKET, {
        client: hubClient,
        variables: { ticketId },
    });

    const [buyTicketMutation] = useMutation(BUY_TICKET, {
        client: hubClient,
        fetchPolicy: 'no-cache',
    });

    const [cancelListingMutation] = useMutation(CANCEL_LISTING, {
        client: hubClient,
        fetchPolicy: 'no-cache',
    });

    // Retry wrapper for mutations with testnet timestamp issues
    const withRetry = async (mutationFn, variables, options = {}) => {
        const { maxRetries = 5, delay = 3000, onSuccess, onError, setLoading } = options;
        const toastId = toast.loading('Processing...');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await mutationFn({ variables });
                
                // Check if there's an error in the response
                if (result.errors && result.errors.length > 0) {
                    const errorMsg = result.errors[0].message || 'Unknown error';
                    const isRetryable = errorMsg.includes('timestamp') || 
                                       errorMsg.includes('future') || 
                                       errorMsg.includes('quorum') ||
                                       errorMsg.includes('malformed');
                    
                    if (isRetryable && attempt < maxRetries) {
                        toast.loading(`Retry ${attempt}/${maxRetries}... waiting ${delay/1000}s`, { id: toastId });
                        await new Promise(r => setTimeout(r, delay));
                        continue;
                    }
                    throw new Error(errorMsg);
                }
                
                // Success!
                toast.success('Success!', { id: toastId });
                if (onSuccess) onSuccess(result);
                return result;
                
            } catch (err) {
                const errorMsg = err.message || 'Unknown error';
                const isRetryable = errorMsg.includes('timestamp') || 
                                   errorMsg.includes('future') || 
                                   errorMsg.includes('quorum') ||
                                   errorMsg.includes('malformed');
                
                if (isRetryable && attempt < maxRetries) {
                    toast.loading(`Retry ${attempt}/${maxRetries}... waiting ${delay/1000}s`, { id: toastId });
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                
                // Final failure
                toast.error(`Failed: ${errorMsg}`, { id: toastId });
                if (onError) onError(err);
                if (setLoading) setLoading(false);
                return null;
            }
        }
    };

    const handleBuy = async () => {
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setBuying(true);
        const price = listing?.price || '0';
        await withRetry(buyTicketMutation, { ticketId, buyer: userAddress, price }, {
            onSuccess: () => {
                setBuying(false);
                onBought();
            },
            setLoading: setBuying,
        });
        setBuying(false);
    };

    const handleCancel = async () => {
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setCancelling(true);
        await withRetry(cancelListingMutation, { ticketId, seller: userAddress }, {
            onSuccess: () => {
                setCancelling(false);
                onBought();
            },
            setLoading: setCancelling,
        });
        setCancelling(false);
    };

    const ticket = ticketData?.ticket;
    
    // Check if user owns this listing by comparing wallet addresses (seller field)
    // This works even in demo mode where all users share the same hub chain
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
                <h3 style={styles.cardTitle}>{ticket?.eventName || 'Unknown Event'}</h3>
                <p style={styles.cardSubtitle}>{ticket?.seat || 'General Admission'}</p>
                
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
