import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLinera } from '../contexts/LineraContext';
import { Ticket, CheckCircle } from 'lucide-react';

const Mint = () => {
    const { request, owner, loading: ctxLoading } = useLinera();
    const [searchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await request(`query { events }`);
                setEvents(Object.values(data.events || {}));

                // Pre-select event from URL query parameter
                const eventParam = searchParams.get('event');
                if (eventParam) {
                    setSelectedEvent(eventParam);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (!ctxLoading) fetchEvents();
    }, [ctxLoading, searchParams]);

    const handleMint = async (e) => {
        e.preventDefault();
        if (!owner) {
            toast.error("Please connect your wallet first");
            return;
        }

        const formData = new FormData(e.target);
        const eventId = formData.get('event_id');
        const seat = formData.get('seat');
        // Dummy blob hash for demo
        const blobHash = "0000000000000000000000000000000000000000000000000000000000000000";

        try {
            await toast.promise(
                request(`
        mutation {
          mintTicket(
            organizer: "${owner}"
            eventId: "${eventId}"
            seat: "${seat}"
            blobHash: "${blobHash}"
          )
        }
      `),
                {
                    loading: 'Minting ticket...',
                    success: 'Ticket minted successfully!',
                    error: 'Failed to mint ticket',
                }
            );
            e.target.reset();
            setSelectedEvent('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <h1>Mint Tickets</h1>
                <p className="text-text-secondary">Secure your spot on the blockchain.</p>
            </div>

            <div className="card">
                <form onSubmit={handleMint} className="space-y-6">
                    <div className="input-group">
                        <label>Select Event</label>
                        <select
                            name="event_id"
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            required
                        >
                            <option value="">-- Choose an event --</option>
                            {events.map(e => (
                                <option key={e.id.value} value={e.id.value}>
                                    {e.name} ({e.mintedTickets}/{e.maxTickets} sold)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Seat / Section</label>
                        <input name="seat" placeholder="e.g. Section A, Row 5, Seat 12" required />
                    </div>

                    <div className="input-group">
                        <label>Organizer Account (You)</label>
                        <input value={owner || 'Not connected'} disabled className="opacity-50" />
                        <p className="text-xs text-text-secondary mt-1">
                            Note: Only the event organizer can mint tickets in this demo contract.
                            Ensure you are using the same account that created the event.
                        </p>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-4 text-lg">
                        <Ticket className="mr-2" /> Mint Ticket
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Mint;
