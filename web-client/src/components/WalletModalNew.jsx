import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '../contexts/WalletContext';
import {
    Wallet,
    LogOut,
    Copy,
    Check,
    AlertCircle,
    Loader2,
    X,
    Link as LinkIcon,
    Shield,
} from 'lucide-react';
import TransactionHistory from './TransactionHistory';

const WalletModalNew = ({ isOpen, onClose }) => {
    const {
        isConnected,
        isConnecting,
        connectionError,
        owner,
        shortOwner,
        chainId,
        shortChainId,
        balance,
        walletType,
        hasMetaMask,
        connect,
        disconnect,
    } = useWallet();

    const [copied, setCopied] = useState(null);
    const [error, setError] = useState(null);

    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleConnect = async (type) => {
        setError(null);
        try {
            await connect(type);
            onClose();
        } catch (err) {
            console.warn('[WalletModal] Connect failed:', err.message);
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
            top: 0, left: 0, right: 0, bottom: 0,
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
                    top: 0, left: 0, right: 0, bottom: 0,
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
                    maxWidth: '420px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <h2 style={{
                        fontSize: '18px', fontWeight: '600', color: '#ffffff',
                        margin: 0, display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                        <Wallet size={20} style={{ color: '#6366f1' }} />
                        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '8px', border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer', color: '#a0a0a0',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Error */}
                    {(error || connectionError) && (
                        <div style={{
                            marginBottom: '16px', padding: '12px 16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                        }}>
                            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '14px', color: '#ef4444' }}>{error || connectionError}</p>
                        </div>
                    )}

                    {isConnected ? (
                        /* ===================== CONNECTED ===================== */
                        <div>
                            {/* Connection indicator */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginBottom: '16px', padding: '8px 12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '8px', width: 'fit-content',
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981',
                                }} />
                                <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
                                    {walletType === 'metamask' ? 'MetaMask' : 'Local Wallet'} — Conway Testnet
                                </span>
                            </div>

                            {/* Wallet info */}
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px', marginBottom: '16px',
                            }}>
                                {/* Owner Address */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '13px', color: '#a0a0a0' }}>
                                        Owner Address
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }}>{shortOwner}</span>
                                        <button onClick={() => copyToClipboard(owner, 'owner')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            {copied === 'owner' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#6b7280' }} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Chain ID */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Chain ID</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }}>{shortChainId}</span>
                                        <button onClick={() => copyToClipboard(chainId, 'chain')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            {copied === 'chain' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#6b7280' }} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Balance */}
                                {balance && balance !== '0' && balance !== '0.0000' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Balance</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
                                            {isFinite(parseFloat(balance)) ? parseFloat(balance).toFixed(4) : '0.0000'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '10px', marginBottom: '16px',
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                            }}>
                                <LinkIcon size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ margin: 0, fontSize: '12px', color: '#a0a0a0', lineHeight: '1.5' }}>
                                    {walletType === 'metamask'
                                        ? 'MetaMask signs each transaction you initiate. Background chain operations are handled automatically.'
                                        : 'Transactions are signed locally and submitted directly to Linera validators.'}
                                </p>
                            </div>

                            <TransactionHistory />

                            <button onClick={handleDisconnect} style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '8px', padding: '12px 16px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px',
                                fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                            }}>
                                <LogOut size={18} />
                                Disconnect
                            </button>
                        </div>
                    ) : isConnecting ? (
                        /* ===================== CONNECTING ===================== */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                            <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                            <span style={{ marginTop: '16px', color: '#a0a0a0', fontSize: '14px' }}>
                                Claiming chain from faucet...
                            </span>
                            <span style={{ marginTop: '8px', color: '#6b7280', fontSize: '12px' }}>
                                This usually takes a few seconds
                            </span>
                        </div>
                    ) : (
                        /* ===================== DISCONNECTED ===================== */
                        <div>
                            <p style={{
                                fontSize: '14px', color: '#a0a0a0', textAlign: 'center',
                                marginBottom: '24px', lineHeight: '1.6',
                            }}>
                                Connect to the Linera Conway testnet to mint, buy, and sell NFT tickets on-chain.
                            </p>

                            {/* MetaMask button */}
                            {hasMetaMask && (
                                <button
                                    onClick={() => handleConnect('metamask')}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '12px', padding: '16px 20px',
                                        background: 'linear-gradient(135deg, #f6851b, #e2761b)',
                                        color: '#ffffff', border: 'none', borderRadius: '12px',
                                        fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                                        marginBottom: '12px',
                                    }}
                                >
                                    {/* Fox SVG icon */}
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21.3 2L13 8.2L14.5 4.6L21.3 2Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                                        <path d="M2.7 2L10.9 8.3L9.5 4.6L2.7 2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M18.4 16.8L16.2 20.2L20.8 21.5L22.2 16.9L18.4 16.8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M1.8 16.9L3.2 21.5L7.8 20.2L5.6 16.8L1.8 16.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M7.5 10.5L6.2 12.5L10.7 12.7L10.5 7.9L7.5 10.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M16.5 10.5L13.4 7.8L13.3 12.7L17.8 12.5L16.5 10.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M7.8 20.2L10.4 18.9L8.1 17L7.8 20.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                        <path d="M13.6 18.9L16.2 20.2L15.9 17L13.6 18.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
                                    </svg>
                                    Sign in with MetaMask
                                </button>
                            )}

                            {/* Divider */}
                            {hasMetaMask && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>or</span>
                                    <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                </div>
                            )}

                            {/* Local wallet button */}
                            <button
                                onClick={() => handleConnect('local')}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '10px', padding: '16px 20px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#ffffff', border: 'none', borderRadius: '12px',
                                    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                                    marginBottom: '16px',
                                }}
                            >
                                <Shield size={20} />
                                {hasMetaMask ? 'Generate Local Wallet' : 'Connect to Linera'}
                            </button>

                            {/* What happens */}
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <h4 style={{
                                    fontSize: '13px', fontWeight: '600', color: '#ffffff',
                                    marginBottom: '12px', marginTop: 0,
                                }}>
                                    What happens when you connect:
                                </h4>
                                <ul style={{
                                    margin: 0, paddingLeft: '20px',
                                    color: '#a0a0a0', fontSize: '13px', lineHeight: '1.8',
                                }}>
                                    {hasMetaMask && <li>MetaMask confirms each transaction you make</li>}
                                    <li>A microchain is claimed from the Conway testnet faucet</li>
                                    <li>All operations go directly to Linera validators</li>
                                    <li>Your session persists across page reloads</li>
                                </ul>
                            </div>

                            {/* Network badge */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                                <div style={{
                                    fontSize: '11px', color: '#6b7280',
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '20px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <div style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: '#10b981',
                                    }} />
                                    Conway Testnet
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
