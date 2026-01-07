import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '../providers/WalletProvider';
import { 
    Wallet, 
    LogOut, 
    Copy, 
    Check, 
    User,
    AlertCircle,
    Loader2,
    X
} from 'lucide-react';

const WalletModalNew = ({ isOpen, onClose }) => {
    const {
        isConnected,
        isConnecting,
        connectionError,
        address,
        shortAddress,
        owner,
        walletType,
        connectMetaMask,
        connectDemo,
        disconnect,
        DEMO_ACCOUNTS,
    } = useWallet();

    const [copied, setCopied] = useState(null);
    const [error, setError] = useState(null);

    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleMetaMask = async () => {
        setError(null);
        try {
            await connectMetaMask();
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDemo = async (account) => {
        setError(null);
        try {
            await connectDemo(account);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDisconnect = async () => {
        await disconnect();
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(4px)',
                }}
            />
            
            {/* Modal */}
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: 0,
                    }}>
                        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#f3f4f6',
                            cursor: 'pointer',
                            color: '#6b7280',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Error message */}
                    {(error || connectionError) && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '12px 16px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}>
                            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>{error || connectionError}</p>
                        </div>
                    )}

                    {isConnected ? (
                        /* Connected State */
                        <div>
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '12px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Address</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#111827' }}>{shortAddress}</span>
                                        <button
                                            onClick={() => copyToClipboard(address, 'address')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            {copied === 'address' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#9ca3af' }} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Owner ID</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#111827' }}>
                                            {owner?.slice(0, 8)}...{owner?.slice(-6)}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(owner, 'owner')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            {copied === 'owner' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#9ca3af' }} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Type</span>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        padding: '4px 12px',
                                        backgroundColor: '#eef2ff',
                                        color: '#6366f1',
                                        borderRadius: '6px',
                                        textTransform: 'capitalize',
                                    }}>
                                        {walletType}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleDisconnect}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                }}
                            >
                                <LogOut size={18} />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        /* Disconnected State */
                        <div>
                            {isConnecting ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                                    <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ marginTop: '16px', color: '#6b7280' }}>Connecting...</span>
                                </div>
                            ) : (
                                <>
                                    {/* MetaMask option */}
                                    <button
                                        onClick={handleMetaMask}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '16px',
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            marginBottom: '12px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: '#fff7ed',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Wallet size={20} style={{ color: '#f97316' }} />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>MetaMask</div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>Connect your wallet</div>
                                        </div>
                                    </button>

                                    {/* Divider */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                        <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>or use demo</span>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                    </div>

                                    {/* Demo accounts */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {DEMO_ACCOUNTS.map((account) => (
                                            <button
                                                key={account.address}
                                                onClick={() => handleDemo(account)}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '14px 16px',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                            >
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    backgroundColor: '#eef2ff',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <User size={18} style={{ color: '#6366f1' }} />
                                                </div>
                                                <div style={{ textAlign: 'left', flex: 1 }}>
                                                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>{account.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                                                        {account.address.slice(0, 10)}...{account.address.slice(-6)}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Info */}
                                    <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '16px' }}>
                                        Demo accounts are for testing only.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* CSS for spin animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default WalletModalNew;
