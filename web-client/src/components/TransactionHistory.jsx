import React, { useState, useEffect, useCallback } from 'react';
import { useLinera } from '../providers/LineraProvider';
import { useWallet } from '../contexts/WalletContext';
import { 
    History, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Ticket,
    Tag,
    DollarSign,
    Loader2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink
} from 'lucide-react';

// Transaction types enum (matching the Rust enums)
const TransactionType = {
    MINT: 'MINT',
    PURCHASE: 'PURCHASE',
    SALE: 'SALE',
    TRANSFER_IN: 'TRANSFER_IN',
    TRANSFER_OUT: 'TRANSFER_OUT',
    LIST: 'LIST',
    CANCEL_LIST: 'CANCEL_LIST',
};

const styles = {
    container: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        marginTop: '16px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#ffffff',
    },
    content: {
        maxHeight: '300px',
        overflowY: 'auto',
    },
    txItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    txIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    txDetails: {
        flex: 1,
        minWidth: 0,
    },
    txType: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#ffffff',
        marginBottom: '2px',
    },
    txMeta: {
        fontSize: '0.75rem',
        color: '#a0a0a0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    txAmount: {
        textAlign: 'right',
        flexShrink: 0,
    },
    txAmountValue: {
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    txAmountLabel: {
        fontSize: '0.65rem',
        color: '#6b7280',
        marginTop: '2px',
    },
    emptyState: {
        textAlign: 'center',
        padding: '24px 16px',
        color: '#6b7280',
        fontSize: '0.875rem',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '24px',
        color: '#6b7280',
        fontSize: '0.875rem',
    },
    refreshBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        color: '#a0a0a0',
        display: 'flex',
        alignItems: 'center',
    },
};

// Icon and color based on transaction type
const getTxStyle = (type) => {
    switch (type) {
        case TransactionType.MINT:
            return {
                icon: Ticket,
                bgColor: 'rgba(16, 185, 129, 0.2)',
                iconColor: '#10b981',
                label: 'Minted Ticket',
                amountColor: '#10b981',
            };
        case TransactionType.PURCHASE:
            return {
                icon: ArrowDownLeft,
                bgColor: 'rgba(99, 102, 241, 0.2)',
                iconColor: '#6366f1',
                label: 'Purchased',
                amountColor: '#ef4444',
            };
        case TransactionType.SALE:
            return {
                icon: DollarSign,
                bgColor: 'rgba(16, 185, 129, 0.2)',
                iconColor: '#10b981',
                label: 'Sold',
                amountColor: '#10b981',
            };
        case TransactionType.TRANSFER_IN:
            return {
                icon: ArrowDownLeft,
                bgColor: 'rgba(99, 102, 241, 0.2)',
                iconColor: '#6366f1',
                label: 'Received',
                amountColor: '#6366f1',
            };
        case TransactionType.TRANSFER_OUT:
            return {
                icon: ArrowUpRight,
                bgColor: 'rgba(245, 158, 11, 0.2)',
                iconColor: '#f59e0b',
                label: 'Sent',
                amountColor: '#f59e0b',
            };
        case TransactionType.LIST:
            return {
                icon: Tag,
                bgColor: 'rgba(168, 85, 247, 0.2)',
                iconColor: '#a855f7',
                label: 'Listed',
                amountColor: '#a855f7',
            };
        case TransactionType.CANCEL_LIST:
            return {
                icon: Tag,
                bgColor: 'rgba(107, 114, 128, 0.2)',
                iconColor: '#6b7280',
                label: 'Cancelled Listing',
                amountColor: '#6b7280',
            };
        default:
            return {
                icon: History,
                bgColor: 'rgba(107, 114, 128, 0.2)',
                iconColor: '#6b7280',
                label: 'Transaction',
                amountColor: '#6b7280',
            };
    }
};

// Format timestamp
const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};

