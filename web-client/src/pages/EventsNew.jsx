import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gql } from '@apollo/client/core';
import { useQuery, useMutation } from '@apollo/client/react';
import { useWallet } from '../providers/WalletProvider';
import { useGraphQL } from '../providers/GraphQLProvider';
import { Calendar, MapPin, Users, Ticket, Plus, X, Loader2, RefreshCw, Wallet, Clock } from 'lucide-react';

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
      organizerChain
    }
  }
`;

const CREATE_EVENT = gql`
  mutation CreateEvent($name: String!, $date: String!, $venue: String!, $totalTickets: Int!, $ticketPrice: String!) {
    createEvent(name: $name, date: $date, venue: $venue, totalTickets: $totalTickets, ticketPrice: $ticketPrice)
  }
`;

// Styles
const styles = {
    pageHeader: {
        marginBottom: '32px',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
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
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
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
        height: '180px',
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
    },
    availBadge: {
        position: 'absolute',
        top: '12px',
        left: '12px',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#ffffff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.75rem',
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
        marginBottom: '16px',
    },
    cardMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.875rem',
        color: '#a0a0a0',
    },
    btn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 20px',
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
    btnFull: {
        width: '100%',
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
        maxWidth: '500px',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        maxHeight: '90vh',
        overflowY: 'auto',
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
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
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
        boxSizing: 'border-box',
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '0 24px 24px',
    },
};

const Events = () => {
    const navigate = useNavigate();
    const { isConnected, openWalletModal } = useWallet();
    const { hubClient } = useGraphQL();
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        venue: '',
        totalTickets: '',
        ticketPrice: '',
    });

    const { data, loading, refetch } = useQuery(GET_EVENTS, {
        client: hubClient,
    });

    const [createEvent, { loading: creating }] = useMutation(CREATE_EVENT, {
        client: hubClient,
        fetchPolicy: 'no-cache',
        onCompleted: () => {
            toast.success('Event created successfully!');
            setShowCreateModal(false);
            setFormData({ name: '', date: '', venue: '', totalTickets: '', ticketPrice: '' });
            refetch();
        },
        onError: (err) => toast.error(`Failed to create event: ${err.message}`),
    });

    const eventIds = useMemo(() => {
        if (!data?.events) return [];
        return Array.isArray(data.events) ? data.events : [];
    }, [data]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isConnected) {
            openWalletModal();
            return;
        }
        await createEvent({
            variables: {
                ...formData,
                totalTickets: parseInt(formData.totalTickets),
            },
        });
    };

    const handleCreateClick = () => {
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setShowCreateModal(true);
    };

    if (loading) {
        return (
            <div style={{ ...styles.emptyState, padding: '80px 20px' }}>
                <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#a0a0a0' }}>Loading events...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={styles.pageHeader}>
                <div style={styles.headerRow}>
                    <div>
                        <h1 style={styles.title}>Events</h1>
                        <p style={styles.subtitle}>Discover upcoming events and get your tickets</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => refetch()} style={{ ...styles.btn, ...styles.btnSecondary }}>
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        <button onClick={handleCreateClick} style={{ ...styles.btn, ...styles.btnPrimary }}>
                            <Plus size={16} />
                            Create Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Grid */}
            {eventIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <Calendar size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>No events yet</h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>Be the first to create an event!</p>
                    <button onClick={handleCreateClick} style={{ ...styles.btn, ...styles.btnPrimary }}>
                        <Plus size={16} />
                        Create Event
                    </button>
                </div>
            ) : (
                <div style={styles.grid}>
                    {eventIds.map((eventId) => (
                        <EventCard
                            key={eventId}
                            eventId={eventId}
                            hubClient={hubClient}
                            onMint={() => navigate(`/mint?eventId=${eventId}`)}
                        />
                    ))}
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <div style={styles.modal}>
                    <div style={styles.modalBackdrop} onClick={() => setShowCreateModal(false)} />
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <Calendar size={20} style={{ color: '#6366f1' }} />
                                Create Event
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={styles.modalBody}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Event Name</label>
                                    <input
                                        style={styles.input}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Summer Music Festival"
                                        required
                                    />
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Date</label>
                                        <input
                                            style={styles.input}
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Venue</label>
                                        <input
                                            style={styles.input}
                                            value={formData.venue}
                                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                            placeholder="Madison Square Garden"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Total Tickets</label>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            min="1"
                                            value={formData.totalTickets}
                                            onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                                            placeholder="500"
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Ticket Price</label>
                                        <input
                                            style={styles.input}
                                            value={formData.ticketPrice}
                                            onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                                            placeholder="0.5"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating} style={{ ...styles.btn, ...styles.btnPrimary, flex: 1, ...(creating ? styles.btnDisabled : {}) }}>
                                    {creating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                                    {creating ? 'Creating...' : 'Create Event'}
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

// Event Card Component
const EventCard = ({ eventId, hubClient, onMint }) => {
    const { data, loading } = useQuery(GET_EVENT, {
        client: hubClient,
        variables: { eventId },
    });

    const event = data?.event;
    const soldOut = event && event.availableTickets <= 0;

    if (loading) {
        return (
            <div style={styles.card}>
                <div style={{ height: '180px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <div style={{ padding: '20px' }}>
                    <div style={{ height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '16px' }} />
                    <div style={{ height: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '80%', marginBottom: '12px' }} />
                    <div style={{ height: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '60%' }} />
                </div>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <div style={styles.cardImage}>
                <Calendar size={56} style={{ color: 'rgba(255,255,255,0.3)' }} />
                {event?.ticketPrice && (
                    <div style={styles.priceBadge}>{event.ticketPrice} tokens</div>
                )}
                {event && (
                    <div style={{
                        ...styles.availBadge,
                        backgroundColor: soldOut ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.6)',
                    }}>
                        <Ticket size={12} />
                        {soldOut ? 'Sold Out' : `${event.availableTickets} left`}
                    </div>
                )}
            </div>
            <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{event?.name || 'Unknown Event'}</h3>
                
                <div style={styles.cardMeta}>
                    {event?.date && (
                        <div style={styles.metaItem}>
                            <Clock size={16} style={{ color: '#6366f1' }} />
                            {new Date(event.date).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    )}
                    {event?.venue && (
                        <div style={styles.metaItem}>
                            <MapPin size={16} style={{ color: '#a855f7' }} />
                            {event.venue}
                        </div>
                    )}
                    {event?.totalTickets && (
                        <div style={styles.metaItem}>
                            <Users size={16} style={{ color: '#10b981' }} />
                            {event.totalTickets} total capacity
                        </div>
                    )}
                </div>

                <button
                    onClick={onMint}
                    disabled={soldOut}
                    style={{
                        ...styles.btn,
                        ...styles.btnPrimary,
                        ...styles.btnFull,
                        ...(soldOut ? styles.btnDisabled : {}),
                    }}
                >
                    <Ticket size={16} />
                    {soldOut ? 'Sold Out' : 'Get Tickets'}
                </button>
            </div>
        </div>
    );
};

export default Events;
