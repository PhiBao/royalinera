import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLinera } from '../contexts/LineraContext';
import { ShoppingBag, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const Marketplace = () => {
    const { request, owner, chainId, loading: ctxLoading } = useLinera();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchListings = async () => {
        try {
            const data = await request(`query { listings }`);
            // listings is a Map<String, ListingInfo> - filter only Active status
            const allListings = Object.values(data.listings || {});
            setListings(allListings.filter(l => l.status === "Active"));
        } catch (err) {
            console.error("Failed to fetch listings", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ctxLoading) fetchListings();
    }, [ctxLoading]);

    const handleBuy = async (ticketId, price) => {
        if (!owner) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            await toast.promise(
                request(`
        mutation {
          buyListing(
            buyer: { chainId: "${chainId}", owner: "${owner}" }
            ticketId: "${ticketId}"
            price: "${price}"
          )
        }
      `),
                {
                    loading: `Purchasing ticket for ${price} tokens...`,
                    success: 'Ticket purchased successfully!',
                    error: 'Failed to purchase ticket',
                }
            );
            fetchListings();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-center py-20">Loading marketplace...</div>;

    return (
        <div>
            <div className="text-center mb-12">
                <h1>Marketplace</h1>
                <p className="text-text-secondary">Buy and sell tickets securely.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">No active listings found.</p>
                ) : (
                    listings.map((listing) => (
                        <motion.div
                            key={listing.ticket_id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-accent-primary/10 rounded-lg">
                                    <Tag className="text-accent-primary" />
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase">
                                    For Sale
                                </span>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg mb-1 truncate" title={listing.ticket_id}>Ticket #{listing.ticket_id.slice(0, 8)}...</h3>
                                <p className="text-sm text-text-secondary">Seller: {listing.seller.slice(0, 6)}...</p>
                            </div>

                            <div className="flex items-center justify-between mt-auto gap-2">
                                <div className="text-2xl font-bold">{listing.price} <span className="text-sm font-normal text-text-secondary">tokens</span></div>
                                <button
                                    onClick={() => handleBuy(listing.ticket_id, listing.price)}
                                    className="btn btn-primary"
                                    disabled={listing.seller === owner}
                                >
                                    {listing.seller === owner ? 'Your Listing' : 'Buy Now'}
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Marketplace;