// Format address
const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Transaction history component - shows recent wallet activity
const TransactionHistory = () => {
    const { owner } = useWallet();
    const { queryHub, isReady } = useLinera();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Build transaction history from on-chain data
    // This queries the user's tickets and their history to build a timeline
    const fetchTransactions = useCallback(async () => {
        if (!isReady || !owner) {
            setLoading(false);
            return;
        }

        setRefreshing(true);

        try {
            console.log('[TransactionHistory] Fetching for owner:', owner);
            // Get user's tickets
            const ticketsResult = await queryHub(`
                query GetTicketsByOwner($owner: String!) {
                    ticketsByOwner(owner: $owner)
                }
            `, { owner });

            const ticketIds = ticketsResult?.ticketsByOwner || [];
            console.log('[TransactionHistory] Found tickets:', ticketIds);
            const txList = [];

            // For each ticket, get its history and build transactions
            for (const ticketId of ticketIds.slice(0, 10)) { // Limit to 10 for performance
                try {
                    const historyResult = await queryHub(`
                        query GetTicketHistory($ticketId: String!) {
                            ticketHistory(ticketId: $ticketId) {
                                ownershipHistory {
                                    owner
                                    acquiredAt
                                    pricePaid
                                    acquisitionType
                                }
                            }
                        }
                    `, { ticketId });

                    const history = historyResult?.ticketHistory?.ownershipHistory || [];
                    console.log(`[TransactionHistory] History for ${ticketId}:`, history);
                    
                    // Find transactions involving this user
                    history.forEach((record, idx) => {
                        if (record.owner?.toLowerCase() === owner.toLowerCase()) {
                            let type;
                            switch (record.acquisitionType) {
                                case 'MINTED':
                                    type = TransactionType.MINT;
                                    break;
                                case 'PURCHASED':
                                    type = TransactionType.PURCHASE;
                                    break;
                                case 'TRANSFERRED':
                                    type = TransactionType.TRANSFER_IN;
                                    break;
                                default:
                                    type = TransactionType.TRANSFER_IN;
                            }

                            txList.push({
                                id: `${ticketId}-${idx}`,
                                type,
                                ticketId,
                                timestamp: record.acquiredAt,
                                amount: record.pricePaid,
                            });
                        }
                    });
                } catch (err) {
                    console.warn(`[TransactionHistory] Failed to get history for ${ticketId}:`, err);
                }
            }

            // Sort by timestamp (most recent first)
            txList.sort((a, b) => (parseInt(b.timestamp) || 0) - (parseInt(a.timestamp) || 0));

            setTransactions(txList);
        } catch (err) {
            console.error('[TransactionHistory] Failed to fetch:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [queryHub, isReady, owner]);

    useEffect(() => {
        if (expanded) {
            fetchTransactions();
        }
    }, [expanded, fetchTransactions]);

    return (
        <div style={styles.container}>
            <div style={styles.header} onClick={() => setExpanded(!expanded)}>
                <div style={styles.headerTitle}>
                    <History size={16} style={{ color: '#6366f1' }} />
                    Transaction History
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {expanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                fetchTransactions();
                            }}
                            style={styles.refreshBtn}
                            disabled={refreshing}
                        >
                            <RefreshCw 
                                size={14} 
                                style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} 
                            />
                        </button>
                    )}
                    {expanded ? (
                        <ChevronUp size={16} style={{ color: '#a0a0a0' }} />
                    ) : (
                        <ChevronDown size={16} style={{ color: '#a0a0a0' }} />
                    )}
                </div>
            </div>

            {expanded && (
                <div style={styles.content}>
                    {loading ? (
                        <div style={styles.loading}>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Loading history...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p>No transactions yet</p>
                            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                                Your ticket activity will appear here
                            </p>
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const txStyle = getTxStyle(tx.type);
                            const Icon = txStyle.icon;

                            return (
                                <div key={tx.id} style={styles.txItem}>
                                    <div style={{ ...styles.txIcon, backgroundColor: txStyle.bgColor }}>
                                        <Icon size={18} style={{ color: txStyle.iconColor }} />
                                    </div>
                                    <div style={styles.txDetails}>
                                        <div style={styles.txType}>{txStyle.label}</div>
                                        <div style={styles.txMeta}>
                                            <span>{formatDate(tx.timestamp)}</span>
                                            {tx.ticketId && (
                                                <span>• {formatAddress(tx.ticketId)}</span>
                                            )}
                                        </div>
                                    </div>
                                    {tx.amount && (
                                        <div style={styles.txAmount}>
                                            <div style={{ ...styles.txAmountValue, color: txStyle.amountColor }}>
                                                {tx.type === TransactionType.PURCHASE || tx.type === TransactionType.SALE ? '-' : '+'}
                                                {tx.amount}
                                            </div>
                                            <div style={styles.txAmountLabel}>LINERA</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TransactionHistory;
