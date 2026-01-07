import React from 'react';
import { useWallet } from '../providers/WalletProvider';
import { Wallet, Loader2, User, ChevronDown } from 'lucide-react';

const WalletButton = () => {
    const { isConnected, isConnecting, shortAddress, walletType, openWalletModal } = useWallet();

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
        return (
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
                    {walletType === 'metamask' ? (
                        <Wallet size={14} color="#fff" />
                    ) : (
                        <User size={14} color="#fff" />
                    )}
                </div>
                <span style={{ fontFamily: 'monospace' }}>{shortAddress}</span>
                <ChevronDown size={14} color="#9ca3af" />
            </button>
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
