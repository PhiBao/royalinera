import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';
import WalletButton from './WalletButton';
import { Ticket, ShoppingBag, PlusCircle, User, Menu, X, Calendar, Store, Tag } from 'lucide-react';

const Layout = ({ children }) => {
    const { isConnected } = useWallet();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const navLinks = [
        { path: '/events', label: 'Events', icon: Calendar },
        { path: '/mint', label: 'Mint', icon: PlusCircle },
        { path: '/marketplace', label: 'Marketplace', icon: Store },
        { path: '/my-tickets', label: 'My Tickets', icon: Ticket },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
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

            {/* Navbar */}
            <nav className="border-b border-white/5 bg-bg-secondary/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link 
                            to="/" 
                            className="flex items-center gap-2.5 group"
                        >
                            <div className="w-9 h-9 bg-gradient-to-br from-accent-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/25 group-hover:shadow-accent-primary/40 transition-shadow">
                                <Ticket className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">
                                Ticketh
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isActive(path) 
                                            ? 'bg-white/10 text-white' 
                                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <Icon size={16} />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Right Side */}
                        <div className="hidden md:flex items-center gap-3">
                            <WalletButton />
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-white/5 bg-bg-secondary/95 backdrop-blur-xl">
                        <div className="px-4 py-4 space-y-1">
                            {navLinks.map(({ path, label, icon: Icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                        ${isActive(path) 
                                            ? 'bg-accent-primary/20 text-accent-primary' 
                                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    {label}
                                </Link>
                            ))}
                            <div className="pt-3 border-t border-white/5 mt-3">
                                <WalletButton />
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-bg-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-purple-500 rounded-lg flex items-center justify-center">
                                <Ticket className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-white">Ticketh</span>
                        </div>
                        <p className="text-text-secondary text-sm">
                            © 2025 Ticketh. Built on Linera Protocol.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="#" className="text-text-secondary hover:text-white text-sm transition-colors">
                                Docs
                            </a>
                            <a href="#" className="text-text-secondary hover:text-white text-sm transition-colors">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
