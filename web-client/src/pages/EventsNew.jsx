import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { useLinera } from '../providers/LineraProvider';
import { Calendar, MapPin, Users, Ticket, Plus, X, Loader2, RefreshCw, Wallet, Clock, Search, Filter, ChevronDown, ArrowUpDown } from 'lucide-react';

// GraphQL queries as plain strings for direct blockchain calls
const GET_EVENTS_QUERY = `query GetEvents { events }`;

const GET_EVENT_QUERY = `
  query GetEvent($eventId: String!) {
    event(eventId: $eventId) {
      id { value }
      name
      description
      venue
      startTime
      organizerChain
      royaltyBps
      maxTickets
      mintedTickets
    }
  }
`;

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent(
    $eventId: String!, 
    $name: String!, 
    $description: String!, 
    $venue: String!, 
    $startTime: Int!, 
    $royaltyBps: Int!, 
    $maxTickets: Int!
  ) {
    createEvent(
      eventId: $eventId, 
      name: $name, 
      description: $description, 
      venue: $venue, 
      startTime: $startTime, 
      royaltyBps: $royaltyBps, 
      maxTickets: $maxTickets
    )
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
    const { query, mutate, isReady } = useLinera();
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        date: '',
        venue: '',
        totalTickets: '',
        royaltyBps: '500',
    });

    // Direct blockchain query state
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Wave 6: Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'availability'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [filterAvailability, setFilterAvailability] = useState('all'); // 'all', 'available', 'soldout'
    const [showFilters, setShowFilters] = useState(false);

    // Fetch events directly from blockchain
    const refetch = useCallback(async () => {
        if (!isReady) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('[Events] Fetching events directly from blockchain...');
            const result = await query(GET_EVENTS_QUERY);
            console.log('[Events] Blockchain response:', result);
            setData(result);
        } catch (err) {
            console.error('[Events] Blockchain query failed:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [query, isReady]);

    // Load events on mount and when ready
    useEffect(() => {
        refetch();
    }, [refetch]);

    const eventIds = useMemo(() => {
        if (!data?.events) return [];
        // Backend returns object {eventId: Event}, convert to array of IDs
        if (typeof data.events === 'object' && !Array.isArray(data.events)) {
            return Object.keys(data.events);
        }
        return Array.isArray(data.events) ? data.events : [];
    }, [data]);
    
    // Get full event data from the object
    const eventsMap = useMemo(() => {
        if (!data?.events || Array.isArray(data.events)) return {};
        return data.events;
    }, [data]);

    // Wave 6: Filter and sort events
    const filteredEventIds = useMemo(() => {
        let filtered = [...eventIds];
        
        // Search filter - search by name, description, or venue
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(id => {
                const event = eventsMap[id];
                if (!event) return true; // Keep if we don't have event data yet
                const name = (event.name || '').toLowerCase();
                const description = (event.description || '').toLowerCase();
                const venue = (event.venue || '').toLowerCase();
                return name.includes(query) || description.includes(query) || venue.includes(query);
            });
        }
        
        // Availability filter
        if (filterAvailability !== 'all') {
            filtered = filtered.filter(id => {
                const event = eventsMap[id];
                if (!event) return true;
                const available = (event.maxTickets || 0) - (event.mintedTickets || 0);
                if (filterAvailability === 'available') return available > 0;
                if (filterAvailability === 'soldout') return available <= 0;
                return true;
            });
        }
        
        // Sort events
        filtered.sort((a, b) => {
            const eventA = eventsMap[a];
            const eventB = eventsMap[b];
            if (!eventA || !eventB) return 0;
            
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (eventA.name || '').localeCompare(eventB.name || '');
                    break;
                case 'date':
                    comparison = (eventA.startTime || 0) - (eventB.startTime || 0);
                    break;
                case 'availability':
                    const availA = (eventA.maxTickets || 0) - (eventA.mintedTickets || 0);
                    const availB = (eventB.maxTickets || 0) - (eventB.mintedTickets || 0);
                    comparison = availB - availA; // More available first
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
    }, [eventIds, eventsMap, searchQuery, sortBy, sortOrder, filterAvailability]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isConnected) {
            openWalletModal();
            return;
        }
        setCreating(true);
        
        // Generate unique event ID
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Convert date to Unix timestamp
        const startTime = Math.floor(new Date(formData.date).getTime() / 1000);
        
        try {
            console.log('[Events] Creating event via direct blockchain mutation...');
            
            // Use direct blockchain mutation with built-in retry
            await mutate(CREATE_EVENT_MUTATION, {
                eventId,
                name: formData.name,
                description: formData.description || formData.name,
                venue: formData.venue,
                startTime,
                royaltyBps: parseInt(formData.royaltyBps) || 500,
                maxTickets: parseInt(formData.totalTickets),
            });
            
            // Success - close modal and refresh
            setShowCreateModal(false);
            setFormData({ name: '', description: '', date: '', venue: '', totalTickets: '', royaltyBps: '500' });
            refetch();
            
        } catch (err) {
            console.error('[Events] Create event failed:', err);
            // Toast already shown by mutate
        }
        
        setCreating(false);
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
                            placeholder="Search events..."
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="date" style={{ background: '#1e1e1e' }}>Date</option>
                            <option value="name" style={{ background: '#1e1e1e' }}>Name</option>
                            <option value="availability" style={{ background: '#1e1e1e' }}>Availability</option>
                        </select>
                        <button 
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            style={{ 
                                padding: '8px 10px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#a0a0a0',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: '4rem',
                                justifyContent: 'center',
                            }}
                        >
                            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                        </button>
                    </div>
                    
                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                    
                    {/* Availability Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Filter:</span>
                        <select
                            value={filterAvailability}
                            onChange={(e) => setFilterAvailability(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="all" style={{ background: '#1e1e1e' }}>All Events</option>
                            <option value="available" style={{ background: '#1e1e1e' }}>Available</option>
                            <option value="soldout" style={{ background: '#1e1e1e' }}>Sold Out</option>
                        </select>
                    </div>
                </div>
                
                {/* Results count */}
                {searchQuery && (
                    <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#a0a0a0' }}>
                        Found {filteredEventIds.length} event{filteredEventIds.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Events Grid */}
            {filteredEventIds.length === 0 ? (
                <div style={styles.emptyState}>
                    <Calendar size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                        {searchQuery ? 'No matching events' : 'No events yet'}
                    </h3>
                    <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>
                        {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to create an event!'}
                    </p>
                    {!searchQuery && (
                        <button onClick={handleCreateClick} style={{ ...styles.btn, ...styles.btnPrimary }}>
                            <Plus size={16} />
                            Create Event
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredEventIds.map((eventId) => (
                        <EventCard
                            key={eventId}
                            eventId={eventId}
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
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Description</label>
                                    <input
                                        style={styles.input}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="An amazing music event..."
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
                                        <label style={styles.label}>Royalty (%)</label>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            min="0"
                                            max="10000"
                                            value={formData.royaltyBps}
                                            onChange={(e) => setFormData({ ...formData, royaltyBps: e.target.value })}
                                            placeholder="500 (5%)"
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

// Event Card Component - uses direct blockchain queries
const EventCard = ({ eventId, onMint }) => {
    const { query, isReady } = useLinera();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!isReady) return;
            
            try {
                console.log(`[EventCard] Fetching event ${eventId} from blockchain...`);
                const result = await query(GET_EVENT_QUERY, { eventId });
                setEvent(result?.event);
            } catch (err) {
                console.error(`[EventCard] Failed to fetch event ${eventId}:`, err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchEvent();
    }, [eventId, query, isReady]);

    const availableTickets = event ? event.maxTickets - event.mintedTickets : 0;
    const soldOut = event && availableTickets <= 0;

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

    // Format startTime (Unix timestamp) to date
    const eventDate = event?.startTime ? new Date(event.startTime * 1000) : null;

    return (
        <div style={styles.card}>
            <div style={styles.cardImage}>
                <Calendar size={56} style={{ color: 'rgba(255,255,255,0.3)' }} />
                {event && (
                    <div style={{
                        ...styles.availBadge,
                        backgroundColor: soldOut ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.6)',
                    }}>
                        <Ticket size={12} />
                        {soldOut ? 'Sold Out' : `${availableTickets} left`}
                    </div>
                )}
            </div>
            <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{event?.name || 'Unknown Event'}</h3>
                
                <div style={styles.cardMeta}>
                    {eventDate && (
                        <div style={styles.metaItem}>
                            <Clock size={16} style={{ color: '#6366f1' }} />
                            {eventDate.toLocaleDateString('en-US', { 
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
                    {event?.maxTickets && (
                        <div style={styles.metaItem}>
                            <Users size={16} style={{ color: '#10b981' }} />
                            {event.maxTickets} total capacity
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
