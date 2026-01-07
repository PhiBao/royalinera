import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Globe, Ticket, Calendar, Store, Sparkles } from 'lucide-react';

const styles = {
    hero: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        paddingTop: '60px',
        paddingBottom: '60px',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '50px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
        border: '1px solid rgba(99,102,241,0.2)',
        color: '#a78bfa',
        fontSize: '0.875rem',
        fontWeight: '600',
        marginBottom: '32px',
    },
    title: {
        fontSize: 'clamp(2.5rem, 6vw, 4rem)',
        fontWeight: '800',
        lineHeight: '1.1',
        background: 'linear-gradient(to right, #ffffff, #a0a0a0)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '24px',
        maxWidth: '800px',
    },
    subtitle: {
        fontSize: '1.25rem',
        color: '#a0a0a0',
        maxWidth: '600px',
        lineHeight: '1.6',
        marginBottom: '40px',
    },
    buttonGroup: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    btnPrimary: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 32px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        textDecoration: 'none',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: '#ffffff',
        border: 'none',
        transition: 'all 0.2s',
        boxShadow: '0 4px 24px rgba(99, 102, 241, 0.3)',
    },
    btnSecondary: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 32px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        textDecoration: 'none',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.2s',
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginTop: '80px',
        width: '100%',
    },
    featureCard: {
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '28px',
        textAlign: 'left',
        transition: 'all 0.3s ease',
    },
    featureIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    featureTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: '12px',
    },
    featureDesc: {
        color: '#a0a0a0',
        fontSize: '0.9375rem',
        lineHeight: '1.6',
    },
    statsSection: {
        marginTop: '80px',
        padding: '40px',
        backgroundColor: '#1e1e1e',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '32px',
        textAlign: 'center',
        width: '100%',
    },
    statValue: {
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px',
    },
    statLabel: {
        color: '#a0a0a0',
        fontSize: '0.9375rem',
    },
    ctaSection: {
        marginTop: '80px',
        textAlign: 'center',
        padding: '48px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
        borderRadius: '20px',
        border: '1px solid rgba(99,102,241,0.2)',
        width: '100%',
    },
    ctaTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '16px',
    },
    ctaDesc: {
        color: '#a0a0a0',
        fontSize: '1rem',
        marginBottom: '32px',
    },
};

const Home = () => {
    return (
        <div style={styles.hero}>
            {/* Badge */}
            <div style={styles.badge}>
                <Sparkles size={16} />
                Now Live on Conway Testnet
            </div>

            {/* Title */}
            <h1 style={styles.title}>
                The Future of Event Ticketing is Here
            </h1>

            {/* Subtitle */}
            <p style={styles.subtitle}>
                Experience fully decentralized, transparent, and instant ticketing.
                Built on the Linera Protocol for infinite scalability and micro-second latency.
            </p>

            {/* CTA Buttons */}
            <div style={styles.buttonGroup}>
                <Link to="/events" style={styles.btnPrimary}>
                    <Calendar size={20} />
                    Explore Events
                    <ArrowRight size={18} />
                </Link>
                <Link to="/marketplace" style={styles.btnSecondary}>
                    <Store size={20} />
                    View Marketplace
                </Link>
            </div>

            {/* Features Grid */}
            <div style={styles.featuresGrid}>
                <div style={styles.featureCard}>
                    <div style={{ ...styles.featureIcon, backgroundColor: 'rgba(250, 204, 21, 0.1)' }}>
                        <Zap size={28} style={{ color: '#facc15' }} />
                    </div>
                    <h3 style={styles.featureTitle}>Instant Finality</h3>
                    <p style={styles.featureDesc}>
                        Say goodbye to waiting. Transactions on Linera are confirmed in milliseconds, not minutes.
                    </p>
                </div>

                <div style={styles.featureCard}>
                    <div style={{ ...styles.featureIcon, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <Shield size={28} style={{ color: '#22c55e' }} />
                    </div>
                    <h3 style={styles.featureTitle}>Fraud Proof</h3>
                    <p style={styles.featureDesc}>
                        Every ticket is a unique digital asset secured by the blockchain. No more counterfeits.
                    </p>
                </div>

                <div style={styles.featureCard}>
                    <div style={{ ...styles.featureIcon, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        <Globe size={28} style={{ color: '#3b82f6' }} />
                    </div>
                    <h3 style={styles.featureTitle}>Global Marketplace</h3>
                    <p style={styles.featureDesc}>
                        Buy and sell tickets instantly on our decentralized secondary market with low fees.
                    </p>
                </div>
            </div>

            {/* Stats Section */}
            <div style={styles.statsSection}>
                <div>
                    <div style={styles.statValue}>~100ms</div>
                    <div style={styles.statLabel}>Transaction Finality</div>
                </div>
                <div>
                    <div style={styles.statValue}>∞</div>
                    <div style={styles.statLabel}>Scalability</div>
                </div>
                <div>
                    <div style={styles.statValue}>0%</div>
                    <div style={styles.statLabel}>Counterfeits</div>
                </div>
                <div>
                    <div style={styles.statValue}>1</div>
                    <div style={styles.statLabel}>Chain Per User</div>
                </div>
            </div>

            {/* CTA Section */}
            <div style={styles.ctaSection}>
                <h2 style={styles.ctaTitle}>Ready to Get Started?</h2>
                <p style={styles.ctaDesc}>
                    Connect your wallet and start minting or trading tickets in seconds.
                </p>
                <Link to="/mint" style={{ ...styles.btnPrimary, display: 'inline-flex' }}>
                    <Ticket size={20} />
                    Mint Your First Ticket
                </Link>
            </div>
        </div>
    );
};

export default Home;
