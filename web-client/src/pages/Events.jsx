import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLinera } from '../contexts/LineraContext';
import { Calendar, MapPin, Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const Events = () => {
    const { request, owner, loading: ctxLoading } = useLinera();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const fetchEvents = async () => {
        try {
            const data = await request(`query { events }`);
            // events is a Map<EventId, Event>, but GraphQL returns it as an object or list depending on the schema
            // The original code handled it as Object.values(data.events || {})
            setEvents(Object.values(data.events || {}));
        } catch (err) {
            console.error("Failed to fetch events", err);
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ctxLoading) fetchEvents();
    }, [ctxLoading]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Convert datetime-local to Unix timestamp
        const datetimeValue = formData.get('start_time');
        const startTime = datetimeValue ? Math.floor(new Date(datetimeValue).getTime() / 1000) : Math.floor(Date.now() / 1000) + 86400;

        const variables = {
            organizer: owner,
            eventId: formData.get('event_id'),
            name: formData.get('name'),
            description: formData.get('description'),
            venue: formData.get('venue'),
            startTime: startTime,
            royaltyBps: parseInt(formData.get('royalty_bps') || '0'),
            maxTickets: parseInt(formData.get('max_tickets') || '0'),
        };

        try {
            await toast.promise(
                request(`
        mutation {
          createEvent(
            organizer: "${variables.organizer}"
            eventId: "${variables.eventId}"
            name: "${variables.name}"
            description: "${variables.description}"
            venue: "${variables.venue}"
            startTime: ${variables.startTime}
            royaltyBps: ${variables.royaltyBps}
            maxTickets: ${variables.maxTickets}
          )
        }
      `),
                {
                    loading: 'Creating event...',
                    success: 'Event created successfully!',
                    error: 'Failed to create event',
                }
            );

            setShowCreate(false);
            fetchEvents();
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to get default datetime value (24 hours from now)
    const getDefaultDateTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Format as datetime-local format: YYYY-MM-DDTHH:MM
        return tomorrow.toISOString().slice(0, 16);
    };

    if (loading) return <div className="text-center py-20">Loading events...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1>Events</h1>
                    <p className="text-text-secondary">Discover upcoming experiences.</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="btn btn-primary"
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {showCreate && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="card mb-8 overflow-hidden"
                >
                    <h3 className="mb-4">New Event Details</h3>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <label>Event ID (Unique)</label>
                            <input name="event_id" required placeholder="e.g. concert-2025" />
                        </div>
                        <div className="input-group">
                            <label>Event Name</label>
                            <input name="name" required placeholder="Summer Vibes Festival" />
                        </div>
                        <div className="input-group md:col-span-2">
                            <label>Description</label>
                            <textarea name="description" rows="2" placeholder="What's this event about?" />
                        </div>
                        <div className="input-group">
                            <label>Venue</label>
                            <input name="venue" placeholder="Central Park, NY" />
                        </div>
                        <div className="input-group">
                            <label>Start Date & Time</label>
                            <input
                                name="start_time"
                                type="datetime-local"
                                defaultValue={getDefaultDateTime()}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Max Tickets</label>
                            <input name="max_tickets" type="number" defaultValue="1000" />
                        </div>
                        <div className="input-group">
                            <label>Royalty (BPS)</label>
                            <input name="royalty_bps" type="number" defaultValue="500" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-4">
                            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">Publish Event</button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">No events found. Be the first to create one!</p>
                ) : (
                    events.map((event) => (
                        <motion.div
                            key={event.id.value}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card flex flex-col h-full"
                        >
                            <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-4 flex items-center justify-center">
                                <Calendar className="w-12 h-12 text-white/20" />
                            </div>
                            <h3 className="text-xl mb-2">{event.name}</h3>
                            <p className="text-text-secondary text-sm mb-4 flex-grow">{event.description}</p>

                            <div className="space-y-2 text-sm text-text-secondary mb-6">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-accent-primary" />
                                    {event.venue}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-accent-primary" />
                                    {event.mintedTickets} / {event.maxTickets} tickets sold
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="text-xs font-mono text-gray-500 mb-2 truncate">ID: {event.id.value}</div>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={() => navigate(`/mint?event=${event.id.value}`)}
                                >
                                    Mint Ticket
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Events;
