import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '../contexts/WalletContext';
import {
    Wallet,
    LogOut,
    Copy,
    Check,
    Zap,
    AlertCircle,
    Loader2,
    X,
    Link as LinkIcon,
    ExternalLink
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
        connect,
        disconnect,
        hasFaucet,
    } = useWallet();

    const [copied, setCopied] = useState(null);
    const [error, setError] = useState(null);
    const [hasWallet, setHasWallet] = useState(null); // null = checking, true/false = result
    const [walletStatus, setWalletStatus] = useState('checking'); // 'checking', 'not-installed', 'metamask-ready', 'wrong-wallet'
    const [activeWalletName, setActiveWalletName] = useState(null); // Name of detected active wallet

    // Check if MetaMask is installed and is the default/active wallet
    const checkMetaMaskStatus = () => {
        if (!window.ethereum) {
            return { status: 'not-installed', walletName: null };
        }

        // Check which wallet is responding to window.ethereum
        // Order matters - check more specific wallets first
        if (window.ethereum.isRabby) {
            return { status: 'wrong-wallet', walletName: 'Rabby' };
        }
        if (window.ethereum.isCoinbaseWallet) {
            return { status: 'wrong-wallet', walletName: 'Coinbase Wallet' };
        }
        if (window.ethereum.isBraveWallet) {
            return { status: 'wrong-wallet', walletName: 'Brave Wallet' };
        }
        if (window.ethereum.isOkxWallet) {
            return { status: 'wrong-wallet', walletName: 'OKX Wallet' };
        }
        if (window.ethereum.isTrust) {
            return { status: 'wrong-wallet', walletName: 'Trust Wallet' };
        }
        
        // If isMetaMask is true and none of the above, it's actually MetaMask
        if (window.ethereum.isMetaMask) {
            return { status: 'metamask-ready', walletName: 'MetaMask' };
        }

        // Unknown wallet
        return { status: 'wrong-wallet', walletName: 'Unknown Wallet' };
    };

    // Simple wallet detection - check for MetaMask specifically
    useEffect(() => {
        if (isOpen) {
            const checkWallet = () => {
                console.log('[WalletModal] checkWallet called');
                console.log('[WalletModal] window.ethereum:', window.ethereum);

                if (typeof window === 'undefined') {
                    console.log('[WalletModal] window undefined, setting not-installed');
                    setWalletStatus('not-installed');
                    setHasWallet(false);
                    return;
                }

                const result = checkMetaMaskStatus();
                console.log('[WalletModal] MetaMask status:', result);
                
                setActiveWalletName(result.walletName);
                setWalletStatus(result.status);
                setHasWallet(result.status === 'metamask-ready');
            };

            // Check immediately
            checkWallet();

            // Listen for ethereum#initialized event
            const handleEthereumInit = () => {
                console.log('[WalletModal] ethereum#initialized fired, rechecking...');
                checkWallet();
            };
            window.addEventListener('ethereum#initialized', handleEthereumInit);

            // Check after delays for slow-loading extensions
            const timer1 = setTimeout(checkWallet, 500);
            const timer2 = setTimeout(checkWallet, 1500);

            // Poll for window.ethereum becoming available
            let pollCount = 0;
            const maxPolls = 10;
            const pollInterval = setInterval(() => {
                pollCount++;
                if (window.ethereum || pollCount >= maxPolls) {
                    checkWallet();
                    clearInterval(pollInterval);
                }
            }, 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearInterval(pollInterval);
                window.removeEventListener('ethereum#initialized', handleEthereumInit);
            };
        }
    }, [isOpen]);

    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleConnect = async () => {
        setError(null);
        try {
            // Double-check MetaMask is ready before connecting
            const result = checkMetaMaskStatus();
            if (result.status !== 'metamask-ready') {
                throw new Error(`MetaMask is required. Currently active wallet: ${result.walletName || 'None'}`);
            }
            await connect();
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
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#ffffff',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <Wallet size={20} style={{ color: '#6366f1' }} />
                        {isConnected ? 'Wallet Connected' : 'Connect to Linera'}
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
                            background: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            color: '#a0a0a0',
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
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}>
                            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '14px', color: '#ef4444' }}>{error || connectionError}</p>
                        </div>
                    )}

                    {isConnected ? (
                        /* Connected State */
                        <div>
                            {/* Connection indicator */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '16px',
                                padding: '8px 12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '8px',
                                width: 'fit-content',
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    boxShadow: '0 0 8px #10b981',
                                }} />
                                <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
                                    Connected to Conway Testnet
                                </span>
                            </div>

                            {/* Wallet info */}
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                marginBottom: '16px',
                            }}>
                                {/* Address */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Owner Address</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }}>{shortOwner}</span>
                                        <button
                                            onClick={() => copyToClipboard(owner, 'owner')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            {copied === 'owner' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#6b7280' }} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Chain ID */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Chain ID</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }}>{shortChainId}</span>
                                        <button
                                            onClick={() => copyToClipboard(chainId, 'chain')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            {copied === 'chain' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} style={{ color: '#6b7280' }} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Balance */}
                                {balance && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#a0a0a0' }}>Balance</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#10b981', fontWeight: '500' }}>{balance}</span>
                                    </div>
                                )}
                            </div>

                            {/* Info about direct blockchain connection */}
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '10px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                            }}>
                                <LinkIcon size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ margin: 0, fontSize: '12px', color: '#a0a0a0', lineHeight: '1.5' }}>
                                    Your wallet is connected directly to Linera validators. All transactions are signed and sent to the blockchain without proxies.
                                </p>
                            </div>

                            {/* Transaction History */}
                            <TransactionHistory />

                            <button
                                onClick={handleDisconnect}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
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
                            {hasWallet === null ? (
                                /* Checking for wallet */
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                                    <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ marginTop: '16px', color: '#a0a0a0', fontSize: '14px' }}>Checking for wallet...</span>
                                </div>
                            ) : hasWallet === false ? (
                                /* No wallet or wrong wallet installed */
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        margin: '0 auto 20px',
                                        borderRadius: '16px',
                                        backgroundColor: walletStatus === 'wrong-wallet' 
                                            ? 'rgba(245, 158, 11, 0.1)' 
                                            : 'rgba(99, 102, 241, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {walletStatus === 'wrong-wallet' ? (
                                            <AlertCircle size={32} style={{ color: '#f59e0b' }} />
                                        ) : (
                                            <Wallet size={32} style={{ color: '#6366f1' }} />
                                        )}
                                    </div>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '8px',
                                        marginTop: 0,
                                    }}>
                                        {walletStatus === 'wrong-wallet' 
                                            ? 'MetaMask Required' 
                                            : 'No Wallet Detected'}
                                    </h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#a0a0a0',
                                        marginBottom: '16px',
                                        lineHeight: '1.6',
                                    }}>
                                        {walletStatus === 'wrong-wallet' ? (
                                            <>
                                                <strong style={{ color: '#f59e0b' }}>{activeWalletName}</strong> is currently your default wallet, but RoyalInera requires <strong style={{ color: '#10b981' }}>MetaMask</strong>.
                                            </>
                                        ) : (
                                            'Install MetaMask to connect to RoyalInera.'
                                        )}
                                    </p>

                                    {walletStatus === 'wrong-wallet' && (
                                        <div style={{
                                            padding: '16px',
                                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: '12px',
                                            marginBottom: '16px',
                                            textAlign: 'left',
                                        }}>
                                            <h4 style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: '#f59e0b',
                                                marginBottom: '8px',
                                                marginTop: 0,
                                            }}>
                                                How to fix this:
                                            </h4>
                                            <ol style={{
                                                margin: 0,
                                                paddingLeft: '20px',
                                                color: '#a0a0a0',
                                                fontSize: '13px',
                                                lineHeight: '1.8',
                                            }}>
                                                <li>Install MetaMask if you haven't already</li>
                                                <li>Open {activeWalletName}'s settings</li>
                                                <li>Disable "{activeWalletName} as default wallet" option</li>
                                                <li>Refresh this page</li>
                                            </ol>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                        <a
                                            href="https://metamask.io/download/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                width: '100%',
                                                padding: '14px 20px',
                                                background: 'linear-gradient(135deg, #f6851b, #e2761b)',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <ExternalLink size={16} />
                                            {walletStatus === 'wrong-wallet' ? 'Get MetaMask' : 'Install MetaMask'}
                                        </a>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setHasWallet(null);
                                            setWalletStatus('checking');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'transparent',
                                            color: '#a0a0a0',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {walletStatus === 'wrong-wallet' 
                                            ? "I've set MetaMask as default, check again"
                                            : "I've installed MetaMask, check again"}
                                    </button>
                                </div>
                            ) : isConnecting ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                                    <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ marginTop: '16px', color: '#a0a0a0', fontSize: '14px' }}>Connecting via MetaMask...</span>
                                    <span style={{ marginTop: '8px', color: '#6b7280', fontSize: '12px' }}>Claiming chain from Conway faucet</span>
                                </div>
                            ) : (
                                <>
                                    {/* Description */}
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#a0a0a0',
                                        textAlign: 'center',
                                        marginBottom: '24px',
                                        lineHeight: '1.6',
                                    }}>
                                        Connect with MetaMask to mint, buy, and sell NFT tickets directly on the Linera blockchain.
                                    </p>

                                    {/* Connect button */}
                                    <button
                                        onClick={handleConnect}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            padding: '16px 20px',
                                            background: 'linear-gradient(135deg, #f6851b, #e2761b)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <Wallet size={20} />
                                        Connect with MetaMask
                                    </button>

                                    {/* Info about what happens */}
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <h4 style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            marginBottom: '12px',
                                            marginTop: 0,
                                        }}>
                                            What happens when you connect:
                                        </h4>
                                        <ul style={{
                                            margin: 0,
                                            paddingLeft: '20px',
                                            color: '#a0a0a0',
                                            fontSize: '13px',
                                            lineHeight: '1.8',
                                        }}>
                                            <li>MetaMask will prompt you to connect</li>
                                            <li>A Linera chain is claimed from the Conway testnet faucet</li>
                                            <li>You can mint tickets & interact with the marketplace</li>
                                        </ul>
                                    </div>

                                    {/* MetaMask only notice */}
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}>
                                        <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                            Only MetaMask is supported. Other wallets (Rabby, Coinbase, etc.) are not compatible.
                                        </span>
                                    </div>

                                    {/* Network badge */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        marginTop: '16px'
                                    }}>
                                        <div style={{
                                            fontSize: '11px',
                                            color: '#6b7280',
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <div style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: '#f59e0b',
                                            }} />
                                            Conway Testnet
                                        </div>
                                    </div>
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
