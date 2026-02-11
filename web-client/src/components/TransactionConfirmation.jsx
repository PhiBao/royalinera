import React, { useState, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, Check, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * TransactionConfirmation — confirmation modal before blockchain mutations.
 *
 * Flow for MetaMask users:
 *   1. In-app confirmation modal (shows operation details)
 *   2. User clicks "Confirm" → MetaMask personal_sign popup (one signature)
 *   3. After MetaMask approval → mutation executes silently via autosigner
 *
 * Flow for local wallet users:
 *   1. In-app confirmation modal only (no external popup)
 */

const ConfirmContext = createContext(null);

export function useConfirmTransaction() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirmTransaction must be used within ConfirmProvider');
    return ctx;
}

// Request MetaMask to sign a human-readable message as proof of intent.
// Returns the signature or throws if user rejects.
async function requestMetaMaskSignature(operationName, variables) {
    if (!window.ethereum) return; // no MetaMask = skip (local wallet)

    const walletType = localStorage.getItem('linera_wallet_type');
    if (walletType !== 'metamask') return; // local wallet — skip

    const mmAddress = localStorage.getItem('linera_mm_address');
    if (!mmAddress) return;

    // Build a readable message
    const lines = [
        `Linera Transaction Approval`,
        ``,
        `Operation: ${operationName}`,
        `Network: Conway Testnet`,
        `Time: ${new Date().toISOString()}`,
    ];

    // Add relevant details
    const fieldLabels = {
        eventId: 'Event ID', ticketId: 'Ticket ID', name: 'Name',
        venue: 'Venue', seat: 'Seat', price: 'Price', salePrice: 'Sale Price',
        maxTickets: 'Max Tickets', owner: 'Owner', newOwner: 'Recipient',
        seller: 'Seller', buyerChain: 'Buyer Chain',
    };
    for (const [key, label] of Object.entries(fieldLabels)) {
        if (variables[key] != null && variables[key] !== '') {
            lines.push(`${label}: ${variables[key]}`);
        }
    }

    const message = lines.join('\n');

    // personal_sign with readable text — one MetaMask popup
    const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, mmAddress],
    });

    if (!signature) throw new Error('MetaMask signature rejected');
    return signature;
}

export function ConfirmProvider({ children }) {
    const [pending, setPending] = useState(null); // { details, resolve, reject }
    const [isSigning, setIsSigning] = useState(false);

    // Called by mutate() — returns a promise that resolves when user confirms
    const requestConfirmation = useCallback((details) => {
        return new Promise((resolve, reject) => {
            setPending({ details, resolve, reject });
        });
    }, []);

    // User clicked "Confirm" in the modal → trigger MetaMask sign → resolve
    const handleConfirm = useCallback(async () => {
        if (!pending) return;

        const info = parseMutationInfo(
            pending.details.mutation || '',
            pending.details.variables || {},
        );

        setIsSigning(true);
        try {
            await requestMetaMaskSignature(info.name, info.variables || {});
            pending.resolve(true);
            setPending(null);
        } catch (err) {
            // MetaMask rejected — treat as cancel
            pending.reject(new Error('Wallet signature rejected'));
            setPending(null);
        } finally {
            setIsSigning(false);
        }
    }, [pending]);

    const handleCancel = useCallback(() => {
        if (pending) {
            pending.reject(new Error('Transaction cancelled by user'));
            setPending(null);
        }
    }, [pending]);

    return (
        <ConfirmContext.Provider value={{ requestConfirmation }}>
            {children}
            {pending && (
                <ConfirmModal
                    details={pending.details}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isSigning={isSigning}
                />
            )}
        </ConfirmContext.Provider>
    );
}

// ── Parse mutation name + params for display ─────────────────────────
function parseMutationInfo(graphqlMutation, variables) {
    // Extract mutation name
    const nameMatch = graphqlMutation.match(/mutation\s+(\w+)/i);
    const mutName = nameMatch?.[1] || 'Transaction';

    // Human-friendly operation names
    const labels = {
        CreateEvent: 'Create Event',
        MintTicket: 'Mint Ticket',
        TransferTicket: 'Transfer Ticket',
        CreateListing: 'List for Sale',
        CancelListing: 'Cancel Listing',
        BuyListing: 'Buy Ticket',
    };

    return {
        name: labels[mutName] || mutName,
        rawName: mutName,
        variables,
    };
}

