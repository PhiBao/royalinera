import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { Ticket, CheckCircle, AlertCircle, Image as ImageIcon, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const Mint = () => {
    const { request, isConnected, isConnecting, openWalletModal } = useWallet();
    const [searchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [loading, setLoading] = useState(true);
    const [ticketMetadata, setTicketMetadata] = useState({
        description: '',
        imageUrl: ''
    });

    useEffect(() => {
        const fetchEvents = async () => {
            if (!isConnected) {
                setLoading(false);
                return;
            }
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
        if (!isConnecting) fetchEvents();
    }, [isConnected, isConnecting, searchParams]);

    const handleMint = async (e) => {
        e.preventDefault();
        if (!isConnected) {
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
            setTicketMetadata({ description: '', imageUrl: '' });
        } catch (err) {
            console.error(err);
        }
    };

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
                            Connect your wallet to mint tickets for events.
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
                            {events.map(e => {
                                const available = e.maxTickets - e.mintedTickets;
                                const isSoldOut = available <= 0;
                                return (
                                    <option key={e.id.value} value={e.id.value} disabled={isSoldOut}>
                                        {e.name} ({e.mintedTickets}/{e.maxTickets} sold) {isSoldOut ? '- SOLD OUT' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Seat / Section</label>
                        <input name="seat" placeholder="e.g. Section A, Row 5, Seat 12" required />
                    </div>

                    {/* Enhanced Metadata Fields */}
                    <div className="input-group">
                        <label className="flex items-center gap-2">
                            <ImageIcon size={16} />
                            Ticket Image URL (Optional)
                        </label>
                        <input 
                            value={ticketMetadata.imageUrl}
                            onChange={(e) => setTicketMetadata(prev => ({ ...prev, imageUrl: e.target.value }))}
                            placeholder="https://example.com/ticket-image.jpg" 
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Add a cover image for your ticket (IPFS links recommended)
                        </p>
                    </div>

                    <div className="input-group">
                        <label>Additional Notes (Optional)</label>
                        <textarea 
                            value={ticketMetadata.description}
                            onChange={(e) => setTicketMetadata(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Special instructions, parking info, or notes for the ticket holder..."
                            rows={3}
                            className="w-full bg-bg-primary border border-white/10 rounded-lg p-3 focus:border-accent-primary/50 transition-colors resize-none"
                        />
                    </div>

                    <div className="text-xs text-text-secondary p-3 bg-white/5 rounded-lg">
                        <p>💡 <strong>Note:</strong> Only the event organizer can mint tickets. 
                        Make sure you are using the same chain that created the event.</p>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-4 text-lg" disabled={loading}>
                        <Ticket className="mr-2" /> Mint Ticket
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Mint;
