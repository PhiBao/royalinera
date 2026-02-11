import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Wallet, Loader2, User, ChevronDown, Coins } from 'lucide-react';

const WalletButton = () => {
    const { isConnected, isConnecting, shortOwner, shortAddress, balance, openWalletModal } = useWallet();

    // Use shortOwner from WalletContext (shortAddress is alias for compatibility)
    const displayAddress = shortOwner || shortAddress;

    // Format balance for display (truncate long decimals)
    const formatBalance = (bal) => {
        if (!bal) return null;
        const num = parseFloat(bal);
        if (!isFinite(num) || isNaN(num)) return null;
        if (num === 0) return null;
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toFixed(4);
    };

    const baseStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: 'none',
    };

    if (isConnecting) {
        return (
            <button
                disabled
                style={{
                    ...baseStyle,
                    padding: '10px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#9ca3af',
                }}
            >
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Connecting...</span>
            </button>
        );
    }

    if (isConnected) {
        const formattedBalance = formatBalance(balance);

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Balance Display */}
                {formattedBalance && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '10px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '600',
                        }}
                    >
                        <Coins size={14} />
                        <span style={{ fontFamily: 'monospace' }}>{formattedBalance}</span>
                    </div>
                )}

                {/* Wallet Button */}
                <button
                    onClick={openWalletModal}
                    style={{
                        ...baseStyle,
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                    }}
                >
                    <div style={{
                        width: '28px',
                        height: '28px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Wallet size={14} color="#fff" />
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>{displayAddress}</span>
                    <ChevronDown size={14} color="#9ca3af" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={openWalletModal}
            style={{
                ...baseStyle,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
        >
            <Wallet size={18} />
            <span>Connect Wallet</span>
        </button>
    );
};

export default WalletButton;
