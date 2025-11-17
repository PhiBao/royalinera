import { Signer } from "@linera/client";
/**
 * A signer implementation that holds the private key in memory.
 *
 * ⚠️ WARNING: This class is intended **only for testing or development** purposes.
 * It stores the private key directly in memory, which makes it unsuitable for
 * production environments due to security risks.
 *
 * The `PrivateKey` signer uses an in-memory `ethers.Wallet` to sign messages following
 * the EIP-191 scheme. It verifies that the provided owner matches the wallet
 * address before signing.
 *
 * Supports key creation from both a raw private key and a mnemonic phrase.
 */
export declare class PrivateKey implements Signer {
    private wallet;
    constructor(privateKeyHex: string);
    static fromMnemonic(mnemonic: string): PrivateKey;
    address(): string;
    sign(owner: string, value: Uint8Array): Promise<string>;
    getPublicKey(owner: string): Promise<string>;
    containsKey(owner: string): Promise<boolean>;
}
//# sourceMappingURL=private-key.d.ts.map