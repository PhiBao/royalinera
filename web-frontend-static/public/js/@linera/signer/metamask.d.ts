import { Signer } from "@linera/client";
import type { MetaMaskInpageProvider } from "@metamask/providers";
declare global {
    interface Window {
        ethereum?: MetaMaskInpageProvider;
    }
}
/**
 * A signer implementation that uses the MetaMask browser extension for signing.
 *
 * This class relies on the global `window.ethereum` object injected by MetaMask
 * and interacts with it using EIP-191-compliant requests. It provides a secure
 * mechanism for message signing through the user's MetaMask wallet.
 *
 * ⚠️ WARNING: This signer requires MetaMask to be installed and unlocked in the browser.
 * It will throw errors if MetaMask is unavailable, the user rejects a request, or
 * if the requested signer is not among the connected accounts.
 *
 * The `MetaMask` signer verifies that the connected account matches the specified
 * owner address before signing a message. All messages are encoded as hexadecimal
 * strings and signed using the `personal_sign` method.
 *
 * Suitable for production use where MetaMask is the expected signer interface.
 */
export declare class MetaMask implements Signer {
    private provider;
    constructor();
    sign(owner: string, value: Uint8Array): Promise<string>;
    containsKey(owner: string): Promise<boolean>;
    /**
     * Returns the currently connected MetaMask account address.
     */
    address(): Promise<string>;
}
//# sourceMappingURL=metamask.d.ts.map