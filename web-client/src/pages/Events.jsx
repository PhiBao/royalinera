import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { Calendar, MapPin, Users, Plus, Search, Filter, SortAsc, Wallet, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const Events = () => {
    const { request, isConnected, isConnecting, openWalletModal, onNotification, lineraClient, userChainId } = useWallet();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    // Optimistic events stored in localStorage to survive page refreshes
    const [pendingEvents, setPendingEvents] = useState(() => {
        try {
            const stored = localStorage.getItem('pendingEvents');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'availability'
    const [filterAvailable, setFilterAvailable] = useState(false);
    
    // Polling state refs to prevent duplicate calls
    const inFlightRef = useRef(false);
    const pendingRef = useRef(false);
    
    // Save pending events to localStorage and cleanup old ones (>24h)
    useEffect(() => {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const cleanedPending = pendingEvents.filter(pe => {
            // Keep events less than 24 hours old
            return !pe._createdAt || (now - pe._createdAt) < ONE_DAY;
        });
        if (cleanedPending.length !== pendingEvents.length) {
            setPendingEvents(cleanedPending);
        }
        localStorage.setItem('pendingEvents', JSON.stringify(cleanedPending));
    }, [pendingEvents]);

    const fetchEvents = useCallback(async () => {
        // Prevent concurrent requests
        if (inFlightRef.current) {
            pendingRef.current = true;
            return;
        }
        
        inFlightRef.current = true;
        try {
            console.log('Fetching events from local chain (synced with hub)...');
            const data = await request(`query { events }`);
            console.log('Events data received:', data);
            const eventsList = Object.values(data?.events || {});
            console.log('Parsed events list:', eventsList);
            
            // Remove any pending events that now appear in the confirmed list
            const confirmedIds = new Set(eventsList.map(e => e.id?.value || e.id));
            console.log('Confirmed event IDs from blockchain:', [...confirmedIds]);
            setPendingEvents(prev => {
                console.log('Checking pending vs confirmed. Pending:', prev.map(p => p.id?.value || p.id));
                const remaining = prev.filter(pe => !confirmedIds.has(pe.id?.value || pe.id));
                if (remaining.length !== prev.length) {
                    console.log('Cleared confirmed pending events, remaining:', remaining.length);
                } else {
                    console.log('No pending events cleared, keeping:', remaining.length);
                }
                return remaining;
            });
            
            setEvents(eventsList);
        } catch (err) {
            console.error("Failed to fetch events:", err);
            // Only show error toast if we have no events yet
            if (events.length === 0 && pendingEvents.length === 0) {
                toast.error(`Failed to load events: ${err.message}`);
            }
        } finally {
            setLoading(false);
            setSyncing(false);
            inFlightRef.current = false;
            
            // If there's a pending request, fetch again
            if (pendingRef.current) {
                pendingRef.current = false;
                fetchEvents();
            }
        }
    }, [request, events.length, pendingEvents.length]);
    
    // Manual sync button handler
    const handleSync = useCallback(async () => {
        setSyncing(true);
        await fetchEvents();
    }, [fetchEvents]);

    // Initial fetch and notification subscription (like linera-skribble)
    useEffect(() => {
        if (isConnected && !isConnecting) {
            // Initial fetch
            fetchEvents();
            
            // Subscribe to blockchain notifications
            const unsubscribe = onNotification?.(() => {
                console.log('Blockchain notification received, refreshing events...');
                fetchEvents();
            });
            
            return () => {
                if (typeof unsubscribe === 'function') {
                    try { unsubscribe(); } catch (e) { console.warn(e); }
                }
            };
        } else if (!isConnecting) {
            setLoading(false);
        }
    }, [isConnected, isConnecting, onNotification, fetchEvents]);

    // Filter and sort events (combine confirmed + pending)
    useEffect(() => {
        // Merge confirmed events with pending (optimistic) events
        let result = [...events, ...pendingEvents];
        console.log('Combined events for display:', result.length, 'confirmed:', events.length, 'pending:', pendingEvents.length);

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(event =>
                event.name?.toLowerCase().includes(query) ||
                event.venue?.toLowerCase().includes(query) ||
                event.description?.toLowerCase().includes(query)
            );
        }

        // Availability filter
        if (filterAvailable) {
            result = result.filter(event =>
                event.mintedTickets < event.maxTickets
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'availability':
                    return (b.maxTickets - b.mintedTickets) - (a.maxTickets - a.mintedTickets);
                case 'date':
                default:
                    return (a.startTime || 0) - (b.startTime || 0);
            }
        });

        setFilteredEvents(result);
    }, [events, pendingEvents, searchQuery, sortBy, filterAvailable]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Convert datetime-local to Unix timestamp
        const datetimeValue = formData.get('start_time');
        const startTime = datetimeValue ? Math.floor(new Date(datetimeValue).getTime() / 1000) : Math.floor(Date.now() / 1000) + 86400;

        const eventId = formData.get('event_id').trim().substring(0, 20); // Limit length
        const name = formData.get('name').trim().substring(0, 50);
        const description = formData.get('description').trim().substring(0, 200);
        const venue = formData.get('venue').trim().substring(0, 50);
        const royaltyBps = parseInt(formData.get('royalty_bps') || '0');
        const maxTickets = parseInt(formData.get('max_tickets') || '100');

        console.log('Creating event with:', {
            eventId, name, description, venue, startTime, royaltyBps, maxTickets
        });

        // Create optimistic event object BEFORE mutation
        const optimisticEvent = {
            id: { value: eventId },
            name,
            description,
            venue,
            startTime,
            royaltyBps,
            maxTickets,
            mintedTickets: 0,
            organizerChain: userChainId || 'pending',
            _pending: true, // Mark as pending for UI styling
            _createdAt: Date.now(), // Track when created for cleanup
        };

        // Add to pending events BEFORE mutation for immediate display
        console.log('Adding optimistic event:', eventId);
        setPendingEvents(prev => {
            console.log('Previous pending events:', prev.length);
            // Don't add duplicate
            if (prev.some(pe => (pe.id?.value || pe.id) === eventId)) {
                console.log('Duplicate found, not adding');
                return prev;
            }
            const newPending = [...prev, optimisticEvent];
            console.log('New pending events count:', newPending.length);
            return newPending;
        });
        
        e.target.reset();
        setShowCreate(false);

        try {
            await toast.promise(
                request(`
                    mutation {
                        createEvent(
                            eventId: "${eventId}"
                            name: "${name}"
                            description: "${description}"
                            venue: "${venue}"
                            startTime: ${startTime}
                            royaltyBps: ${royaltyBps}
                            maxTickets: ${maxTickets}
                        )
                    }
                `),
                {
                    loading: 'Creating event on blockchain...',
                    success: 'Event submitted! It will appear confirmed once validators process it.',
                    error: (err) => `Blockchain busy: ${err.message}. Event saved locally.`,
                }
            );
            
            // Try to fetch updated events (will clear pending if confirmed)
            setTimeout(() => fetchEvents(), 3000);
        } catch (err) {
            console.error('Create event error (keeping pending):', err);
            // DON'T remove pending event - keep it visible to user
            // It's stored in localStorage and will be cleared when confirmed later
            toast.success('Event saved locally. Will sync when blockchain is available.', {
                duration: 5000,
                icon: '⏳',
            });
        }
    };

    // Helper to get default datetime value (24 hours from now)
    const getDefaultDateTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Format as datetime-local format: YYYY-MM-DDTHH:MM
        return tomorrow.toISOString().slice(0, 16);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mb-4"></div>
                <p className="text-text-secondary">Loading events...</p>
            </div>
        );
    }
    
    if (!isConnected) {
        return (
            <>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-md mx-auto"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Wallet size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
                        <p className="text-text-secondary mb-8 leading-relaxed">
                            To view and create events, you need to connect your wallet. 
                            Create a new wallet or import an existing one to get started.
                        </p>
                        <button
                            onClick={openWalletModal}
                            className="btn btn-primary text-lg px-8 py-4"
                        >
                            <Wallet size={20} />
                            Connect Wallet
                        </button>
                    </motion.div>
                </div>
            </>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1>Events</h1>
                    <p className="text-text-secondary">Discover upcoming experiences.</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="btn btn-primary"
                    disabled={!isConnected}
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-white/10 rounded-lg focus:border-accent-primary/50 transition-colors"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <SortAsc size={18} className="text-text-secondary" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="availability">Sort by Availability</option>
                        </select>
                    </div>

                    {/* Filter Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterAvailable}
                            onChange={(e) => setFilterAvailable(e.target.checked)}
                            className="w-4 h-4 accent-accent-primary"
                        />
                        <span className="text-sm text-text-secondary">Available only</span>
                    </label>
                    
                    {/* Sync Button */}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-white/10 rounded-lg text-sm transition-colors disabled:opacity-50"
                        title="Sync with marketplace"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                </div>

                {/* Results count */}
                <div className="mt-3 text-sm text-text-secondary">
                    Showing {filteredEvents.length} of {events.length} events
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-bg-card border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-white/10 sticky top-0 bg-bg-card z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Create New Event</h2>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="text-text-secondary hover:text-white transition-colors text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="input-group md:col-span-2">
                                    <label className="text-sm font-medium">Event Name *</label>
                                    <input name="name" required placeholder="Summer Vibes Festival" className="w-full" />
                                </div>

                                <div className="input-group">
                                    <label className="text-sm font-medium">Event ID (Unique) *</label>
                                    <input name="event_id" required placeholder="summer-vibes-2025" className="w-full" />
                                    <p className="text-xs text-text-secondary mt-1">Lowercase, no spaces (use hyphens)</p>
                                </div>

                                <div className="input-group">
                                    <label className="text-sm font-medium">Venue</label>
                                    <input name="venue" placeholder="Central Park, NY" className="w-full" />
                                </div>

                                <div className="input-group md:col-span-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea 
                                        name="description" 
                                        rows="3" 
                                        placeholder="What's this event about?"
                                        className="w-full bg-bg-primary border border-white/10 rounded-lg p-3 resize-none"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="text-sm font-medium">Start Date & Time *</label>
                                    <input
                                        name="start_time"
                                        type="datetime-local"
                                        defaultValue={getDefaultDateTime()}
                                        required
                                        className="w-full"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="text-sm font-medium">Max Tickets *</label>
                                    <input 
                                        name="max_tickets" 
                                        type="number" 
                                        defaultValue="100" 
                                        min="1"
                                        max="100000"
                                        required
                                        className="w-full"
                                    />
                                </div>

                                <div className="input-group md:col-span-2">
                                    <label className="text-sm font-medium">Royalty (Basis Points)</label>
                                    <input 
                                        name="royalty_bps" 
                                        type="number" 
                                        defaultValue="500" 
                                        min="0"
                                        max="2500"
                                        className="w-full"
                                    />
                                    <p className="text-xs text-text-secondary mt-1">
                                        500 BPS = 5%. Maximum 2500 (25%)
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreate(false)} 
                                    className="btn btn-secondary px-6"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary px-6"
                                >
                                    <Plus size={18} />
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">
                        {(events.length === 0 && pendingEvents.length === 0)
                            ? "No events found. Be the first to create one!"
                            : "No events match your search criteria."}
                    </p>
                ) : (
                    filteredEvents.map((event) => {
                        const availableTickets = event.maxTickets - event.mintedTickets;
                        const isSoldOut = availableTickets <= 0;
                        const isLowStock = availableTickets > 0 && availableTickets <= 10;
                        const isPending = event._pending; // Optimistic event not yet confirmed

                        return (
                            <motion.div
                                key={event.id?.value || event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: isPending ? 0.7 : 1, scale: 1 }}
                                className={`card flex flex-col h-full relative ${isPending ? 'border-2 border-dashed border-yellow-500/50' : ''}`}
                            >
                                {/* Status badge */}
                                {isPending && (
                                    <div className="absolute top-4 right-4 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold animate-pulse">
                                        PENDING...
                                    </div>
                                )}
                                {isSoldOut && !isPending && (
                                    <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">
                                        SOLD OUT
                                    </div>
                                )}
                                {isLowStock && !isSoldOut && !isPending && (
                                    <div className="absolute top-4 right-4 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                                        {availableTickets} LEFT
                                    </div>
                                )}

                                <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-4 flex items-center justify-center">
                                    <Calendar className="w-12 h-12 text-white/20" />
                                </div>
                                <h3 className="text-xl mb-2">{event.name}</h3>
                                <p className="text-text-secondary text-sm mb-4 flex-grow line-clamp-2">{event.description}</p>

                                <div className="space-y-2 text-sm text-text-secondary mb-6">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-accent-primary" />
                                        {event.venue || 'TBA'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-accent-primary" />
                                        {event.startTime 
                                            ? new Date(event.startTime * 1000).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : 'TBA'
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-accent-primary" />
                                        {event.mintedTickets} / {event.maxTickets} tickets sold
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="text-xs font-mono text-gray-500 mb-2 truncate">ID: {event.id?.value || event.id}</div>
                                    <button
                                        className={`btn w-full ${(isSoldOut || isPending) ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                                        onClick={() => !isSoldOut && !isPending && navigate(`/mint?event=${event.id?.value || event.id}`)}
                                        disabled={isSoldOut || isPending}
                                    >
                                        {isPending ? 'Confirming...' : (isSoldOut ? 'Sold Out' : 'Mint Ticket')}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Events;
