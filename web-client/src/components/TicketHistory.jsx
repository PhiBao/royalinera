import React, { useState, useEffect } from 'react';
import { useLinera } from '../providers/LineraProvider';
import { 
    Clock, 
    User, 
    DollarSign, 
    Loader2, 
    ArrowRight, 
    Tag, 
    Gavel,
    Ticket,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// GraphQL query for ticket history
const GET_TICKET_HISTORY_QUERY = `
  query GetTicketHistory($ticketId: String!) {
    ticketHistory(ticketId: $ticketId) {
      ownershipHistory {
        owner
        ownerChain
        acquiredAt
        pricePaid
        acquisitionType
      }
      priceHistory {
        price
        timestamp
        eventType
      }
    }
  }
`;

const styles = {
    container: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#ffffff',
    },
    content: {
        padding: '20px',
    },
    section: {
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#a0a0a0',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    timeline: {
        position: 'relative',
        paddingLeft: '24px',
    },
    timelineItem: {
        position: 'relative',
        paddingBottom: '20px',
        borderLeft: '2px solid rgba(99, 102, 241, 0.3)',
        paddingLeft: '20px',
    },
    timelineItemLast: {
        borderLeft: '2px solid transparent',
    },
    timelineDot: {
        position: 'absolute',
        left: '-8px',
        top: '0',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        backgroundColor: '#6366f1',
        border: '2px solid #1e1e1e',
    },
    timelineDotMinted: {
        backgroundColor: '#10b981',
    },
    timelineDotPurchased: {
        backgroundColor: '#f59e0b',
    },
    timelineDotTransferred: {
        backgroundColor: '#6366f1',
    },
    timelineContent: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        padding: '12px 16px',
    },
    timelineLabel: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    timelineAddress: {
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        color: '#ffffff',
        marginBottom: '8px',
    },
    timelineMeta: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.75rem',
        color: '#a0a0a0',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    priceItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        marginBottom: '8px',
    },
    priceInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    priceTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: '#10b981',
        fontWeight: '600',
        fontSize: '1rem',
    },
    priceLabel: {
        fontSize: '0.75rem',
        padding: '2px 8px',
        borderRadius: '4px',
        fontWeight: '500',
    },
    priceLabelListed: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        color: '#6366f1',
    },
    priceLabelSold: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
    },
    priceLabelRelisted: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        color: '#f59e0b',
    },
    priceDate: {
        fontSize: '0.75rem',
        color: '#a0a0a0',
    },
    emptyState: {
        textAlign: 'center',
        padding: '24px',
        color: '#6b7280',
        fontSize: '0.875rem',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: '#6b7280',
    },
};

// Format timestamp to readable date
const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Format address to short form
const formatAddress = (address) => {
    if (!address) return 'Unknown';
    if (address.length <= 16) return address;
    return `${address.slice(0, 10)}...${address.slice(-6)}`;
};

// Get dot color based on acquisition type
const getDotStyle = (type) => {
    switch (type) {
        case 'MINTED':
            return styles.timelineDotMinted;
        case 'PURCHASED':
            return styles.timelineDotPurchased;
        case 'TRANSFERRED':
            return styles.timelineDotTransferred;
        default:
            return {};
    }
};

// Get label style based on price event type
const getLabelStyle = (type) => {
    switch (type) {
        case 'LISTED':
            return styles.priceLabelListed;
        case 'SOLD':
            return styles.priceLabelSold;
        case 'RELISTED':
            return styles.priceLabelRelisted;
        default:
            return {};
    }
};

const TicketHistory = ({ ticketId }) => {
    const { hubQuery } = useLinera();
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!ticketId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                console.log(`[TicketHistory] Fetching history for ${ticketId}...`);
                const result = await hubQuery(GET_TICKET_HISTORY_QUERY, { ticketId });
                console.log('[TicketHistory] Result:', result);
                setHistory(result?.ticketHistory);
            } catch (err) {
                console.error('[TicketHistory] Failed to fetch:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [ticketId, hubQuery]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <Clock size={18} style={{ color: '#6366f1' }} />
                        Ticket History
                    </div>
                </div>
                <div style={styles.loading}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    const hasOwnershipHistory = history?.ownershipHistory?.length > 0;
    const hasPriceHistory = history?.priceHistory?.length > 0;

    return (
        <div style={styles.container}>
            <div style={styles.header} onClick={() => setExpanded(!expanded)}>
                <div style={styles.headerTitle}>
                    <Clock size={18} style={{ color: '#6366f1' }} />
                    Ticket History & Provenance
                </div>
                {expanded ? <ChevronUp size={20} style={{ color: '#a0a0a0' }} /> : <ChevronDown size={20} style={{ color: '#a0a0a0' }} />}
            </div>

            {expanded && (
                <div style={styles.content}>
                    {/* Ownership Timeline */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            <User size={14} />
                            Ownership History
                        </div>
                        
                        {hasOwnershipHistory ? (
                            <div style={styles.timeline}>
                                {history.ownershipHistory.map((record, index) => (
                                    <div 
                                        key={index} 
                                        style={{
                                            ...styles.timelineItem,
                                            ...(index === history.ownershipHistory.length - 1 ? styles.timelineItemLast : {})
                                        }}
                                    >
                                        <div style={{ ...styles.timelineDot, ...getDotStyle(record.acquisitionType) }} />
                                        <div style={styles.timelineContent}>
                                            <div style={styles.timelineLabel}>
                                                {record.acquisitionType === 'MINTED' && '🎫 Minted'}
                                                {record.acquisitionType === 'PURCHASED' && '💰 Purchased'}
                                                {record.acquisitionType === 'TRANSFERRED' && '↗️ Transferred'}
                                            </div>
                                            <div style={styles.timelineAddress}>
                                                {formatAddress(record.owner)}
                                            </div>
                                            <div style={styles.timelineMeta}>
                                                <div style={styles.metaItem}>
                                                    <Clock size={12} />
                                                    {formatDate(record.acquiredAt)}
                                                </div>
                                                {record.pricePaid && (
                                                    <div style={styles.metaItem}>
                                                        <DollarSign size={12} />
                                                        {record.pricePaid}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                No ownership history recorded yet
                            </div>
                        )}
                    </div>

                    {/* Price History */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            <Tag size={14} />
                            Price History
                        </div>
                        
                        {hasPriceHistory ? (
                            <div>
                                {history.priceHistory.map((entry, index) => (
                                    <div key={index} style={styles.priceItem}>
                                        <div style={styles.priceInfo}>
                                            <div style={styles.priceTag}>
                                                <DollarSign size={16} />
                                                {entry.price}
                                            </div>
                                            <span style={{ ...styles.priceLabel, ...getLabelStyle(entry.eventType) }}>
                                                {entry.eventType === 'LISTED' && 'Listed'}
                                                {entry.eventType === 'SOLD' && 'Sold'}
                                                {entry.eventType === 'RELISTED' && 'Relisted'}
                                            </span>
                                        </div>
                                        <div style={styles.priceDate}>
                                            {formatDate(entry.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                No price history yet (never listed)
                            </div>
                        )}
                    </div>
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

export default TicketHistory;
