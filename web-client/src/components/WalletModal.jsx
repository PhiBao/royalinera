import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { 
    Wallet, 
    LogOut, 
    Copy, 
    Check, 
    ChevronDown, 
    Plus, 
    Key,
    AlertCircle,
    Loader2,
    ExternalLink
} from 'lucide-react';

const WalletModal = ({ isOpen, onClose }) => {
    const {
        isConnected,
        isConnecting,
        connectionError,
        owner,
        chainId,
        shortOwner,
        shortChainId,
        accounts,
        activeAccountIndex,
        connect,
        disconnect,
        addAccount,
        switchAccount,
        importWallet,
        exportMnemonic,
    } = useWallet();

    const [copied, setCopied] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [importMnemonic, setImportMnemonic] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [exportedMnemonic, setExportedMnemonic] = useState('');
    const [showAccounts, setShowAccounts] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleConnect = async () => {
        setError(null);
        try {
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

    const handleImport = async () => {
        if (!importMnemonic.trim()) return;
        setError(null);
        setLoading(true);
        try {
            await importWallet(importMnemonic.trim());
            setImportMnemonic('');
            setShowImport(false);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setError(null);
        try {
            const mnemonic = await exportMnemonic();
            setExportedMnemonic(mnemonic);
            setShowExport(true);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddAccount = async () => {
        setError(null);
        setLoading(true);
        try {
            await addAccount();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchAccount = async (index) => {
        setError(null);
        setLoading(true);
        try {
            await switchAccount(index);
            setShowAccounts(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                    }}
                    className="bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-bg-card border border-white/10 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-bg-card sticky top-0 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Wallet className="text-accent-primary" size={24} />
                                    {isConnected ? 'Wallet' : 'Connect Wallet'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-text-secondary hover:text-white transition-colors text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                    {/* Content */}
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {!isConnected ? (
                            // Not connected state
                            <div className="space-y-5">
                                {!showImport ? (
                                    <>
                                        <div className="text-center space-y-2 pb-2">
                                            <h3 className="text-lg font-bold">Welcome to Ticketh</h3>
                                            <p className="text-sm text-text-secondary">
                                                Get started by creating a new wallet or importing an existing one
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleConnect}
                                            disabled={isConnecting}
                                            className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={20} />
                                                    Creating Wallet...
                                                </>
                                            ) : (
                                                <>
                                                    <Wallet size={20} />
                                                    Create New Wallet
                                                </>
                                            )}
                                        </button>

                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                            <p className="text-xs text-blue-400 leading-relaxed">
                                                💡 A secure wallet will be created on your device. Make sure to backup your recovery phrase!
                                            </p>
                                        </div>

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-4 bg-bg-card text-text-secondary">or</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowImport(true)}
                                            className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                        >
                                            <Key size={18} />
                                            Import Existing Wallet
                                        </button>
                                    </>
                                ) : (
                                    // Import wallet view
                                    <div className="space-y-4">
                                        <label className="block">
                                            <span className="text-sm text-text-secondary mb-2 block">
                                                Enter your 12 or 24 word recovery phrase
                                            </span>
                                            <textarea
                                                value={importMnemonic}
                                                onChange={e => setImportMnemonic(e.target.value)}
                                                placeholder="word1 word2 word3..."
                                                className="w-full bg-bg-primary border border-white/10 rounded-lg p-3 text-sm font-mono resize-none h-24"
                                            />
                                        </label>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowImport(false);
                                                    setImportMnemonic('');
                                                }}
                                                className="flex-1 btn btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleImport}
                                                disabled={loading || !importMnemonic.trim()}
                                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : (
                                                    'Import'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Connected state
                            <div className="space-y-4">
                                {/* Account selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowAccounts(!showAccounts)}
                                        className="w-full p-4 bg-bg-primary border border-white/10 rounded-lg flex items-center justify-between hover:border-accent-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-purple-500 rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold">
                                                    {activeAccountIndex + 1}
                                                </span>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">Account {activeAccountIndex + 1}</p>
                                                <p className="text-sm text-text-secondary font-mono">
                                                    {shortOwner}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={`transition-transform ${showAccounts ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* Account dropdown */}
                                    <AnimatePresence>
                                        {showAccounts && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-white/10 rounded-lg overflow-hidden z-10"
                                            >
                                                {accounts.map((account, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleSwitchAccount(index)}
                                                        className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                                                            index === activeAccountIndex ? 'bg-accent-primary/10' : ''
                                                        }`}
                                                    >
                                                        <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-purple-500 rounded-full flex items-center justify-center text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div className="text-left flex-1">
                                                            <p className="text-sm font-medium">Account {index + 1}</p>
                                                            <p className="text-xs text-text-secondary font-mono">
                                                                {account.owner.slice(0, 8)}...
                                                            </p>
                                                        </div>
                                                        {index === activeAccountIndex && (
                                                            <Check size={16} className="text-accent-primary" />
                                                        )}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={handleAddAccount}
                                                    disabled={loading}
                                                    className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-t border-white/10 text-accent-primary"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <Plus size={16} />
                                                    )}
                                                    Add Account
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Wallet details */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                                        <span className="text-sm text-text-secondary">Owner</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm">{shortOwner}</span>
                                            <button
                                                onClick={() => copyToClipboard(owner, 'owner')}
                                                className="text-text-secondary hover:text-white transition-colors"
                                            >
                                                {copied === 'owner' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                                        <span className="text-sm text-text-secondary">Chain</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm">{shortChainId}</span>
                                            <button
                                                onClick={() => copyToClipboard(chainId, 'chain')}
                                                className="text-text-secondary hover:text-white transition-colors"
                                            >
                                                {copied === 'chain' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                                        <span className="text-sm text-text-secondary">Network</span>
                                        <span className="text-sm flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            Conway Testnet
                                        </span>
                                    </div>
                                </div>

                                {/* Export/Backup */}
                                {!showExport ? (
                                    <button
                                        onClick={handleExport}
                                        className="w-full btn btn-secondary text-sm flex items-center justify-center gap-2"
                                    >
                                        <Key size={16} />
                                        Backup Recovery Phrase
                                    </button>
                                ) : (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="text-xs text-yellow-500 mb-2 font-bold">
                                            ⚠️ Never share this phrase with anyone!
                                        </p>
                                        <div className="bg-bg-primary p-3 rounded font-mono text-sm break-all">
                                            {exportedMnemonic}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(exportedMnemonic, 'mnemonic')}
                                            className="mt-2 text-xs text-yellow-500 flex items-center gap-1"
                                        >
                                            {copied === 'mnemonic' ? <Check size={12} /> : <Copy size={12} />}
                                            {copied === 'mnemonic' ? 'Copied!' : 'Copy to clipboard'}
                                        </button>
                                    </div>
                                )}

                                {/* Disconnect */}
                                <button
                                    onClick={handleDisconnect}
                                    className="w-full btn btn-secondary text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Disconnect
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default WalletModal;
