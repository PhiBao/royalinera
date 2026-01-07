import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { Ticket as TicketIcon, Send, DollarSign, Tag, X, History, Clock, ArrowRight, User, Hash, Calendar, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to get transfer history from localStorage
const getTicketHistory = (ticketId) => {
    try {
        const history = localStorage.getItem(`ticket_history_${ticketId}`);
        return history ? JSON.parse(history) : [];
    } catch {
        return [];
    }
};

// Helper to add transfer to history
const addTransferToHistory = (ticketId, from, to, price, type) => {
    const history = getTicketHistory(ticketId);
    history.push({
        timestamp: Date.now(),
        from,
        to,
        price,
        type // 'mint', 'transfer', 'sale'
    });
    localStorage.setItem(`ticket_history_${ticketId}`, JSON.stringify(history));
};

const MyTickets = () => {
    const { request, chainId, isConnected, isConnecting, openWalletModal } = useWallet();
    const [tickets, setTickets] = useState([]);
    const [listings, setListings] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionTicket, setActionTicket] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState(null); // ticketId to show history for
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const fetchTickets = async () => {
        if (!chainId || !isConnected) return;
        try {
            console.log('Fetching tickets for chain:', chainId);
            // 1. Get owned ticket IDs using myTickets (chain_id based)
            const idsData = await request(`query { myTickets }`);
            console.log('Ticket IDs received:', idsData);
            const ids = idsData?.myTickets || [];

            // 2. Fetch details for each ticket
            const ticketDetails = await Promise.all(ids.map(async (id) => {
                const data = await request(`query { ticket(ticketId: "${id}") { ticketId, eventName, seat, ownerChain, minterChain, lastSalePrice } }`);
                return data?.ticket;
            }));

            // 3. Fetch all listings to check status
            const listingsData = await request(`query { listings }`);
            console.log('Listings received:', listingsData);
            setListings(listingsData?.listings || {});

            setTickets(ticketDetails.filter(t => t)); // Filter out nulls
        } catch (err) {
            console.error("Failed to fetch tickets:", err);
            toast.error(`Failed to load tickets: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected && !isConnecting && chainId) {
            fetchTickets();
        } else if (!isConnecting) {
            setLoading(false);
        }
    }, [isConnected, isConnecting, chainId]);

    const handleTransfer = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const buyerChain = formData.get('buyer_chain');

        try {
            await toast.promise(
                request(`
        mutation {
          transferTicket(
            ticketId: "${actionTicket.id}"
            buyerChain: "${buyerChain}"
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
                            Connect your wallet to view and manage your NFT tickets.
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
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mb-4"></div>
                <p className="text-text-secondary">Loading your tickets...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1>My Tickets</h1>
                <div className="text-sm text-text-secondary">
                    Chain: <span className="font-mono text-white">{chainId?.slice(0, 8)}...</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tickets.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">You don't own any tickets yet.</p>
                ) : (
                    tickets.map((ticket) => {
                        const listing = listings[ticket.ticketId];
                        const isListed = listing && listing.status === "Active";
                        const ticketIdStr = typeof ticket.ticketId === 'object' ? 
                            btoa(String.fromCharCode.apply(null, ticket.ticketId.id || [])).slice(0, 8) : 
                            String(ticket.ticketId).slice(0, 8);
                        const isExpanded = expandedHistory === ticket.ticketId;
                        
                        // Build provenance from ticket data
                        const provenance = [
                            { type: 'mint', from: null, to: ticket.minterChain, timestamp: null, price: null }
                        ];
                        if (ticket.minterChain !== ticket.ownerChain) {
                            provenance.push({ 
                                type: ticket.lastSalePrice ? 'sale' : 'transfer', 
                                from: ticket.minterChain, 
                                to: ticket.ownerChain, 
                                timestamp: null,
                                price: ticket.lastSalePrice 
                            });
                        }
                        // Merge with localStorage history
                        const localHistory = getTicketHistory(ticketIdStr);
                        const fullHistory = [...provenance, ...localHistory];

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
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className="inline-block px-3 py-1 bg-white/10 rounded-lg text-sm font-mono">
                                            Seat: {ticket.seat}
                                        </span>
                                        <span className="inline-block px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-lg text-xs font-mono">
                                            <Hash size={12} className="inline mr-1" />
                                            {ticketIdStr}...
                                        </span>
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

                                    {/* Provenance / History Section */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => setExpandedHistory(isExpanded ? null : ticket.ticketId)}
                                            className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                                        >
                                            <span className="flex items-center gap-2 text-text-secondary">
                                                <History size={16} />
                                                Ticket History ({fullHistory.length} events)
                                            </span>
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-2 p-3 bg-bg-primary rounded-lg border border-white/10">
                                                        <div className="space-y-3">
                                                            {fullHistory.map((entry, idx) => (
                                                                <div key={idx} className="flex items-start gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                        entry.type === 'mint' ? 'bg-purple-500/20 text-purple-400' :
                                                                        entry.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                                                                        'bg-blue-500/20 text-blue-400'
                                                                    }`}>
                                                                        {entry.type === 'mint' ? <TicketIcon size={14} /> :
                                                                         entry.type === 'sale' ? <DollarSign size={14} /> :
                                                                         <Send size={14} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium capitalize">{entry.type}</p>
                                                                        <div className="text-xs text-text-secondary">
                                                                            {entry.from && (
                                                                                <span className="font-mono">
                                                                                    {typeof entry.from === 'object' ? 
                                                                                        JSON.stringify(entry.from).slice(0, 16) : 
                                                                                        String(entry.from).slice(0, 16)}...
                                                                                </span>
                                                                            )}
                                                                            {entry.from && entry.to && (
                                                                                <ArrowRight size={12} className="inline mx-1" />
                                                                            )}
                                                                            {entry.to && (
                                                                                <span className="font-mono">
                                                                                    {typeof entry.to === 'object' ? 
                                                                                        JSON.stringify(entry.to).slice(0, 16) : 
                                                                                        String(entry.to).slice(0, 16)}...
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {entry.price && (
                                                                            <p className="text-xs text-green-400 mt-1">
                                                                                {entry.price} tokens
                                                                            </p>
                                                                        )}
                                                                        {entry.timestamp && (
                                                                            <p className="text-xs text-text-secondary mt-1">
                                                                                <Clock size={10} className="inline mr-1" />
                                                                                {new Date(entry.timestamp).toLocaleString()}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex gap-3">
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
                                    <label>Recipient Chain ID</label>
                                    <input name="buyer_chain" required placeholder="Chain ID to transfer to" />
                                    <p className="text-xs text-text-secondary mt-1">
                                        Enter the chain ID of the recipient
                                    </p>
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
