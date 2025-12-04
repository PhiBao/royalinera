import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLinera } from '../contexts/LineraContext';
import { Ticket as TicketIcon, Send, DollarSign, Tag, X } from 'lucide-react';
import { motion } from 'framer-motion';

const MyTickets = () => {
    const { request, owner, chainId, loading: ctxLoading } = useLinera();
    const [tickets, setTickets] = useState([]);
    const [listings, setListings] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionTicket, setActionTicket] = useState(null); // { id, type: 'transfer' | 'sell' }

    const fetchTickets = async () => {
        if (!owner) return;
        try {
            // 1. Get owned ticket IDs
            const idsData = await request(`query { ownedTicketIds(owner: "${owner}") }`);
            const ids = idsData.ownedTicketIds || [];

            // 2. Fetch details for each ticket
            const ticketDetails = await Promise.all(ids.map(async (id) => {
                const data = await request(`query { ticket(ticketId: "${id}") { ticketId, eventName, seat, owner } }`);
                return data.ticket;
            }));

            // 3. Fetch all listings to check status
            const listingsData = await request(`query { listings }`);
            setListings(listingsData.listings || {});

            setTickets(ticketDetails.filter(t => t)); // Filter out nulls
        } catch (err) {
            console.error("Failed to fetch tickets", err);
            toast.error("Failed to load tickets: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ctxLoading && owner) fetchTickets();
        else if (!owner) setLoading(false);
    }, [ctxLoading, owner]);

    const handleTransfer = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const targetOwner = formData.get('target_owner');
        const targetChain = formData.get('target_chain') || chainId;

        try {
            await toast.promise(
                request(`
        mutation {
          transferTicket(
            seller: "${owner}"
            ticketId: "${actionTicket.id}"
            buyerAccount: { chainId: "${targetChain}", owner: "${targetOwner}" }
            salePrice: null
          )
        }
      `),
                {
                    loading: 'Transferring ticket...',
                    success: 'Ticket transferred successfully!',
                    error: 'Failed to transfer ticket',
                }
            );
            setActionTicket(null);
            fetchTickets();
        } catch (err) {
            console.error(err);
        }
    };

    const handleList = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const price = formData.get('price');

        try {
            await toast.promise(
                request(`
        mutation {
          createListing(
            seller: "${owner}"
            ticketId: "${actionTicket.id}"
            price: "${price}"
          )
        }
      `),
                {
                    loading: 'Listing ticket...',
                    success: 'Ticket listed for sale!',
                    error: 'Failed to list ticket',
                }
            );
            setActionTicket(null);
            fetchTickets();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancelListing = async (ticketId) => {
        const attemptCancel = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const result = await request(`
            mutation {
              cancelListing(
                seller: "${owner}"
                ticketId: "${ticketId}"
              )
            }
          `);
                    return result;
                } catch (err) {
                    const errMsg = err.message || JSON.stringify(err);
                    if ((errMsg.includes('timestamp') || errMsg.includes('future')) && i < retries - 1) {
                        // Timestamp error - wait and retry
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                    throw err;
                }
            }
        };

        try {
            await toast.promise(
                attemptCancel(),
                {
                    loading: 'Cancelling listing...',
                    success: 'Listing cancelled!',
                    error: 'Failed to cancel listing',
                }
            );
            fetchTickets();
        } catch (err) {
            console.error(err);
        }
    };

    if (!owner) return <div className="text-center py-20">Please connect your wallet to view your tickets.</div>;
    if (loading) return <div className="text-center py-20">Loading your tickets...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1>My Tickets</h1>
                <div className="text-sm text-text-secondary">
                    Account: <span className="font-mono text-white">{owner.slice(0, 8)}...</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tickets.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">You don't own any tickets yet.</p>
                ) : (
                    tickets.map((ticket) => {
                        const listing = listings[ticket.ticketId];
                        const isListed = listing && listing.status === "Active";

                        return (
                            <motion.div
                                key={ticket.ticketId}
                                layout
                                className="card relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <TicketIcon size={100} />
                                </div>

                                {isListed && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                                            <Tag size={14} /> Listed
                                        </span>
                                    </div>
                                )}

                                <div className="relative z-10">
                                    <h3 className="text-xl mb-1">{ticket.eventName}</h3>
                                    <div className="inline-block px-3 py-1 bg-white/10 rounded-lg text-sm font-mono mb-2">
                                        Seat: {ticket.seat}
                                    </div>

                                    {isListed && (
                                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-green-400 mb-1">Listed Price</p>
                                                    <p className="text-lg font-bold text-white">{listing.price} tokens</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelListing(ticket.ticketId)}
                                                    className="btn btn-secondary text-xs"
                                                    title="Cancel listing"
                                                >
                                                    <X size={14} /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => setActionTicket({ id: ticket.ticketId, type: 'transfer' })}
                                            className="btn btn-secondary text-sm flex-1"
                                            disabled={isListed}
                                        >
                                            <Send size={16} /> Transfer
                                        </button>
                                        <button
                                            onClick={() => setActionTicket({ id: ticket.ticketId, type: 'sell' })}
                                            className="btn btn-primary text-sm flex-1"
                                            disabled={isListed}
                                        >
                                            <DollarSign size={16} /> {isListed ? 'Already Listed' : 'Sell'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Modal for Actions */}
            {actionTicket && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h3 className="mb-4">
                            {actionTicket.type === 'transfer' ? 'Transfer Ticket' : 'Sell Ticket'}
                        </h3>

                        {actionTicket.type === 'transfer' ? (
                            <form onSubmit={handleTransfer} className="space-y-4">
                                <div className="input-group">
                                    <label>Recipient Owner ID</label>
                                    <input name="target_owner" required placeholder="Account Owner ID" />
                                </div>
                                <div className="input-group">
                                    <label>Recipient Chain ID (Optional)</label>
                                    <input name="target_chain" placeholder="Defaults to current chain" />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setActionTicket(null)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Transfer</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleList} className="space-y-4">
                                <div className="input-group">
                                    <label>Price (Tokens)</label>
                                    <input name="price" type="number" required min="0" placeholder="e.g. 100" />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setActionTicket(null)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">List for Sale</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTickets;
