import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useLinera } from '../contexts/LineraContext';
import { Ticket, ShoppingBag, PlusCircle, User, Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
    const { owner } = useLinera();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const isActive = (path) => location.pathname === path ? 'text-accent-primary' : 'text-text-secondary';

    return (
        <div className="min-h-screen flex flex-col">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e1e1e',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            <nav className="border-b border-white/10 bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <Link to="/" className="text-2xl font-bold text-gradient flex items-center gap-2">
                        <Ticket className="w-8 h-8 text-accent-primary" />
                        Ticketh
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/events" className={`hover:text-white transition-colors ${isActive('/events')}`}>Events</Link>
                        <Link to="/mint" className={`hover:text-white transition-colors ${isActive('/mint')}`}>Mint</Link>
                        <Link to="/marketplace" className={`hover:text-white transition-colors ${isActive('/marketplace')}`}>Marketplace</Link>
                        <Link to="/my-tickets" className={`hover:text-white transition-colors ${isActive('/my-tickets')}`}>My Tickets</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {owner && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-bg-card rounded-full border border-white/10">
                                <User size={16} className="text-accent-primary" />
                                <span className="text-sm font-mono text-text-secondary">
                                    {owner.slice(0, 6)}...{owner.slice(-4)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-text-primary"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-bg-secondary border-b border-white/10 p-4 flex flex-col gap-4">
                        <Link to="/events" onClick={() => setIsMenuOpen(false)}>Events</Link>
                        <Link to="/mint" onClick={() => setIsMenuOpen(false)}>Mint</Link>
                        <Link to="/marketplace" onClick={() => setIsMenuOpen(false)}>Marketplace</Link>
                        <Link to="/my-tickets" onClick={() => setIsMenuOpen(false)}>My Tickets</Link>
                    </div>
                )}
            </nav>

            <main className="flex-grow container py-8">
                {children}
            </main>

            <footer className="border-t border-white/10 py-8 mt-auto">
                <div className="container text-center text-text-secondary text-sm">
                    <p>© 2025 Ticketh. Built on Linera Protocol.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