function ConfirmModal({ details, onConfirm, onCancel, isSigning }) {
    const { name, rawName, variables } = parseMutationInfo(
        details.mutation || '',
        details.variables || {},
    );

    const isMetaMask = localStorage.getItem('linera_wallet_type') === 'metamask';

    // Build display fields from variables
    const displayFields = [];
    if (variables.eventId) displayFields.push(['Event', variables.eventId]);
    if (variables.ticketId) displayFields.push(['Ticket', variables.ticketId]);
    if (variables.owner) displayFields.push(['Owner', truncate(variables.owner, 20)]);
    if (variables.newOwner) displayFields.push(['Recipient', truncate(variables.newOwner, 20)]);
    if (variables.seller) displayFields.push(['Seller', truncate(variables.seller, 20)]);
    if (variables.buyerChain) displayFields.push(['Buyer Chain', truncate(variables.buyerChain, 20)]);
    if (variables.price) displayFields.push(['Price', `${variables.price} tokens`]);
    if (variables.salePrice) displayFields.push(['Sale Price', `${variables.salePrice} tokens`]);
    if (variables.seat) displayFields.push(['Seat', variables.seat]);
    if (variables.name) displayFields.push(['Name', variables.name]);
    if (variables.venue) displayFields.push(['Venue', variables.venue]);
    if (variables.maxTickets) displayFields.push(['Max Tickets', variables.maxTickets]);

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1000000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            {/* Backdrop */}
            <div
                onClick={onCancel}
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
                    backgroundColor: '#1a1a2e',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={20} style={{ color: '#6366f1' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                            Confirm Transaction
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer', color: '#a0a0a0',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Operation badge */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        borderRadius: '20px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: '#6366f1',
                        }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#a5b4fc' }}>
                            {name}
                        </span>
                    </div>

                    {/* Details */}
                    {displayFields.length > 0 && (
                        <div style={{
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderRadius: '12px',
                            marginBottom: '20px',
                        }}>
                            {displayFields.map(([label, value], i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 0',
                                    borderBottom: i < displayFields.length - 1
                                        ? '1px solid rgba(255,255,255,0.05)'
                                        : 'none',
                                }}>
                                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{label}</span>
                                    <span style={{
                                        fontSize: '13px', color: '#fff', fontFamily: 'monospace',
                                        maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Network info */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            backgroundColor: '#10b981',
                        }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            Linera Conway Testnet
                        </span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onCancel}
                            disabled={isSigning}
                            style={{
                                flex: 1, padding: '12px',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                color: '#a0a0a0',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '14px', fontWeight: '500',
                                cursor: isSigning ? 'not-allowed' : 'pointer',
                                opacity: isSigning ? 0.5 : 1,
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isSigning}
                            style={{
                                flex: 1, padding: '12px',
                                background: isSigning
                                    ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '14px', fontWeight: '600',
                                cursor: isSigning ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {isSigning ? (
                                <>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Sign in Wallet
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    {isMetaMask ? 'Confirm & Sign' : 'Confirm'}
                                </>
                            )}
                        </button>
                    </div>

                    {/* MetaMask hint */}
                    {isMetaMask && !isSigning && (
                        <p style={{
                            margin: '12px 0 0', fontSize: '11px', color: '#6b7280',
                            textAlign: 'center',
                        }}>
                            You will be asked to sign in MetaMask after confirming
                        </p>
                    )}
                    {isSigning && (
                        <p style={{
                            margin: '12px 0 0', fontSize: '11px', color: '#a5b4fc',
                            textAlign: 'center',
                        }}>
                            Please approve the signature in your wallet...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

function truncate(s, len) {
    if (!s || s.length <= len) return s || '';
    return s.slice(0, len / 2) + '...' + s.slice(-len / 2);
}

export default ConfirmProvider;
