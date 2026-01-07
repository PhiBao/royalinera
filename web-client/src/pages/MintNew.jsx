import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gql } from '@apollo/client/core';
import { useQuery, useMutation } from '@apollo/client/react';
import { useWallet } from '../providers/WalletProvider';
import { useGraphQL } from '../providers/GraphQLProvider';
import { Ticket, Sparkles, Calendar, MapPin, Wallet, Loader2, ChevronDown, DollarSign, Users, ArrowLeft } from 'lucide-react';

// GraphQL
const GET_EVENTS = gql`
  query GetEvents {
    events
  }
`;

const GET_EVENT = gql`
  query GetEvent($eventId: String!) {
    event(eventId: $eventId) {
      eventId
      name
      date
      venue
      totalTickets
      availableTickets
      ticketPrice
    }
  }
`;

const MINT_TICKET = gql`
  mutation MintTicket($eventId: String!, $seat: String!) {
    mintTicket(eventId: $eventId, seat: $seat)
  }
`;

// Styles
const styles = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#a0a0a0',
        fontSize: '0.875rem',
        marginBottom: '24px',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
    },
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    cardHeader: {
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
    },
    cardHeaderIcon: {
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
    },
    cardTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '8px',
    },
    cardSubtitle: {
        color: '#a0a0a0',
        fontSize: '0.875rem',
    },
    cardBody: {
        padding: '24px',
    },
    formGroup: {
        marginBottom: '24px',
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#ffffff',
        marginBottom: '8px',
    },
    selectWrapper: {
        position: 'relative',
    },
    select: {
        width: '100%',
        padding: '14px 16px',
        paddingRight: '40px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '0.9375rem',
        outline: 'none',
        appearance: 'none',
        cursor: 'pointer',
    },
    selectIcon: {
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6b7280',
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: '#ffffff',
        fontSize: '0.9375rem',
        outline: 'none',
        boxSizing: 'border-box',
    },
    hint: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '8px',
    },
    eventPreview: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '16px',
    },
    eventPreviewTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: '12px',
    },
    eventMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.875rem',
        color: '#a0a0a0',
    },
    priceBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderRadius: '12px',
        marginBottom: '24px',
    },
    priceLabel: {
        fontSize: '0.875rem',
        color: '#a0a0a0',
    },
    priceValue: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#10b981',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    btn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 20px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: 'none',
    },
    btnPrimary: {
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: '#ffffff',
    },
    btnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    loadingState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    connectState: {
        textAlign: 'center',
        padding: '48px 24px',
    },
};

