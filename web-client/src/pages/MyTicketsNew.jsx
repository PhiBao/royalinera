import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gql } from '@apollo/client/core';
import { useQuery, useMutation } from '@apollo/client/react';
import { useWallet } from '../providers/WalletProvider';
import { useGraphQL } from '../providers/GraphQLProvider';
import { Ticket as TicketIcon, Send, DollarSign, Tag, X, Wallet, Loader2, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';

// GraphQL Queries and Mutations
const GET_MY_TICKETS = gql`
  query GetMyTickets {
    myTickets
  }
`;

const GET_TICKETS_BY_OWNER = gql`
  query GetTicketsByOwner($owner: String!) {
    ticketsByOwner(owner: $owner)
  }
`;

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

const TRANSFER_TICKET = gql`
  mutation TransferTicket($ticketId: String!, $newOwner: String!, $buyerChain: String!, $salePrice: String) {
    transferTicket(ticketId: $ticketId, newOwner: $newOwner, buyerChain: $buyerChain, salePrice: $salePrice)
  }
`;

const LIST_FOR_SALE = gql`
  mutation CreateListing($ticketId: String!, $seller: String!, $price: String!) {
    createListing(ticketId: $ticketId, seller: $seller, price: $price)
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
    const { isConnected, openWalletModal, chainId: userChainId, hubChainId, address: userAddress } = useWallet();
    const { hubClient } = useGraphQL();
    
    const [actionTicket, setActionTicket] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [transferForm, setTransferForm] = useState({ toChain: '', toAddress: '' });
    const [listForm, setListForm] = useState({ price: '' });

    // Use ticketsByOwner query to filter by wallet address (works in demo mode)
    const { data, loading, refetch } = useQuery(GET_TICKETS_BY_OWNER, {
        client: hubClient,
        variables: { owner: userAddress || '' },
        skip: !isConnected || !userAddress,
    });

    // Fetch all listings to check which tickets are listed
    const { data: listingsData, refetch: refetchListings } = useQuery(GET_LISTINGS, {
        client: hubClient,
    });

    // Build a map of ticketId -> listing info
    const listingsMap = useMemo(() => {
        if (!listingsData?.listings) return {};
        if (typeof listingsData.listings === 'object' && !Array.isArray(listingsData.listings)) {
            return listingsData.listings;
        }
        return {};
    }, [listingsData]);

    const handleRefetch = () => {
        refetch();
        refetchListings();
    };

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

    const [transferTicketMutation] = useMutation(TRANSFER_TICKET, {
        client: hubClient,
        fetchPolicy: 'no-cache',
    });

    const [listForSaleMutation] = useMutation(LIST_FOR_SALE, {
        client: hubClient,
        fetchPolicy: 'no-cache',
    });

    const [cancelListingMutation] = useMutation(CANCEL_LISTING, {
        client: hubClient,
        fetchPolicy: 'no-cache',
    });

    // State for loading indicators
    const [transferring, setTransferring] = useState(false);
    const [listing, setListing] = useState(false);

    const handleCancelListing = async (ticketId) => {
        await withRetry(cancelListingMutation, { ticketId, seller: userAddress }, {
            onSuccess: () => handleRefetch(),
        });
    };

    const ticketIds = useMemo(() => {
        if (!data?.ticketsByOwner) return [];
        return Array.isArray(data.ticketsByOwner) ? data.ticketsByOwner : [];
    }, [data]);

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
        await withRetry(transferTicketMutation, { 
            ticketId: actionTicket, 
            newOwner: transferForm.toAddress,
            buyerChain: transferForm.toChain || userChainId,
            salePrice: null,
        }, {
            onSuccess: () => {
                closeModal();
                handleRefetch();
            },
            setLoading: setTransferring,
        });
        setTransferring(false);
    };

    const handleList = async (e) => {
        e.preventDefault();
        if (!listForm.price || parseFloat(listForm.price) <= 0) {
            toast.error('Please enter a valid price');
            return;
        }
        setListing(true);
        await withRetry(listForSaleMutation, { 
            ticketId: actionTicket, 
            seller: userAddress, 
            price: listForm.price 
        }, {
            onSuccess: () => {
                closeModal();
                navigate('/marketplace');
            },
            setLoading: setListing,
        });
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

    return (
        <div>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.title}>My Tickets</h1>
                <p style={styles.subtitle}>{ticketIds.length} ticket{ticketIds.length !== 1 ? 's' : ''} in your wallet</p>
                
                <div style={styles.headerActions}>
                    <button onClick={handleRefetch} style={{ ...styles.btn, ...styles.btnSecondary, flex: 'none' }}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button onClick={() => navigate('/mint')} style={{ ...styles.btn, ...styles.btnPrimary, flex: 'none' }}>
                        <TicketIcon size={16} />
                        Get More Tickets
                    </button>
                </div>
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
            ) : (
                <div style={styles.grid}>
                    {ticketIds.map((ticketId) => (
                        <TicketCard
                            key={ticketId}
                            ticketId={ticketId}
                            listing={listingsMap[ticketId]}
                            hubClient={hubClient}
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

// Ticket Card Component
const TicketCard = ({ ticketId, listing, hubClient, onTransfer, onList, onCancelListing }) => {
    const { data, loading } = useQuery(GET_TICKET, {
        client: hubClient,
        variables: { ticketId },
    });

    const ticket = data?.ticket;
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
            <div style={styles.cardImage}>
                <TicketIcon size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
                {isListed && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                    }}>
                        Listed: {listing.price}
                    </div>
                )}
            </div>
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
            </div>
        </div>
    );
};

export default MyTickets;
