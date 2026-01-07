import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import { ShoppingBag, Tag, Search, SortAsc, Filter, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const Marketplace = () => {
    const { request, chainId, isConnected, isConnecting, openWalletModal } = useWallet();
    const [listings, setListings] = useState([]);
    const [filteredListings, setFilteredListings] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('price-low'); // 'price-low', 'price-high', 'recent'
    const [hideOwn, setHideOwn] = useState(true);

    const fetchListings = async () => {
        try {
            console.log('Fetching marketplace listings...');
            const data = await request(`query { listings }`);
            console.log('Listings data received:', data);
            const allListings = Object.values(data?.listings || {});
            const activeListings = allListings.filter(l => l.status === "Active");
            console.log('Active listings:', activeListings);
            setListings(activeListings);
            setFilteredListings(activeListings);
        } catch (err) {
            console.error("Failed to fetch listings:", err);
            toast.error(`Failed to load marketplace: ${err.message}`);
            setListings([]);
            setFilteredListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected && !isConnecting) {
            fetchListings();
        } else if (!isConnecting) {
            setLoading(false);
        }
    }, [isConnected, isConnecting]);

    // Filter and sort
    useEffect(() => {
        let result = [...listings];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(listing =>
                listing.ticket_id?.toLowerCase().includes(query) ||
                listing.sellerChain?.toLowerCase().includes(query)
            );
        }

        // Hide own listings
        if (hideOwn && chainId) {
            result = result.filter(listing => listing.sellerChain !== chainId);
        }

        // Sort
        result.sort((a, b) => {
            const priceA = parseFloat(a.price) || 0;
            const priceB = parseFloat(b.price) || 0;
            switch (sortBy) {
                case 'price-high':
                    return priceB - priceA;
                case 'price-low':
                default:
                    return priceA - priceB;
            }
        });

        setFilteredListings(result);
    }, [listings, searchQuery, sortBy, hideOwn, chainId]);

    const handleBuy = async (ticketId, price) => {
        if (!chainId) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            await toast.promise(
                request(`
        mutation {
          buyListing(
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
                            Connect your wallet to browse and purchase tickets from the marketplace.
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
                <p className="text-text-secondary">Loading marketplace...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h1>Marketplace</h1>
                <p className="text-text-secondary">Buy and sell tickets securely.</p>
            </div>

            {/* Search and Filter */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ticket ID or seller..."
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
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>

                    {/* Hide own */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hideOwn}
                            onChange={(e) => setHideOwn(e.target.checked)}
                            className="w-4 h-4 accent-accent-primary"
                        />
                        <span className="text-sm text-text-secondary">Hide my listings</span>
                    </label>
                </div>

                <div className="mt-3 text-sm text-text-secondary">
                    {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} available
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.length === 0 ? (
                    <p className="text-text-secondary col-span-full text-center py-10">
                        {listings.length === 0 
                            ? "No active listings found."
                            : "No listings match your search criteria."}
                    </p>
                ) : (
                    filteredListings.map((listing) => (
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