const Mint = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isConnected, openWalletModal } = useWallet();
    const { hubClient } = useGraphQL();
    
    const preselectedEventId = searchParams.get('eventId');
    
    const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
    const [seat, setSeat] = useState('');

    // Fetch all events for the dropdown
    const { data: eventsData, loading: eventsLoading } = useQuery(GET_EVENTS, {
        client: hubClient,
    });

    const eventIds = useMemo(() => {
        if (!eventsData?.events) return [];
        return Array.isArray(eventsData.events) ? eventsData.events : [];
    }, [eventsData]);

    // Fetch selected event details
    const { data: eventData, loading: eventLoading } = useQuery(GET_EVENT, {
        client: hubClient,
        variables: { eventId: selectedEventId },
        skip: !selectedEventId,
    });

    const selectedEvent = eventData?.event;
    const soldOut = selectedEvent && selectedEvent.availableTickets <= 0;

    // Mint mutation
    const [mintTicket, { loading: minting }] = useMutation(MINT_TICKET, {
        client: hubClient,
        fetchPolicy: 'no-cache',
        onCompleted: () => {
            toast.success('Ticket minted successfully!');
            navigate('/my-tickets');
        },
        onError: (err) => toast.error(`Minting failed: ${err.message}`),
    });

    useEffect(() => {
        if (preselectedEventId) {
            setSelectedEventId(preselectedEventId);
        }
    }, [preselectedEventId]);

    const handleMint = async (e) => {
        e.preventDefault();
        if (!isConnected) {
            openWalletModal();
            return;
        }
        if (!selectedEventId) {
            toast.error('Please select an event');
            return;
        }
        await mintTicket({
            variables: {
                eventId: selectedEventId,
                seat: seat || 'General Admission',
            },
        });
    };

    if (eventsLoading) {
        return (
            <div style={styles.loadingState}>
                <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#a0a0a0' }}>Loading events...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <button onClick={() => navigate('/events')} style={styles.backButton}>
                <ArrowLeft size={16} />
                Back to Events
            </button>

            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.cardHeaderIcon}>
                        <Sparkles size={32} color="#ffffff" />
                    </div>
                    <h1 style={styles.cardTitle}>Mint a Ticket</h1>
                    <p style={styles.cardSubtitle}>Create a unique NFT ticket for your chosen event</p>
                </div>

                <div style={styles.cardBody}>
                    {!isConnected ? (
                        <div style={styles.connectState}>
                            <Wallet size={48} style={{ color: '#6366f1', margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                                Connect Your Wallet
                            </h3>
                            <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>
                                You need to connect your wallet to mint tickets
                            </p>
                            <button onClick={openWalletModal} style={{ ...styles.btn, ...styles.btnPrimary }}>
                                <Wallet size={18} />
                                Connect Wallet
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleMint}>
                            {/* Event Select */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Select Event</label>
                                <div style={styles.selectWrapper}>
                                    <select
                                        style={styles.select}
                                        value={selectedEventId}
                                        onChange={(e) => setSelectedEventId(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose an event...</option>
                                        {eventIds.map((id) => (
                                            <EventOption key={id} eventId={id} hubClient={hubClient} />
                                        ))}
                                    </select>
                                    <ChevronDown size={18} style={styles.selectIcon} />
                                </div>
                            </div>

                            {/* Event Preview */}
                            {selectedEventId && !eventLoading && selectedEvent && (
                                <div style={styles.eventPreview}>
                                    <h4 style={styles.eventPreviewTitle}>{selectedEvent.name}</h4>
                                    <div style={styles.eventMeta}>
                                        {selectedEvent.date && (
                                            <div style={styles.metaItem}>
                                                <Calendar size={14} style={{ color: '#6366f1' }} />
                                                {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        )}
                                        {selectedEvent.venue && (
                                            <div style={styles.metaItem}>
                                                <MapPin size={14} style={{ color: '#a855f7' }} />
                                                {selectedEvent.venue}
                                            </div>
                                        )}
                                        <div style={styles.metaItem}>
                                            <Users size={14} style={{ color: '#10b981' }} />
                                            {selectedEvent.availableTickets} tickets available
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Seat Input */}
                            <div style={{ ...styles.formGroup, marginTop: '24px' }}>
                                <label style={styles.label}>Seat (Optional)</label>
                                <input
                                    style={styles.input}
                                    value={seat}
                                    onChange={(e) => setSeat(e.target.value)}
                                    placeholder="e.g., VIP Section, Row A, Seat 12"
                                />
                                <p style={styles.hint}>Leave blank for General Admission</p>
                            </div>

                            {/* Price Box */}
                            {selectedEvent?.ticketPrice && (
                                <div style={styles.priceBox}>
                                    <span style={styles.priceLabel}>Ticket Price</span>
                                    <span style={styles.priceValue}>
                                        <DollarSign size={18} />
                                        {selectedEvent.ticketPrice} tokens
                                    </span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={minting || soldOut || !selectedEventId}
                                style={{
                                    ...styles.btn,
                                    ...styles.btnPrimary,
                                    ...((minting || soldOut || !selectedEventId) ? styles.btnDisabled : {}),
                                }}
                            >
                                {minting ? (
                                    <>
                                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                        Minting...
                                    </>
                                ) : soldOut ? (
                                    <>
                                        <Ticket size={18} />
                                        Sold Out
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Mint Ticket
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

// Event Option Component (for select dropdown)
const EventOption = ({ eventId, hubClient }) => {
    const { data } = useQuery(GET_EVENT, {
        client: hubClient,
        variables: { eventId },
    });

    const event = data?.event;
    
    return (
        <option value={eventId}>
            {event?.name || `Event ${eventId.slice(0, 8)}...`}
        </option>
    );
};

export default Mint;
